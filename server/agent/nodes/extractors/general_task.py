"""Handle uncategorized or misclassified documents (fallback)."""

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


# Define strict Literals for fields with specific allowed values
UrgencyLevel = Literal["normal", "urgent", "high_priority"]
CompletenessLevel = Literal["high", "medium", "low", "none"]


class TaskDetails(BaseModel):
    """Details about the extracted task."""

    urgency_level: UrgencyLevel = Field(description="任务的紧急程度")
    action_type: str = Field(
        description="任务的具体行动类型，例如'文件审核'或'对外联系'"
    )
    context_clues: List[str] = Field(
        description="从文本中提取到用于识别任务的关键线索词"
    )


class ExtractedEvent(BaseModel):
    """Represents a single extracted task or event."""

    event_type: Literal["general_task"] = Field(
        default="general_task",
        description="事件类型，固定为'general_task'"
    )
    raw_title: str = Field(description="提取的简洁任务描述，不超过12个汉字")
    raw_date_time: Optional[str] = Field(
        description="任务的绝对ISO日期时间字符串（格式：YYYY-MM-DDTHH:MM:SS+08:00），如果没有时间则为null"
    )
    raw_location: Optional[str] = Field(description="任务相关的地点或null")
    related_party_name: Optional[str] = Field(description="与任务关联的客户名称或null")
    note: Optional[str] = Field(description="其他补充说明或上下文信息")
    confidence: float = Field(description="本次任务提取的整体置信度 (0.0-1.0)")
    task_details: TaskDetails


class ProcessingNotes(BaseModel):
    """Contains metadata and potential errors from the extraction process."""

    total_tasks_identified: int = Field(description="识别到的任务总数")
    extraction_completeness: CompletenessLevel = Field(
        description="信息提取的完整度评估"
    )
    # Make fields optional to handle both success and error cases in one model
    action_keywords_found: Optional[List[str]] = Field(
        description="在文本中找到的触发任务识别的关键词"
    )
    client_associations: Optional[str] = Field(description="客户关联情况的简要说明")
    error: Optional[str] = Field(description="如果提取失败，此处为错误代码")
    potential_issues: Optional[List[str]] = Field(
        description="如果提取失败，此处为可能的问题列表"
    )


class GeneralTaskOutput(BaseModel):
    """The final structured output for the general task extraction module."""

    validation_passed: bool = Field(description="文本是否包含可执行的任务指令")
    extracted_events: List[ExtractedEvent] = Field(
        description="提取出的所有任务事件列表。如果validation_passed为false，此列表必须为空。"
    )
    processing_notes: ProcessingNotes


PROMPT_EXTRACT_GENERAL_TASK = """
<system>
你是LawTime法律AI助手的通用任务提取模块，专门从各类非正式法律文本、备忘录、沟通记录、提醒便条中智能识别并提取待办事项。你擅长在自由文本中发现隐含的行动要求和截止日期，确保输出格式与LangGraph工作流完全兼容。

重要：你必须将所有相对时间表达转换为绝对的ISO日期时间字符串。
</system>

<task>
分析非正式法律文本，验证其包含可执行的任务指令，提取所有需要行动的事项信息：任务描述、截止期限、地点、相关客户和补充说明。

所有时间信息必须转换为绝对ISO日期时间格式，使用GMT+8时区（+08:00）。
</task>

<context>
<current_datetime>
当前日期时间：{current_datetime}
时区：GMT+8 (+08:00)
</current_datetime>

<document_text>
{raw_text}
</document_text>

<identified_parties>
{identified_parties}
</identified_parties>
</context>

<datetime_conversion_rules>
基于当前时间 {current_datetime}，将相对时间表达转换为绝对ISO日期时间字符串：

时间转换规则：
- "今天" = 当前日期
- "明天" = 当前日期 + 1天
- "后天" = 当前日期 + 2天
- "下周" = 当前日期 + 7天
- "月底前" = 当前月最后一天
- "尽快" = 当前日期 + 1天
- "周五之前" = 计算最近的周五日期

时间默认值：
- 未指定具体时间或仅提及日期 → 09:00:00
- "早上/上午" → 09:00:00
- "下午" → 14:00:00
- "晚上" → 18:00:00

输出格式要求：
- 所有时间必须输出为ISO格式：YYYY-MM-DDTHH:MM:SS+08:00
- 在任务对象的 "raw_date_time" 字段中提供ISO字符串
- 例如：2025-03-25T14:00:00+08:00

转换示例：
- "明天下午联系" → 2025-03-26T14:00:00+08:00（假设今天是2025-03-25）
- "周五之前提交" → 2025-03-28T09:00:00+08:00
- "尽快处理" → 2025-03-26T17:00:00+08:00
</datetime_conversion_rules>

<validation_criteria>
文本必须包含以下特征之一才被认为包含可执行的任务：

行动指示词汇：
- 任务动词：准备、草拟、提交、联系、回复、研究、审核、发送、安排、处理、完成、跟进
- 责任表述：需要、必须、应当、要求、请、麻烦、提醒、记得、不要忘记
- 时间敏感：截止、期限、之前、之内、尽快、紧急、优先

任务特征识别：
- 包含明确的执行主体（我方/我们）
- 具有可操作的具体行动描述
- 体现法律业务相关的工作内容
- 存在时间要求或优先级表述

验证失败条件：
- 纯信息告知且无行动要求（如新闻通知、状态更新）
- 已完成事项的汇报或总结
- 仅为询问或讨论，无明确执行指令
- 完全缺乏任务相关的关键词汇
</validation_criteria>

<task_extraction_rules>
任务提取和处理规则：

1. **任务识别原则**：
   - 一个文本可能包含多个独立任务
   - 每个任务必须有明确的行动要求
   - 区分主要任务和次要任务
   - 合并相关联的子任务

2. **任务描述构建 (raw_title)**：
   - 提取核心行动动词和对象
   - 格式：动词 + 对象或内容
   - 示例："审核证据清单"、"联系对方律师"、"提交管辖权异议申请"

3. **时间信息提取 (raw_date_time)**：
   - 按datetime_conversion_rules将相对时间转换为ISO格式
   - 绝对时间：具体日期时间转换为ISO字符串
   - 相对时间：明天、下周、三日内、月底前 → 计算后转换为ISO格式
   - 紧急程度：尽快、紧急、优先 → 按规则转换为具体ISO时间
   - 无时间要求时设为null

4. **地点信息提取 (raw_location)**：
   - 具体地址或机构名称
   - 会议室、法院、执行局等
   - 网络平台（如视频会议）
   - 无地点要求时设为null

5. **客户关联 (related_party_name)**：
   - 从identified_parties中匹配客户
   - 使用status为MATCH_FOUND或NEW_CLIENT_PROPOSED的实体
   - 文本提及但不在列表中的客户也需记录
   - 无客户关联时设为null
</task_extraction_rules>

<reasoning_process>
执行以下分析步骤：

步骤1 - 输入验证：
- 检查document_text和identified_parties数据完整性
- 验证输入格式的正确性

步骤2 - 任务存在性验证：
- 根据validation_criteria检查行动指示词汇
- 分析文本的任务特征
- 确认包含可执行的任务指令

步骤3 - 任务分割和识别：
- 将文本分解为独立的任务单元
- 识别每个任务的核心行动要求
- 区分主要任务和辅助信息

步骤4 - 客户关系匹配：
- 在identified_parties中查找相关客户
- 处理客户名称的各种表述形式
- 建立任务与客户的关联关系

步骤5 - 信息要素提取：
- 按task_extraction_rules提取各项信息
- 标准化时间、地点、描述等字段
- 构建完整的任务详情

步骤6 - 质量检查：
- 验证提取信息的完整性和准确性
- 检查任务描述的清晰度和可操作性
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
    "total_tasks_identified": 0,
    "extraction_completeness": "none",
    "potential_issues": ["文档文本为空或格式错误"]
  }}
}}

无任务指令：
{{
  "validation_passed": false,
  "extracted_events": [],
  "processing_notes": {{
    "error": "NO_ACTIONABLE_TASKS",
    "total_tasks_identified": 0,
    "action_keywords_found": [],
    "extraction_completeness": "none",
    "potential_issues": ["仅为信息告知", "无行动指示词汇", "缺少明确的执行指令"]
  }}
}}
</error_handling>

<examples>
示例1 - 多任务处理指令：
输入文档：王律师，关于阿里巴巴的案子有两件事需要处理：1.请审核一下附件里的这份证据清单，看看有没有问题。2.请在明天下午之前，联系一下对方律师李明，确认一下他是否收到了我们的函件。
识别参与方：[{{"name":"阿里巴巴","client_resolution":{{"status":"MATCH_FOUND","client_name":"阿里巴巴（中国）有限公司"}}}}]
当前时间：2025-03-25T10:00:00+08:00

输出：
{{
  "validation_passed": true,
  "extracted_events": [
    {{
      "event_type": "general_task",
      "raw_title": "审核阿里巴巴案证据清单",
      "raw_date_time": null,
      "raw_location": null,
      "related_party_name": "阿里巴巴（中国）有限公司",
      "note": "检查附件中的证据清单是否有问题",
      "confidence": 0.95,
      "task_details": {{
        "urgency_level": "normal",
        "action_type": "文件审核",
        "context_clues": ["审核", "证据清单", "附件"]
      }}
    }},
    {{
      "event_type": "general_task",
      "raw_title": "联系李明确认函件接收",
      "raw_date_time": "2025-03-26T14:00:00+08:00",
      "raw_location": null,
      "related_party_name": "阿里巴巴（中国）有限公司",
      "note": "联系对方律师李明，确认函件接收情况",
      "confidence": 0.92,
      "task_details": {{
        "urgency_level": "urgent",
        "action_type": "对外联系",
        "context_clues": ["联系", "明天下午之前→2025-03-26T14:00:00+08:00", "对方律师"]
      }}
    }}
  ],
  "processing_notes": {{
    "total_tasks_identified": 2,
    "action_keywords_found": ["处理", "审核", "联系", "确认"],
    "client_associations": "阿里巴巴案件相关",
    "extraction_completeness": "high"
  }}
}}

示例2 - 纯信息通知（无任务）：
输入文档：通知：关于知识产权案件的最新司法解释已于今日发布，详情请见法院官网。
识别参与方：[]

输出：
{{
  "validation_passed": false,
  "extracted_events": [],
  "processing_notes": {{
    "error": "NO_ACTIONABLE_TASKS",
    "total_tasks_identified": 0,
    "action_keywords_found": [],
    "extraction_completeness": "none",
    "potential_issues": ["纯信息告知", "无明确行动要求", "仅为通知性质"]
  }}
}}

示例3 - 有时间紧急性的任务：
输入文档：提醒我一下，周五之前要提交针对腾讯案的管辖权异议申请，这个很急。
识别参与方：[{{"name":"腾讯公司","client_resolution":{{"status":"OTHER_PARTY","client_name":null}}}}]
当前时间：2025-03-25T10:00:00+08:00

输出：
{{
  "validation_passed": true,
  "extracted_events": [
    {{
      "event_type": "general_task",
      "raw_title": "提交腾讯案管辖权异议申请",
      "raw_date_time": "2025-03-28T09:00:00+08:00",
      "raw_location": null,
      "related_party_name": null,
      "note": "案件：腾讯案，紧急处理",
      "confidence": 0.88,
      "task_details": {{
        "urgency_level": "urgent",
        "action_type": "法律文书提交",
        "context_clues": ["提交", "周五之前→2025-03-28T09:00:00+08:00", "很急"]
      }}
    }}
  ],
  "processing_notes": {{
    "total_tasks_identified": 1,
    "action_keywords_found": ["提醒", "提交", "很急"],
    "client_associations": "腾讯案相关（对方当事人）",
    "extraction_completeness": "high"
  }}
}}
</examples>
"""


async def extract_general_task(
    state: AgentState, runtime: Runtime[Context]
) -> Dict[str, Any]:
    """Handle uncategorized or misclassified documents (fallback).

    This function analyzes various informal legal texts, memos, and communications
    to identify actionable tasks and to-do items, serving as a fallback extractor
    for documents that don't fit specific categories.

    Args:
        state: AgentState containing raw_text and identified_parties
        runtime: LangGraph runtime context (unused in this implementation)

    Returns:
        A dictionary with validation_passed flag and extracted_events list
    """
    try:
        raw_text = state.get("raw_text", "")
        identified_parties = state.get("identified_parties", "[]")
        current_datetime = state.get("current_datetime", "")

        logger.info("Starting general task extraction")

        # Handle empty text gracefully
        if not raw_text or not raw_text.strip():
            logger.warning("No text available for general task extraction")
            return {"validation_passed": False, "extracted_events": []}

        # Create LLM instance following post_hearing_tasks.py pattern
        chat_llm = ChatTongyi(
            model="qwen3-30b-a3b-instruct-2507",
            api_key=state.get("dashscope_api_key"),
            temperature=0,
        )
        logger.info("ChatTongyi LLM instance created successfully")

        # Set up Pydantic output parser with schema
        parser = PydanticOutputParser(pydantic_object=GeneralTaskOutput)
        logger.info(
            "Pydantic output parser initialized with GeneralTaskOutput schema"
        )

        # Create and format prompt with input variables
        prompt = PromptTemplate(
            template=PROMPT_EXTRACT_GENERAL_TASK,
            input_variables=["raw_text", "identified_parties", "current_datetime"],
            partial_variables={"format_instructions": parser.get_format_instructions()},
        ).format(
            raw_text=raw_text,
            identified_parties=identified_parties,
            current_datetime=current_datetime,
        )
        logger.debug(
            "Sending prompt to Tongyi ChatLLM for general task extraction"
        )

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
                            "task_details": {
                                "urgency_level": event.task_details.urgency_level,
                                "action_type": event.task_details.action_type,
                                "context_clues": event.task_details.context_clues,
                            },
                        }
                        events_for_state.append(event_dict)

                logger.info(
                    "Successfully extracted general tasks - validation_passed: %s, "
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
                        "Retrying general task extraction (attempt %d/%d)",
                        attempt + 2,
                        max_retries + 1,
                    )
                    continue

                break

        # All attempts failed
        logger.error(
            "General task extraction failed after %d attempts. Last error: %s",
            max_retries + 1,
            last_error,
        )

        # Return failed validation to allow workflow to continue
        return {
            "validation_passed": False,
            "extracted_events": [],
        }

    except Exception as e:
        logger.error("Unexpected error in extract_general_task: %s", str(e))
        # Return failed validation to allow graceful degradation
        return {
            "validation_passed": False,
            "extracted_events": [],
        }
