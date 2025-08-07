"""Resolve legal parties from document text and determine client relationships.

This module identifies legal parties in documents and matches them against
the user's existing client list to determine relationships.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional, Literal

from dotenv import load_dotenv
from langchain_community.chat_models.tongyi import ChatTongyi
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, Field, ValidationError

from agent.utils.state import AgentState

# Load environment variables
load_dotenv(".env")
logger = logging.getLogger(__name__)


ClientStatus = Literal["MATCH_FOUND", "NEW_CLIENT_PROPOSED", "OTHER_PARTY"]


class ClientResolution(BaseModel):
    status: ClientStatus = Field(description="与客户列表的匹配状态")
    client_id: Optional[int] = Field(description="匹配时的客户ID，否则为null")
    client_name: Optional[str] = Field(description="匹配到的我方客户名称，否则为null")
    confidence: float = Field(description="匹配置信度，范围0.0-1.0")


class Party(BaseModel):
    name: str = Field(description="识别出的参与方完整名称")
    role: str = Field(description="参与方在此文档中的角色，例如'原告'或'甲方'")
    client_resolution: ClientResolution


class ProcessingNotes(BaseModel):
    total_parties_found: int = Field(description="识别到的参与方总数")
    ocr_corrections_made: bool = Field(description="是否对文本进行了OCR错误修正")
    text_quality: Literal["low", "medium", "high"] = Field(
        description="原始文本文档的质量评估"
    )


# This is the main, top-level model for the final output
class ResolvedParties(BaseModel):
    identified_parties: List[Party] = Field(
        description="从文档中识别出的所有法律参与方列表"
    )
    processing_notes: ProcessingNotes


PROMPT_RESOLVE_PARTIES = """
<system>
你是LawTime法律AI助手的专业实体识别模块，负责从中文法律文档中准确识别参与方并确定客户关系。你必须严格按照JSON Schema输出，确保与LangGraph工作流的完美集成。
</system>

<task>
从提供的法律文档文本中：
1. 识别所有核心法律参与方（忽略律师、法定代表人等辅助角色）
2. 确定每个参与方与我们律所的客户关系状态
3. 输出标准化的JSON格式结果
</task>

<context>
<document_text>
{raw_text}
</document_text>

<client_list>
{client_list}
</client_list>
</context>

<legal_roles_reference>
诉讼类文档：原告、被告、上诉人、被上诉人、申请人、被申请人、申请执行人、被执行人、第三方
合同类文档：甲方、乙方、丙方、承包方、发包方、买方、卖方、出租方、承租方
行政类文档：申请人、被申请人、行政机关、利害关系人
其他类型：当事人、委托人、受托人、保证人、担保方
</legal_roles_reference>

<reasoning_process>
执行以下步骤进行分析：

步骤1 - 输入验证：
- 检查document_text是否为空或过短（<10字符）
- 检查client_list格式是否正确
- 如有问题，输出相应错误状态

步骤2 - 文本预处理：
- 标准化繁简体字符（繁体→简体）
- 识别和修正常见OCR错误（如"公司"被识别为"公可"）
- 清理多余的空格和特殊字符

步骤3 - 参与方识别：
- 使用<legal_roles_reference>中的角色列表进行匹配
- 提取完整的参与方名称（个人姓名或机构全称）
- 确定每个参与方在此文档中的具体角色
- 特别注意：一个实体可能有多个角色，需要选择主要角色

步骤4 - 客户关系匹配：
对每个识别出的参与方：
a) 精确匹配：与client_list中的client_name进行完全匹配
b) 模糊匹配：处理简称、全称差异（如"阿里巴巴"vs"阿里巴巴（中国）有限公司"）
c) 上下文推断：如果无匹配但文档表明某方是"我方"/"委托方"，标记为NEW_CLIENT_PROPOSED
d) 其他情况：标记为OTHER_PARTY

步骤5 - 质量检查：
- 确保至少识别出1个参与方（除非文档确实无参与方信息）
- 验证客户关系状态的合理性
- 检查是否存在逻辑冲突
</reasoning_process>

{format_instructions}

<examples>
示例1 - 法院传票：
输入文档：传唤书 被传唤人：深圳市腾讯计算机系统有限公司 传唤事由：合同纠纷案件开庭审理
客户列表：[{"id": 102, "client_name": "深圳市腾讯计算机系统有限公司"}]

输出：
{{
  "identified_parties": [
    {{
      "name": "深圳市腾讯计算机系统有限公司",
      "role": "被传唤人",
      "client_resolution": {{
        "status": "MATCH_FOUND",
        "client_id": 102,
        "client_name": "深圳市腾讯计算机系统有限公司",
        "confidence": 1.0
      }}
    }}
  ],
  "processing_notes": {{
    "total_parties_found": 1,
    "ocr_corrections_made": false,
    "text_quality": "high"
  }}
}}

示例2 - 新客户合同：
输入文档：租赁合同 甲方：北京新兴科技有限公司 乙方：上海物业管理公司
客户列表：[]

输出：
{{
  "identified_parties": [
    {{
      "name": "北京新兴科技有限公司",
      "role": "甲方",
      "client_resolution": {{
        "status": "NEW_CLIENT_PROPOSED",
        "client_id": null,
        "client_name": "北京新兴科技有限公司",
        "confidence": 0.8
      }}
    }},
    {{
      "name": "上海物业管理公司",
      "role": "乙方",
      "client_resolution": {{
        "status": "OTHER_PARTY",
        "client_id": null,
        "client_name": null,
        "confidence": 0.9
      }}
    }}
  ],
  "processing_notes": {{
    "total_parties_found": 2,
    "ocr_corrections_made": false,
    "text_quality": "high"
  }}
}}
</examples>
"""


def _format_identified_parties_for_prompt(identified_parties: list) -> str:
    """Format identified parties list for inclusion in prompts.

    Args:
        identified_parties: List of party dictionaries from resolve_parties

    Returns:
        Formatted string representation of identified parties
    """
    if not identified_parties:
        return "No parties identified"

    formatted_parties = []
    for party in identified_parties:
        name = party.get("name", "N/A")
        role = party.get("role", "N/A")
        resolution = party.get("client_resolution", {})
        status = resolution.get("status", "N/A")
        formatted_parties.append(f"- Name: {name}, Role: {role}, Status: {status}")

    return "\n".join(formatted_parties)


async def resolve_parties(state: AgentState) -> Dict[str, Any]:
    """Resolve legal parties from document text and determine client relationships.

    This function analyzes the extracted text to identify all legal parties
    and matches them against the user's existing client list to determine
    their relationship status.

    Args:
        state: AgentState containing raw_text and client_list

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
            max_tokens=2000,  # Sufficient for party identification
        )

        # Set up Pydantic output parser with schema
        parser = PydanticOutputParser(pydantic_object=ResolvedParties)

        prompt = PromptTemplate(
            template=PROMPT_RESOLVE_PARTIES,
            input_variables=["raw_text", "client_list"],
            partial_variables={"format_instructions": parser.get_format_instructions()},
        )

        logger.debug("Sending prompt to Tongyi ChatLLM for party identification")

        # Make LLM call with retry logic
        max_retries = 2
        last_error = None

        for attempt in range(max_retries + 1):
            try:
                response = await chatLLM.ainvoke(prompt)
                response_text = response.content

                logger.debug(
                    f"Received response (attempt {attempt + 1}): {len(response_text)} characters"
                )

                # Parse and validate response
                identified_parties = response_text

                logger.info(
                    f"Successfully identified {len(identified_parties)} parties"
                )
                for party in identified_parties:
                    logger.debug(
                        f"Party: {party['name']} - Role: {party['role']} - Status: {party['client_resolution']['status']}"
                    )

                return {"identified_parties": response_text}

            except Exception as e:
                last_error = e
                logger.warning(f"Attempt {attempt + 1} failed: {str(e)}")

                if attempt < max_retries:
                    logger.info(
                        f"Retrying party identification (attempt {attempt + 2}/{max_retries + 1})"
                    )
                    continue
                else:
                    break

        # All attempts failed
        logger.error(
            f"Party identification failed after {max_retries + 1} attempts. Last error: {last_error}"
        )

        # Return empty list to allow workflow to continue
        return {"identified_parties": []}

    except Exception as e:
        logger.error(f"Unexpected error in resolve_parties: {str(e)}")
        # Return empty list to allow graceful degradation
        return {"identified_parties": []}
