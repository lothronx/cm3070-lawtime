"""Extract contract renewal dates and related tasks."""

import asyncio
import logging
from typing import Any, Dict, List, Optional, Literal

from pydantic import BaseModel, Field
from langchain_community.chat_models.tongyi import ChatTongyi
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langgraph.runtime import Runtime

from agent.utils.state import AgentState

logger = logging.getLogger(__name__)


class Context:
    """Context parameters for the agent."""

    pass


class ContractEvent(BaseModel):
    event_type: Literal["contract_renewal"] = Field(
        default="contract_renewal",
        description="时间类型，固定为 'contract_renewal'.",
    )
    raw_title: str = Field(
        description="构建的合同到期标题, e.g., '阿里巴巴法律顾问合同到期'，不超过12个汉字"
    )
    raw_date_time: Optional[str] = Field(
        description="任务的绝对ISO日期时间字符串（格式：YYYY-MM-DDTHH:MM:SS+08:00），如果没有时间则为null"
    )
    raw_location: None = Field(default=None, description="地点信息，固定为null")
    related_party_name: Optional[str] = Field(description="关联的我方客户标准名称")
    note: str = Field(
        description="合同概述信息, e.g., '{{甲方}}与{{乙方}}签订的{{合同类型}}'"
    )
    confidence: float = Field(
        description="提取结果的置信度, 范围 0.0-1.0", ge=0.0, le=1.0
    )


class ProcessingNotes(BaseModel):
    # Success fields
    contract_type: Optional[str] = Field(description="从文档中识别出的具体合同类型")
    expiry_date_source: Optional[str] = Field(
        description="到期日期信息的文本来源, e.g., '协议有效期条款'"
    )
    parties_identified: Optional[List[str]] = Field(
        description="合同中识别出的所有当事方名称列表"
    )
    extraction_completeness: Literal["high", "medium", "low", "none"] = Field(
        description="信息提取的完整度评估"
    )

    # Error fields
    error: Optional[str] = Field(
        default=None, description="如果验证失败，则显示错误代码"
    )
    potential_issues: Optional[List[str]] = Field(
        default=None, description="描述验证失败的具体原因"
    )


class ContractRenewalOutput(BaseModel):
    validation_passed: bool = Field(description="是否成功验证并提取了合同续约信息")
    extracted_events: List[ContractEvent] = Field(
        description="提取出的合同到期事件列表。如果validation_passed为false，此列表必须为空。"
    )
    processing_notes: ProcessingNotes


PROMPT_EXTRACT_CONTRACT_RENEWAL = """
<system>
你是LawTime法律AI助手的专业合同信息提取模块，专门从中文合同协议文档中精确提取有效期和续约相关信息。你必须严格验证合同有效性，确保输出格式与LangGraph工作流完全兼容。

重要：你必须将所有提取的日期转换为绝对的ISO日期时间字符串格式。
</system>

<task>
分析合同协议文档，验证其包含有效期条款，并提取合同到期日期、相关客户和合同详情信息。

所有日期信息必须转换为ISO日期时间格式，使用GMT+8时区（+08:00）。
</task>

<context>
<document_text>
{raw_text}
</document_text>

<identified_parties>
{identified_parties}
</identified_parties>
</context>

<validation_criteria>
文档必须满足以下条件才被认为是包含有效期的合同协议：

合同类型标识：
- 标题关键词：协议书、合同、协议、委托书、服务协议、顾问协议
- 当事人标识：甲方、乙方、丙方、委托方、受托方、服务方

有效期关键词：
- 期限表述：协议有效期、合同期限、协议期、服务期限、委托期限
- 时间范围：自...起至...止、有效期为...年、期限...年、有效至
- 日期格式：年月日具体表述、明确的起止时间

验证失败条件：
- 完全缺乏合同和有效期关键词
- 仅为合同讨论或非正式沟通
- 无明确的到期时间信息
- 非合同性质的法律文档
</validation_criteria>

<extraction_rules>
核心信息提取规则：

1. **合同标题提取 (raw_title构建)**:
   - 识别合同类型：法律顾问、服务、委托、租赁等
   - 构建标准格式：客户简称+合同类型+合同到期
   - 示例：阿里巴巴法律顾问合同到期、阿里巴巴服务合同到期

2. **到期日期提取 (raw_date_time)**:
   - 提取"至"、"止"、"截止"后的日期
   - 转换为ISO格式：YYYY-MM-DDTHH:MM:SS+08:00
   - 合同到期默认时间为09:00:00
   - 示例：2027年5月31日 → 2027-05-31T09:00:00+08:00

3. **客户识别 (related_party_name)**:
   - 从identified_parties中选择我方客户
   - 优先使用status为MATCH_FOUND或NEW_CLIENT_PROPOSED的实体
   - 使用client_resolution.client_name标准名称

4. **合同概述 (note)**:
   - 包含双方当事人名称
   - 合同类型和核心内容
   - 格式：{{甲方}}与{{乙方}}签订的{{合同类型}}

5. **地点信息 (raw_location)**:
   - 合同到期通常无特定地点，固定为null
</extraction_rules>

<reasoning_process>
执行以下分析步骤：

步骤1 - 输入验证：
- 检查document_text和identified_parties数据完整性
- 验证输入格式的正确性

步骤2 - 合同类型验证：
- 根据validation_criteria检查合同标识
- 验证有效期关键词的存在
- 确认文档为有效的合同协议

步骤3 - 客户关系确认：
- 在identified_parties中定位我方客户
- 提取标准化客户名称
- 确认客户在合同中的角色

步骤4 - 核心信息提取：
- 按extraction_rules提取各项信息
- 解析和标准化日期格式
- 构建合同概述描述

步骤5 - 质量检查：
- 验证提取信息的完整性和逻辑性
- 检查日期格式的合理性
- 确保输出符合JSON Schema要求
</reasoning_process>

{format_instructions}

<error_handling>
处理各种错误情况：

输入数据无效：
{{
  "validation_passed": false,
  "extracted_events": [],
  "processing_notes": {{
    "error": "INVALID_INPUT_DATA",
    "contract_type": null,
    "extraction_completeness": "none",
    "potential_issues": ["文档文本为空或格式错误"]
  }}
}}

非合同文档：
{{
  "validation_passed": false,
  "extracted_events": [],
  "processing_notes": {{
    "error": "NOT_CONTRACT_DOCUMENT",
    "contract_type": null,
    "extraction_completeness": "none", 
    "potential_issues": ["缺少合同和有效期关键词", "非合同性质文档"]
  }}
}}

缺少有效期信息：
{{
  "validation_passed": false,
  "extracted_events": [],
  "processing_notes": {{
    "error": "NO_EXPIRY_DATE_FOUND",
    "contract_type": "detected_type_if_any",
    "extraction_completeness": "low",
    "potential_issues": ["识别为合同但无明确到期日期"]
  }}
}}
</error_handling>

<examples>
示例1 - 法律顾问协议：
输入文档：聘请常年法律顾问协议书 甲方阿里巴巴公司 乙方北京朝阳律师事务所 本协议有效期贰年自2025年6月1日起至2027年5月31日止
识别参与方：[{{"name":"阿里巴巴（中国）有限公司","client_resolution":{{"status":"NEW_CLIENT_PROPOSED","client_name":"阿里巴巴（中国）有限公司"}}}}]

输出：
{{
  "validation_passed": true,
  "extracted_events": [
    {{
      "event_type": "contract_renewal",
      "raw_title": "阿里巴巴法律顾问合同到期",
      "raw_date_time": "2027-05-31T09:00:00+08:00",
      "raw_location": null,
      "related_party_name": "阿里巴巴（中国）有限公司",
      "note": "北京朝阳律师事务所与阿里巴巴（中国）有限公司签订的聘请常年法律顾问协议书",
      "confidence": 0.95
    }}
  ],
  "processing_notes": {{
    "contract_type": "法律顾问协议",
    "expiry_date_source": "协议有效期条款", 
    "parties_identified": ["阿里巴巴（中国）有限公司", "北京朝阳律师事务所"],
    "extraction_completeness": "high"
  }}
}}

示例2 - 非合同文档：
输入文档：王律师，关于阿里巴巴和朝阳所的法律顾问合同，我想约个时间讨论一下明年的服务范围是否需要调整。
识别参与方：[{{"name":"阿里巴巴","client_resolution":{{"status":"MATCH_FOUND","client_name":"阿里巴巴（中国）有限公司"}}}}]

输出：
{{
  "validation_passed": false,
  "extracted_events": [],
  "processing_notes": {{
    "error": "NOT_CONTRACT_DOCUMENT", 
    "contract_type": null,
    "extraction_completeness": "none",
    "potential_issues": ["非正式沟通内容", "缺少合同结构和有效期条款", "仅为合同相关讨论"]
  }}
}}
</examples>
"""


async def extract_contract_renewal(
    state: AgentState, runtime: Runtime[Context]
) -> Dict[str, Any]:
    """Extract contract renewal dates and related tasks from contract documents.

    This function analyzes contract documents to identify contract expiration dates
    and validates that the document is actually a contract with valid terms.

    Args:
        state: AgentState containing raw_text and identified_parties
        runtime: LangGraph runtime context (unused in this implementation)

    Returns:
        A dictionary with validation_passed flag and extracted_events list
    """
    try:
        raw_text = state.get("raw_text", "")
        identified_parties = state.get("identified_parties", "[]")

        logger.info("Starting contract renewal extraction")

        # Handle empty text gracefully
        if not raw_text or not raw_text.strip():
            logger.warning("No text available for contract renewal extraction")
            return {"validation_passed": False, "extracted_events": []}

        # Create LLM instance following post_hearing_tasks.py pattern
        chat_llm = ChatTongyi(
            model="qwen3-30b-a3b-instruct-2507",
            api_key=state.get("dashscope_api_key"),
            temperature=0,
        )
        logger.info("ChatTongyi LLM instance created successfully")

        # Set up Pydantic output parser with schema
        parser = PydanticOutputParser(pydantic_object=ContractRenewalOutput)
        logger.info(
            "Pydantic output parser initialized with ContractRenewalOutput schema"
        )

        # Create and format prompt with input variables
        prompt = PromptTemplate(
            template=PROMPT_EXTRACT_CONTRACT_RENEWAL,
            input_variables=["raw_text", "identified_parties"],
            partial_variables={"format_instructions": parser.get_format_instructions()},
        ).format(
            raw_text=raw_text,
            identified_parties=identified_parties,
        )
        logger.debug("Sending prompt to Tongyi ChatLLM for contract renewal extraction")

        # Make LLM call with retry logic (following post_hearing_tasks.py pattern)
        max_retries = 2
        last_error = None

        for attempt in range(max_retries + 1):
            try:
                # Wrap potentially blocking LLM call in asyncio.to_thread
                response = await asyncio.to_thread(chat_llm.invoke, prompt)
                response_text = response.content

                logger.info("Raw response text received from LLM: %s", response_text)

                # Wrap JSON parsing in asyncio.to_thread to avoid blocking
                parsed_result = await asyncio.to_thread(parser.parse, response_text)

                # Convert extracted events to dict format for state storage
                events_for_state = []
                if parsed_result.validation_passed and parsed_result.extracted_events:
                    for event in parsed_result.extracted_events:
                        event_dict = {
                            "event_type": event.event_type,
                            "raw_title": event.raw_title,
                            "raw_date_time": event.raw_date_time,
                            "raw_location": event.raw_location,
                            "related_party_name": event.related_party_name,
                            "note": event.note,
                            "confidence": event.confidence,
                        }
                        events_for_state.append(event_dict)

                logger.info(
                    "Successfully extracted contract renewal - validation_passed: %s, "
                    "events_count: %d",
                    parsed_result.validation_passed,
                    len(events_for_state),
                )

                return {
                    "validation_passed": parsed_result.validation_passed,
                    "extracted_events": events_for_state,
                }

            except Exception as e:
                last_error = e
                logger.warning("Attempt %d failed: %s", attempt + 1, str(e))

                if attempt < max_retries:
                    logger.info(
                        "Retrying contract renewal extraction (attempt %d/%d)",
                        attempt + 2,
                        max_retries + 1,
                    )
                    continue

                break

        # All attempts failed
        logger.error(
            "Contract renewal extraction failed after %d attempts. Last error: %s",
            max_retries + 1,
            last_error,
        )

        # Return failed validation to allow workflow to continue
        return {
            "validation_passed": False,
            "extracted_events": [],
        }

    except Exception as e:
        logger.error("Unexpected error in extract_contract_renewal: %s", str(e))
        # Return failed validation to allow graceful degradation
        return {
            "validation_passed": False,
            "extracted_events": [],
        }
