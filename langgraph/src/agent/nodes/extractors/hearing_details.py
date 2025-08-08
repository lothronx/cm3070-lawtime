"""Extract court hearing details from summons/notices."""

import asyncio
import logging
from typing import Any, Dict, List, Optional, Literal
from pydantic import BaseModel, Field
from langgraph.runtime import Runtime
from langchain_community.chat_models.tongyi import ChatTongyi
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from agent.utils.state import AgentState

logger = logging.getLogger(__name__)


class Context:
    """Context parameters for the agent."""

    pass


class ExtractedEvent(BaseModel):
    event_type: Literal["court_hearing"] = Field(
        default="court_hearing", description="事件类型，固定为'court_hearing'"
    )
    raw_title: str = Field(description="提取的事件标题，例如'开庭'或'听证'")
    raw_date_time: Optional[str] = Field(
        description="任务的绝对ISO日期时间字符串（格式：YYYY-MM-DDTHH:MM:SS+08:00），如果没有时间则为null"
    )
    raw_location: Optional[str] = Field(
        description="完整的庭审地点信息，包含法院和审判庭"
    )
    related_party_name: Optional[str] = Field(description="关联的我方客户标准名称")
    note: Optional[str] = Field(description="案件概述信息，通常包含案号和案由")
    confidence: float = Field(description="本次提取结果的置信度，范围0.0-1.0")


class ProcessingNotes(BaseModel):
    validation_keywords_found: List[str] = Field(
        description="在文档中找到的用于验证有效性的关键词列表"
    )
    extraction_completeness: Literal["high", "medium", "low", "none"] = Field(
        description="信息提取的完整度评估"
    )
    potential_issues: List[str] = Field(description="提取过程中发现的潜在问题列表")
    error: Optional[str] = Field(
        default=None, description="如果验证失败，此处应包含错误代码"
    )


# This is the main, top-level model for the final output
class HearingDetailsOutput(BaseModel):
    validation_passed: bool = Field(description="文档是否通过了庭审通知的有效性验证")
    extracted_events: List[ExtractedEvent] = Field(
        description="提取出的庭审事件列表。如果validation_passed为false，此列表必须为空。"
    )
    processing_notes: ProcessingNotes


PROMPT_EXTRACT_HEARING_DETAILS = """
<system>
你是LawTime法律AI助手的专业庭审信息提取模块，专门从中文法庭通知文档中精确提取日程安排信息。你必须严格验证文档有效性，确保输出格式与LangGraph工作流完全兼容。

重要：你必须将所有提取的日期时间转换为绝对的ISO日期时间字符串格式。
</system>

<task>
分析法庭日程通知文档，验证其有效性并提取核心庭审信息：事件类型、时间、地点、相关客户和案件详情。

所有日期时间信息必须转换为ISO日期时间格式，使用GMT+8时区（+08:00）。
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
文档必须满足以下条件之一才被认为是有效的庭审通知：

核心关键词匹配：
- 传票类：开庭传票、出庭通知书、传票、传唤书
- 事由类：传唤事由、开庭、听证、质证、谈话、调解
- 时间类：应到时间、开庭时间、听证时间、出庭时间
- 地点类：应到处所、审判庭、法庭、开庭地点

文档结构特征：
- 包含法院名称或法院标识
- 包含案号格式（如：(2025)京0105民初0001号）
- 包含明确的时间信息
- 包含地点信息

验证失败条件：
- 完全缺乏上述关键词
- 仅为非正式沟通或提醒
- 缺少时间或地点的核心要素
</validation_criteria>

<extraction_rules>
核心信息提取规则：

1. **事件标题 (raw_title)**:
   - 优先提取"传唤事由"字段内容
   - 如无明确事由，使用文档类型（如"开庭"、"听证"）
   - 格式：当事人简称 + 传唤事由/文档类型
   - 示例：阿里巴巴开庭

2. **时间信息 (raw_date_time)**:
   - 提取完整的日期时间：年月日+时分
   - 转换为ISO格式：YYYY-MM-DDTHH:MM:SS+08:00
   - 处理各种时间格式变体并统一转换
   - 示例：2025年08月26日 13:40 → 2025-08-26T13:40:00+08:00

3. **地点信息 (raw_location)**:
   - 合并法院名称+审判庭信息
   - 格式：法院全称 + 审判庭/法庭/房间号
   - 示例：威海市文登区人民法院开发区第一审判庭

4. **案件概述 (note)**:
   - 提取案号、案由、当事人信息
   - 格式：(案号)案由描述
   - 示例：(2025)鲁1003民初0001号建设工程施工合同纠纷

5. **相关客户 (related_party_name)**:
   - 从identified_parties中选择status为MATCH_FOUND或NEW_CLIENT_PROPOSED的客户
   - 使用client_resolution.client_name作为标准名称
</extraction_rules>

<reasoning_process>
执行以下分析步骤：

步骤1 - 输入验证：
- 检查document_text和identified_parties是否为空
- 验证数据格式的完整性

步骤2 - 文档类型验证：
- 根据validation_criteria检查关键词匹配
- 分析文档结构特征
- 确定是否为有效的庭审通知文档

步骤3 - 客户识别：
- 在identified_parties中查找我方客户
- 选择status为MATCH_FOUND或NEW_CLIENT_PROPOSED的实体
- 提取标准化客户名称

步骤4 - 信息提取：
- 按extraction_rules提取各项核心信息
- 标准化时间格式和地点信息
- 构建完整的案件概述

步骤5 - 质量验证：
- 检查提取信息的完整性和合理性
- 验证时间格式的正确性
- 确保输出格式符合JSON Schema要求
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
    "validation_keywords_found": [],
    "extraction_completeness": "none",
    "potential_issues": ["文档文本为空或格式错误"]
  }}
}}

非庭审通知文档：
{{
  "validation_passed": false, 
  "extracted_events": [],
  "processing_notes": {{
    "error": "NOT_HEARING_DOCUMENT",
    "validation_keywords_found": [],
    "extraction_completeness": "none",
    "potential_issues": ["缺少庭审通知的关键特征"]
  }}
}}
</error_handling>

<examples>
示例1 - 标准开庭传票：
输入文档：威海市文登区人民法院开庭传票 案号(2025)鲁1003民初0001号 案由建设工程施工合同纠纷 被传唤人阿里巴巴公司 传唤事由开庭 应到时间2025年08月26日13:40 应到处所开发区第一审判庭
识别参与方：[{{"name":"阿里巴巴（中国）有限公司","client_resolution":{{"status":"NEW_CLIENT_PROPOSED","client_name":"阿里巴巴（中国）有限公司"}}}}]

输出：
{{
  "validation_passed": true,
  "extracted_events": [
    {{
      "event_type": "court_hearing",
      "raw_title": "阿里巴巴开庭",
      "raw_date_time": "2025-08-26T13:40:00+08:00",
      "raw_location": "威海市文登区人民法院开发区第一审判庭",
      "related_party_name": "阿里巴巴（中国）有限公司", 
      "note": "(2025)鲁1003民初0001号建设工程施工合同纠纷",
      "confidence": 0.95
    }}
  ],
  "processing_notes": {{
    "validation_keywords_found": ["开庭传票", "传唤事由", "应到时间", "应到处所"],
    "extraction_completeness": "high",
    "potential_issues": []
  }}
}}

示例2 - 无效文档（非正式沟通）：
输入文档：韩律师，提醒一下，关于阿里巴巴的案子，对方律师想跟我们约个时间讨论一下证据材料。
识别参与方：[{{"name":"阿里巴巴","client_resolution":{{"status":"MATCH_FOUND","client_name":"阿里巴巴（中国）有限公司"}}}}]

输出：
{{
  "validation_passed": false,
  "extracted_events": [],
  "processing_notes": {{
    "error": "NOT_HEARING_DOCUMENT",
    "validation_keywords_found": [],
    "extraction_completeness": "none", 
    "potential_issues": ["缺少传票、开庭等关键词", "无正式文档结构", "仅为非正式沟通"]
  }}
}}
</examples>
"""


async def extract_hearing_details(
    state: AgentState, runtime: Runtime[Context]
) -> Dict[str, Any]:
    """Extract court hearing details from summons/notices.

    This function analyzes legal documents to identify court hearing information
    and validates that the document is actually a hearing notice/summons.

    Args:
        state: AgentState containing raw_text and identified_parties
        runtime: LangGraph runtime context (unused in this implementation)

    Returns:
        A dictionary with validation_passed flag and extracted_events list
    """
    try:
        raw_text = state.get("raw_text", "")
        identified_parties = state.get("identified_parties", "[]")

        logger.info("Starting court hearing details extraction")

        # Handle empty text gracefully
        if not raw_text or not raw_text.strip():
            logger.warning("No text available for hearing details extraction")
            return {"validation_passed": False, "extracted_events": []}

        # Create LLM instance following resolve_parties.py pattern
        chat_llm = ChatTongyi(
            model="qwen3-30b-a3b-instruct-2507",
            api_key=state.get("dashscope_api_key"),
            temperature=0,
        )
        logger.info("ChatTongyi LLM instance created successfully")

        # Set up Pydantic output parser with schema
        parser = PydanticOutputParser(pydantic_object=HearingDetailsOutput)
        logger.info(
            "Pydantic output parser initialized with HearingDetailsOutput schema"
        )

        # Create and format prompt with input variables
        prompt = PromptTemplate(
            template=PROMPT_EXTRACT_HEARING_DETAILS,
            input_variables=["raw_text", "identified_parties"],
            partial_variables={"format_instructions": parser.get_format_instructions()},
        ).format(
            raw_text=raw_text,
            identified_parties=identified_parties,
        )
        logger.debug("Sending prompt to Tongyi ChatLLM for hearing details extraction")

        # Make LLM call with retry logic (following resolve_parties.py pattern)
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
                    f"Successfully extracted hearing details - validation_passed: {parsed_result.validation_passed}, "
                    f"events_count: {len(events_for_state)}"
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
                        "Retrying hearing details extraction (attempt %d/%d)",
                        attempt + 2,
                        max_retries + 1,
                    )
                    continue

                break

        # All attempts failed
        logger.error(
            "Hearing details extraction failed after %d attempts. Last error: %s",
            max_retries + 1,
            last_error,
        )

        # Return failed validation to allow workflow to continue
        return {
            "validation_passed": False,
            "extracted_events": [],
        }

    except Exception as e:
        logger.error("Unexpected error in extract_hearing_details: %s", str(e))
        # Return failed validation to allow graceful degradation
        return {
            "validation_passed": False,
            "extracted_events": [],
        }
