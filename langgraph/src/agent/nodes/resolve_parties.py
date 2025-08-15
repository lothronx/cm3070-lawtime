"""Resolve legal parties from document text and determine client relationships.

This module identifies legal parties in documents and matches them against
the user's existing client list to determine relationships.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Literal
from langchain_community.chat_models.tongyi import ChatTongyi
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import PromptTemplate
from langgraph.runtime import Runtime
from pydantic import BaseModel, Field
from agent.utils.state import AgentState

logger = logging.getLogger(__name__)


class Context:
    """Context parameters for the agent."""

    pass


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
对每个识别出的参与方，必须严格按照以下优先级顺序来确定其客户关系：

a) **最高优先级：匹配客户列表 (Client List Match)**
   - **精确匹配：** 首先，将参与方名称与 `client_list` 中的 `client_name` 进行严格的全名比对。
   - **模糊匹配：** 若无精确匹配，则尝试处理简称、别称或部分名称的匹配（例如，“阿里巴巴” vs “阿里巴巴（中国）有限公司”）。
   - **判定：** 一旦在此步骤匹配成功，立即将该参与方的 `status` 设为 `MATCH_FOUND`，并停止对该参与方的后续判断。

b) **第二优先级：上下文线索推断 (Contextual Inference)**
   - **条件：** 仅当一个参与方在步骤 a) 中未能匹配成功时，才执行此步骤。
   - **规则：** 在文档上下文中寻找明确指向该参与方为我方的词语，如“我方”、“我司”、“委托方”、“本公司”等。
   - **判定：** 如果找到强关联线索，则将该参与方的 `status` 设为 `NEW_CLIENT_PROPOSED`。

c) **最终优先级：默认规则 (Default Rule)**
   - **触发条件：** 仅当分析完**所有**参与方后，通过上述 a) 和 b) 两种方法**都未能识别出任何一个客户**时，才启用此规则。
   - **单一参与方情况：** 如果文档中只识别出**唯一**一个参与方，则默认该参与方为我方客户。将其 `status` 设为 `NEW_CLIENT_PROPOSED`，并设定一个合理的 `confidence` 值，以表明这是基于假设的推断。
   - **多参与方情况：** 如果文档中有多个参与方，则将最符合客户角色的实体（例如，合同中的“甲方”、诉讼中的“原告”或“上诉人”）标记为 `NEW_CLIENT_PROPOSED`，并赋予较低的 `confidence`。

d) **默认情况：其他方 (Other Party)**
   - 任何未通过以上 a), b), c) 规则被识别为我方客户的参与方，其 `status` 必须设为 `OTHER_PARTY`。

步骤5 - 质量检查：
- 确保至少识别出1个参与方（除非文档确实无参与方信息）
- 验证客户关系状态的合理性
- 检查是否存在逻辑冲突
</reasoning_process>

{format_instructions}

<examples>
示例1 - 法院传票：
输入文档：传唤书 被传唤人：深圳市腾讯计算机系统有限公司 传唤事由：合同纠纷案件开庭审理
客户列表：[{{"id": 102, "client_name": "深圳市腾讯计算机系统有限公司"}}]

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


async def resolve_parties(state: AgentState, runtime: Runtime[Context]) -> Dict[str, Any]:
    """Resolve legal parties from document text and determine client relationships.

    This function analyzes the extracted text to identify all legal parties
    and matches them against the user's existing client list to determine
    their relationship status.

    Args:
        state: AgentState containing raw_text and client_list

    Returns:
        A dictionary with the key 'identified_parties' containing a JSON string
        that represents a list of identified parties and their client relationships.
    """
    try:
        raw_text = state.get("raw_text", "")
        client_list_formatted = state.get(
            "client_list_formatted", "No existing clients"
        )

        logger.info("Starting party identification and resolution")

        # Handle empty text gracefully
        if not raw_text or not raw_text.strip():
            logger.warning("No text available for party identification")
            return {"identified_parties": "[]"}

        # Create LLM instance
        chat_llm = ChatTongyi(
            model="qwen3-30b-a3b-instruct-2507",
            api_key=state.get("dashscope_api_key"),
            temperature=0,
        )
        logger.info("ChatTongyi LLM instance created successfully")

        # Set up Pydantic output parser with schema
        parser = PydanticOutputParser(pydantic_object=ResolvedParties)
        logger.info("Pydantic output parser initialized with ResolvedParties schema")

        # Create and format prompt with input variables
        prompt = PromptTemplate(
            template=PROMPT_RESOLVE_PARTIES,
            input_variables=["raw_text", "client_list"],
            partial_variables={"format_instructions": parser.get_format_instructions()},
        ).format(
            raw_text=raw_text,
            client_list=client_list_formatted,
        )
        logger.debug("Sending prompt to Tongyi ChatLLM for party identification")

        # Make LLM call with retry logic
        max_retries = 2
        last_error = None

        for attempt in range(max_retries + 1):
            try:
                # Wrap potentially blocking LLM call in asyncio.to_thread
                response = await asyncio.to_thread(chat_llm.invoke, prompt)
                response_text = response.content

                logger.info(f"Raw response text received from LLM: {response_text}")

                # Wrap JSON parsing in asyncio.to_thread to avoid blocking
                parsed_result = await asyncio.to_thread(parser.parse, response_text)
                identified_parties = parsed_result.identified_parties

                # Convert parsed parties to dict format for state storage
                parties_for_state = []
                for party in identified_parties:
                    party_dict = {
                        "name": party.name,
                        "role": party.role,
                        "client_resolution": {
                            "status": party.client_resolution.status,
                            "client_id": party.client_resolution.client_id,
                            "client_name": party.client_resolution.client_name,
                            "confidence": party.client_resolution.confidence,
                        },
                    }
                    parties_for_state.append(party_dict)

                # Store as JSON string in state for later nodes to use
                identified_parties_string = await asyncio.to_thread(
                    json.dumps, parties_for_state, ensure_ascii=False, indent=2
                )

                logger.info(
                    f"Successfully processed and stored identified parties in state: {identified_parties_string}"
                )

                return {"identified_parties": identified_parties_string}

            except Exception as e:
                last_error = e
                logger.warning("Attempt %d failed: %s", attempt + 1, str(e))

                if attempt < max_retries:
                    logger.info(
                        "Retrying party identification (attempt %d/%d)",
                        attempt + 2,
                        max_retries + 1,
                    )
                    continue

                break

        # All attempts failed
        logger.error(
            "Party identification failed after %d attempts. Last error: %s",
            max_retries + 1,
            last_error,
        )

        # Return empty JSON string to allow workflow to continue
        return {"identified_parties": "[]"}

    except Exception as e:
        logger.error("Unexpected error in resolve_parties: %s", str(e))
        # Return empty JSON string to allow graceful degradation
        return {"identified_parties": "[]"}
