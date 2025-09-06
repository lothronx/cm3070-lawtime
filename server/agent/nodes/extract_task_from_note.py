"""Extract tasks from voice note transcriptions."""

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

class VoiceNoteDetails(BaseModel):
    original_mention: Optional[str] = Field(
        description="原始文本中提及客户的方式，如'阿里'或'那个案子'"
    )
    client_match_confidence: Optional[float] = Field(
        description="客户匹配的置信度，范围0.0-1.0"
    )
    time_interpretation: str = Field(
        description="对口语化时间表达的文字解释，例如'相对时间-明天上午→...'"
    )
    speech_patterns: List[str] = Field(
        description="识别到的口语化特征，例如'提醒我', '那个案子'"
    )


class Task(BaseModel):
    event_type: Literal["general_task"] = Field(
        default="general_task",
        description="事件类型，固定为'general_task'"
    )
    raw_title: str = Field(description="从语音笔记中提取的简洁、清晰的任务描述，不超过12个汉字")
    raw_date_time: Optional[str] = Field(
        description="任务的绝对ISO日期时间字符串（格式：YYYY-MM-DDTHH:MM:SS+08:00），如果没有时间则为null"
    )
    raw_location: Optional[str] = Field(
        description="任务相关的地点描述，如'星巴克'或'公司会议室'，如果没有地点则为null"
    )
    related_party_name: Optional[str] = Field(
        description="匹配到的客户名称，如果没有匹配或不相关则为null"
    )
    note: str = Field(description="与任务直接相关的原始语音转录文本片段")
    confidence: float = Field(
        description="对整个任务信息提取准确度的整体置信度，范围0.0-1.0"
    )
    voice_note_details: VoiceNoteDetails

class ExtractedTasks(BaseModel):
    tasks: List[Task] = Field(
        description="从语音笔记中识别并提取的所有任务列表。如果未识别到任务，则返回空列表。"
    )

PROMPT_EXTRACT_TASK = """
<system>
你是LawTime法律AI助手的语音笔记任务提取模块，专门处理语音转录文本的任务识别和客户匹配。你擅长理解口语化表达，能从简短、非正式的语音备忘录中快速提取结构化的待办事项，确保输出格式与LangGraph工作流完全兼容。

重要：你必须将所有相对时间表达转换为绝对的ISO日期时间字符串。
</system>

<task>
分析语音转录文本，识别所有可执行的任务和日程安排，同时将提及的客户与已知客户列表进行智能匹配，输出标准化的任务信息数组。

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

<client_list>
{client_list}
</client_list>
</context>

<datetime_conversion_rules>
基于当前时间 {current_datetime}，将相对时间表达转换为绝对ISO日期时间字符串：

时间转换规则：
- "今天" = 当前日期
- "明天" = 当前日期 + 1天
- "后天" = 当前日期 + 2天
- "下周一/二/三..." = 计算下周对应的具体日期
- "下个月" = 当前月份 + 1个月

时间默认值：
- 未指定具体时间或仅提及日期 → 09:00:00
- "早上/上午" → 09:00:00
- "下午" → 14:00:00
- "晚上/夜里" → 18:00:00
- 具体时间（如"两点"、"3点半"）→ 按24小时制转换，结合上下文判断上午/下午

输出格式要求：
- 所有时间必须输出为ISO格式：YYYY-MM-DDTHH:MM:SS+08:00
- 在任务对象的 "raw_date_time" 字段中提供ISO字符串
- 例如：2025-03-25T14:00:00+08:00

转换示例：
- "今天下午两点" → 2025-03-25T14:00:00+08:00（假设今天是2025-03-25）
- "明天上午开庭" → 2025-03-26T09:00:00+08:00
- "下周三晚上6点" → 2025-04-02T18:00:00+08:00
</datetime_conversion_rules>

<validation_criteria>
语音笔记必须包含以下特征之一才会提取任务：

任务指示表达：
- 提醒词汇：提醒我、记住、别忘了、要记得、帮我记一下
- 行动动词：跟进、联系、准备、处理、提交、安排、开会、讨论
- 时间表达：明天、下周、几点、之前、之后、什么时候

语音特征识别：
- 口语化表达和简化词汇
- 省略语法结构（如"那个案子"、"这事儿"）
- 时间的相对表述（明天、下周、今天下午）
- 地点的简化描述（公司、那边、现场）

无任务情况：
- 纯粹的想法表达或感受描述
- 已完成事项的汇报
- 无明确行动要求的信息分享
- 仅为疑问或讨论，无执行指令
</validation_criteria>

<client_matching_rules>
客户识别和匹配规则：

1. **客户名称识别**：
   - 完整公司名称：阿里巴巴（中国）有限公司
   - 简化称呼：阿里巴巴、阿里、Ali
   - 案件关联：阿里巴巴案、阿里的案子、那个阿里的事
   - 人名简称：老王、王总、李律师

2. **匹配策略**：
   - 精确匹配：完全一致的名称
   - 模糊匹配：包含关系或常见简称
   - 上下文推断：通过案件描述关联客户
   - 新客户处理：列表中未找到的客户名称直接使用

3. **匹配置信度**：
   - 0.9-1.0：精确匹配或明确的简称
   - 0.7-0.8：通过上下文推断匹配
   - 0.5-0.6：存在歧义但最可能的匹配
   - 0.0-0.4：匹配不确定，使用原始提及名称
</client_matching_rules>

<reasoning_process>
执行以下分析步骤：

步骤1 - 输入验证：
- 检查document_text和client_list数据完整性
- 验证输入格式的正确性

步骤2 - 语音内容分析：
- 识别口语化表达的特征
- 解析省略语法和简化词汇
- 理解相对时间和地点描述

步骤3 - 任务识别：
- 根据validation_criteria识别任务指示
- 分割独立的任务单元
- 区分任务和非任务内容

步骤4 - 客户匹配处理：
- 提取所有可能的客户名称提及
- 按client_matching_rules进行匹配
- 计算匹配置信度并选择最佳结果

步骤5 - 信息提取：
- 提取任务描述、时间、地点等核心信息
- 标准化口语化的表达
- 构建完整的任务对象

步骤6 - 输出格式化：
- 按照统一的JSON Schema格式输出
- 确保所有字段的数据类型正确
- 验证输出数组的完整性
</reasoning_process>

{format_instructions}

<error_handling>
处理各种边界情况：

输入数据无效时返回：
[]

无可执行任务时返回：
[]

客户匹配失败时：
- related_party_name设为null或原始提及名称
- client_match_confidence设为对应的低置信度值
- 在voice_note_details中记录匹配尝试的详情
</error_handling>

<examples>
示例1 - 多任务含客户匹配：
输入文档：提醒我明天上午跟进一下阿里巴巴那个案子，另外下午两点在星巴克跟张三开个会。
客户列表：[{{"id":102,"client_name":"阿里巴巴（中国）有限公司"}}]
当前时间：2025-03-25T10:30:00+08:00

输出：
[
  {{
    "event_type": "general_task",
    "raw_title": "跟进阿里巴巴案子",
    "raw_date_time": "2025-03-26T09:00:00+08:00",
    "raw_location": null,
    "related_party_name": "阿里巴巴（中国）有限公司",
    "note": "提醒我明天上午跟进一下阿里巴巴那个案子",
    "confidence": 0.92,
    "voice_note_details": {{
      "original_mention": "阿里巴巴",
      "client_match_confidence": 0.95,
      "time_interpretation": "相对时间-明天上午→2025-03-26T09:00:00+08:00",
      "speech_patterns": ["提醒我", "那个案子", "跟进一下"]
    }}
  }},
  {{
    "event_type": "general_task", 
    "raw_title": "与张三开会",
    "raw_date_time": "2025-03-25T14:00:00+08:00",
    "raw_location": "星巴克",
    "related_party_name": "张三",
    "note": "下午两点在星巴克跟张三开个会",
    "confidence": 0.88,
    "voice_note_details": {{
      "original_mention": "张三",
      "client_match_confidence": 0.6,
      "time_interpretation": "具体时间-下午两点→2025-03-25T14:00:00+08:00",
      "speech_patterns": ["下午两点", "开个会"]
    }}
  }}
]

示例2 - 单任务无客户：
输入文档：帮我记一下，下周五之前要提交管辖权异议申请。
客户列表：[]
当前时间：2025-03-25T10:30:00+08:00

输出：
[
  {{
    "event_type": "general_task",
    "raw_title": "提交管辖权异议申请",
    "raw_date_time": "2025-04-04T09:00:00+08:00", 
    "raw_location": null,
    "related_party_name": null,
    "note": "下周五之前要提交管辖权异议申请",
    "confidence": 0.9,
    "voice_note_details": {{
      "original_mention": null,
      "client_match_confidence": null,
      "time_interpretation": "相对期限-下周五之前→2025-04-04T09:00:00+08:00",
      "speech_patterns": ["帮我记一下", "要提交"]
    }}
  }}
]

示例3 - 无任务内容：
输入文档：我感觉这个案子的证据链有点问题，可能需要再研究一下。
客户列表：[]

输出：
[]

示例4 - 复杂时间地点表述：
输入文档：明天下午三点半，去朝阳区执行局那边，处理一下腾讯的财产保全解除申请。
客户列表：[{{"id":201,"client_name":"深圳市腾讯计算机系统有限公司"}}]
当前时间：2025-03-25T10:30:00+08:00

输出：
[
  {{
    "event_type": "general_task",
    "raw_title": "处理腾讯财产保全解除申请",
    "raw_date_time": "2025-03-26T15:30:00+08:00",
    "raw_location": "朝阳区执行局",
    "related_party_name": "深圳市腾讯计算机系统有限公司",
    "note": "明天下午三点半，去朝阳区执行局那边，处理一下腾讯的财产保全解除申请",
    "confidence": 0.94,
    "voice_note_details": {{
      "original_mention": "腾讯",
      "client_match_confidence": 0.92,
      "time_interpretation": "具体时间-明天下午三点半→2025-03-26T15:30:00+08:00",
      "speech_patterns": ["那边", "处理一下"]
    }}
  }}
]
</examples>
"""

async def extract_task_from_note(
    state: AgentState, runtime: Runtime[Context]
) -> Dict[str, Any]:
    """Lightweight all-in-one analysis of voice note.

    This function analyzes voice note transcriptions to identify actionable tasks,
    handling colloquial speech patterns and relative time expressions. Unlike
    formal document extractors, this handles casual speech, simplified references,
    and conversational task instructions.

    Args:
        state: AgentState containing raw_text and client_list
        runtime: LangGraph runtime context (unused in this implementation)

    Returns:
        A dictionary with extracted_events list containing voice note tasks
    """
    try:
        raw_text = state.get("raw_text", "")
        client_list_formatted = state.get("client_list_formatted", [])
        current_datetime = state.get("current_datetime", "")

        logger.info("Starting voice note task extraction")

        # Handle empty text gracefully
        if not raw_text or not raw_text.strip():
            logger.warning("No text available for voice note task extraction")
            return {"extracted_events": []}

        # Create LLM instance following general_task.py pattern
        chat_llm = ChatTongyi(
            model="qwen3-30b-a3b-instruct-2507",
            api_key=state.get("dashscope_api_key"),
            temperature=0,
        )
        logger.info("ChatTongyi LLM instance created successfully")

        # Set up Pydantic output parser with schema
        parser = PydanticOutputParser(pydantic_object=ExtractedTasks)
        logger.info(
            "Pydantic output parser initialized with ExtractedTasks schema"
        )

        # Create and format prompt with input variables
        prompt = PromptTemplate(
            template=PROMPT_EXTRACT_TASK,
            input_variables=["raw_text", "client_list", "current_datetime"],
            partial_variables={"format_instructions": parser.get_format_instructions()},
        ).format(
            raw_text=raw_text,
            client_list=client_list_formatted,
            current_datetime=current_datetime,
        )
        logger.debug(
            "Sending prompt to Tongyi ChatLLM for voice note task extraction"
        )

        # Make LLM call with retry logic (following general_task.py pattern)
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

                # Convert extracted tasks to dict format for state storage
                events_for_state = []
                if parsed_result.tasks:
                    for task in parsed_result.tasks:
                        task_dict = {
                            "event_type": task.event_type,
                            "raw_title": task.raw_title,
                            "raw_date_time": task.raw_date_time,
                            "raw_location": task.raw_location,
                            "related_party_name": task.related_party_name,
                            "note": task.note,
                            "confidence": task.confidence,
                            "voice_note_details": {
                                "original_mention": task.voice_note_details.original_mention,
                                "client_match_confidence": task.voice_note_details.client_match_confidence,
                                "time_interpretation": task.voice_note_details.time_interpretation,
                                "speech_patterns": task.voice_note_details.speech_patterns,
                            },
                        }
                        events_for_state.append(task_dict)

                logger.info(
                    "Successfully extracted voice note tasks - events_count: %d",
                    len(events_for_state),
                )

                return {
                    "extracted_events": events_for_state,
                }

            except Exception as e:
                last_error = e
                logger.warning("Attempt %d failed: %s", attempt + 1, str(e))

                if attempt < max_retries:
                    logger.info(
                        "Retrying voice note task extraction (attempt %d/%d)",
                        attempt + 2,
                        max_retries + 1,
                    )
                    continue

                break

        # All attempts failed
        logger.error(
            "Voice note task extraction failed after %d attempts. Last error: %s",
            max_retries + 1,
            last_error,
        )

        # Return empty events list to allow workflow to continue
        return {
            "extracted_events": [],
        }

    except Exception as e:
        logger.error("Unexpected error in extract_task_from_note: %s", str(e))
        # Return empty events list to allow graceful degradation
        return {
            "extracted_events": [],
        }
