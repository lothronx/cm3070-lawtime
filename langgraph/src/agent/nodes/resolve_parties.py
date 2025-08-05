"""Resolve legal parties from document text and determine client relationships.

This module identifies legal parties in documents and matches them against
the user's existing client list to determine relationships.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from langchain_community.chat_models.tongyi import ChatTongyi
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate
from langgraph.runtime import Runtime
from pydantic import BaseModel, Field, ValidationError

from agent.utils.state import AgentState

# Load environment variables
load_dotenv(".env")

logger = logging.getLogger(__name__)


class Context:
    """Context parameters for the agent."""
    pass


class PartyResolution(BaseModel):
    """Schema for party resolution output."""
    status: str = Field(..., description="MATCH_FOUND, NEW_CLIENT_PROPOSED, or OTHER_PARTY")
    client_id: Optional[int] = Field(None, description="Client ID if match found")
    client_name: Optional[str] = Field(None, description="Client name")


class IdentifiedParty(BaseModel):
    """Schema for identified party."""
    name: str = Field(..., description="Full party name")
    role: str = Field(..., description="Party role in the document")
    client_resolution: PartyResolution = Field(..., description="Client relationship status")


class PartiesOutput(BaseModel):
    """Schema for the complete parties output."""
    parties: List[IdentifiedParty] = Field(..., description="List of identified parties")


def _create_parties_prompt() -> PromptTemplate:
    """Create the prompt template for party identification and resolution.
    
    Returns:
        PromptTemplate configured for party identification with JSON schema.
    """
    template = """
    你是一个专业的法律文件分析AI。请从提供的法律文件文本中识别所有相关的法律参与方，并根据现有客户列表确定其客户关系状态。

    法律文件文本：
    {raw_text}

    现有客户列表：
    {client_list}

    请按照以下步骤进行分析：

    1. **识别所有法律参与方**：
    - 仔细阅读文档，识别所有参与方（原告、被告、上诉人、被上诉人、申请人、被申请人、当事人等）
    - 提取完整的参与方名称（个人姓名、公司名称等）
    - 确定每个参与方在此法律文件中的具体角色

    2. **客户关系匹配**：
    - 将识别出的参与方与现有客户列表进行匹配
    - 匹配规则：名称完全匹配或高度相似
    - 确定每个参与方的客户状态：
        * MATCH_FOUND: 在现有客户列表中找到匹配
        * NEW_CLIENT_PROPOSED: 未在客户列表中找到，建议作为新客户
        * OTHER_PARTY: 对方当事人或其他相关方

    3. **输出格式**：
    请以JSON格式输出，包含所有识别的参与方信息。

    注意事项：
    - 仔细区分不同的参与方，避免重复
    - 准确提取参与方的完整名称
    - 正确判断参与方在案件中的角色
    - 准确匹配现有客户列表

    {format_instructions}
    """

    return PromptTemplate(
        template=template,
        input_variables=["raw_text", "client_list", "format_instructions"]
    )


def _format_client_list_for_prompt(client_list: List[dict]) -> str:
    """Format client list for inclusion in the prompt.
    
    Args:
        client_list: List of client dictionaries
        
    Returns:
        Formatted string representation of client list
    """
    if not client_list:
        return "无现有客户"
    
    formatted_clients = []
    for client in client_list:
        client_id = client.get("id", "N/A")
        client_name = client.get("client_name", "N/A")
        formatted_clients.append(f"- ID: {client_id}, 名称: {client_name}")
    
    return "\n".join(formatted_clients)


def _parse_parties_response(response_text: str) -> List[dict]:
    """Parse the LLM response and extract parties information.
    
    Args:
        response_text: Raw response text from LLM
        
    Returns:
        List of party dictionaries with resolved client relationships
        
    Raises:
        ValueError: If response cannot be parsed or validated
    """
    try:
        # Clean the response text by removing markdown code blocks
        cleaned_text = response_text.strip()
        
        # Remove markdown code fences if present
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:]  # Remove ```json
        elif cleaned_text.startswith("```"):
            cleaned_text = cleaned_text[3:]   # Remove ```
            
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3]  # Remove trailing ```
            
        cleaned_text = cleaned_text.strip()
        
        # Parse the cleaned JSON
        response_data = json.loads(cleaned_text)
        
        # Validate against Pydantic schema
        parties_output = PartiesOutput(**response_data)
        
        # Convert to the expected format for AgentState
        identified_parties = []
        for party in parties_output.parties:
            party_dict = {
                "name": party.name,
                "role": party.role,
                "client_resolution": {
                    "status": party.client_resolution.status,
                    "client_id": party.client_resolution.client_id,
                    "client_name": party.client_resolution.client_name
                }
            }
            identified_parties.append(party_dict)
        
        return identified_parties
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response: {e}")
        logger.debug(f"Raw response: {response_text}")
        raise ValueError(f"Invalid JSON response from LLM: {e}")
        
    except ValidationError as e:
        logger.error(f"Response validation failed: {e}")
        logger.debug(f"Raw response: {response_text}")
        raise ValueError(f"Response does not match expected schema: {e}")
        
    except Exception as e:
        logger.error(f"Unexpected error parsing parties response: {e}")
        raise ValueError(f"Failed to parse parties response: {e}")


async def resolve_parties(
    state: AgentState, runtime: Runtime[Context]
) -> Dict[str, Any]:
    """Resolve legal parties from document text and determine client relationships.
    
    This function analyzes the extracted text to identify all legal parties
    and matches them against the user's existing client list to determine
    their relationship status.
    
    Args:
        state: AgentState containing raw_text and client_list
        runtime: LangGraph runtime context
        
    Returns:
        Dict containing "identified_parties" with resolved party information
    """
    try:
        raw_text = state.get("raw_text", "")
        client_list = state.get("client_list", [])
        
        logger.info("Starting party identification and resolution")
        logger.debug(f"Text length: {len(raw_text)} characters")
        logger.debug(f"Client list size: {len(client_list)} clients")
        
        # Handle empty text gracefully
        if not raw_text or not raw_text.strip():
            logger.warning("No text available for party identification")
            return {"identified_parties": []}
        
        # Initialize Tongyi ChatLLM
        dashscope_api_key = os.getenv("DASHSCOPE_API_KEY")
        if not dashscope_api_key:
            logger.error("DASHSCOPE_API_KEY not found in environment variables")
            return {"identified_parties": []}
        
        # Create LLM instance
        chatLLM = ChatTongyi(
            model="qwen3-30b-a3b-instruct-2507",
            api_key=dashscope_api_key,
            temperature=0,  # Deterministic output for consistency
            max_tokens=2000  # Sufficient for party identification
        )
        
        # Set up JSON output parser with schema
        parser = JsonOutputParser(pydantic_object=PartiesOutput)
        format_instructions = parser.get_format_instructions()
        
        # Create and format prompt
        prompt_template = _create_parties_prompt()
        formatted_client_list = _format_client_list_for_prompt(client_list)
        
        formatted_prompt = prompt_template.format(
            raw_text=raw_text,
            client_list=formatted_client_list,
            format_instructions=format_instructions
        )
        
        logger.debug("Sending prompt to Tongyi ChatLLM for party identification")
        
        # Make LLM call with retry logic
        max_retries = 2
        last_error = None
        
        for attempt in range(max_retries + 1):
            try:
                response = await chatLLM.ainvoke(formatted_prompt)
                response_text = response.content
                
                logger.debug(f"Received response (attempt {attempt + 1}): {len(response_text)} characters")
                
                # Parse and validate response
                identified_parties = _parse_parties_response(response_text)
                
                logger.info(f"Successfully identified {len(identified_parties)} parties")
                for party in identified_parties:
                    logger.debug(f"Party: {party['name']} - Role: {party['role']} - Status: {party['client_resolution']['status']}")
                
                return {"identified_parties": identified_parties}
                
            except Exception as e:
                last_error = e
                logger.warning(f"Attempt {attempt + 1} failed: {str(e)}")
                
                if attempt < max_retries:
                    logger.info(f"Retrying party identification (attempt {attempt + 2}/{max_retries + 1})")
                    continue
                else:
                    break
        
        # All attempts failed
        logger.error(f"Party identification failed after {max_retries + 1} attempts. Last error: {last_error}")
        
        # Return empty list to allow workflow to continue
        return {"identified_parties": []}
        
    except Exception as e:
        logger.error(f"Unexpected error in resolve_parties: {str(e)}")
        # Return empty list to allow graceful degradation
        return {"identified_parties": []}