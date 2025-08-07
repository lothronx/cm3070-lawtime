"""Extract follow-up tasks from hearing transcripts."""

from typing import Any, Dict, List, Optional, Literal
from pydantic import BaseModel, Field
from langgraph.runtime import Runtime
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from agent.utils.state import AgentState


class Context:
    """Context parameters for the agent."""

    pass


TextQuality = Literal["low", "medium", "high"]
ErrorCode = Literal[
    "INVALID_INPUT_DATA", "NOT_HEARING_TRANSCRIPT", "NO_OUR_PARTY_IDENTIFIED"
]


class TaskDetails(BaseModel):
    task_assignor: str = Field(description="任务的分配方（例如：法官、审判员）")
    task_context: str = Field(description="描述任务分配时的具体上下文背景")
    attribution_confidence: float = Field(description="任务归属判定的置信度（0.0-1.0）")


class ExtractedEvent(BaseModel):
    event_type: Literal["post_hearing_task"] = Field(
        default="post_hearing_task",
        description="事件类型，固定为 'post_hearing_task'"
    )
    raw_title: str = Field(description="提取的庭后任务的简洁描述")
    raw_date_time: Optional[str] = Field(
        description="任务的绝对ISO日期时间字符串（格式：YYYY-MM-DDTHH:MM:SS+08:00），如果没有时间则为null"
    )
    raw_location: Optional[str] = Field(description="任务相关地点，庭后任务通常为null")
    related_party_name: Optional[str] = Field(description="关联的我方客户标准名称")
    note: str = Field(description="案件概述信息，如案号、案由等")
    confidence: float = Field(description="整体任务信息提取的置信度（0.0-1.0）")
    task_details: TaskDetails


class ProcessingNotes(BaseModel):
    # Success fields
    dialogue_participants: Optional[List[str]] = Field(
        description="识别到的所有对话参与方角色"
    )
    case_info_extracted: Optional[str] = Field(
        description="从文档中提取到的案件基本信息摘要"
    )
    our_party_role: Optional[str] = Field(description="我方当事人在案件中的角色")

    # Universal fields
    total_tasks_found: int = Field(description="识别并归属于我方的任务总数")

    # Error fields
    error: Optional[ErrorCode] = Field(description="如果验证失败，则显示错误代码")
    potential_issues: Optional[List[str]] = Field(description="描述验证失败的具体原因")


# This is the main, top-level model that handles both success and failure cases
class PostHearingTasksOutput(BaseModel):
    validation_passed: bool = Field(
        description="文档是否通过了所有验证（如，是否为庭审笔录，是否找到我方当事人）"
    )
    extracted_events: List[ExtractedEvent] = Field(
        description="提取出的、分配给我方的庭后任务列表。如果validation_passed为false，此列表必须为空。"
    )
    processing_notes: ProcessingNotes


PROMPT_EXTRACT_POST_HEARING_TASKS = """
<system>
你是LawTime法律AI助手的专业庭后任务提取模块，专门从中文庭审笔录、谈话笔录、质证笔录等对话文档中精确识别并提取分配给我方当事人的庭后待办事项。你必须严格验证文书有效性和任务归属，确保输出格式与LangGraph工作流完全兼容。

重要：你必须将所有相对时间表达转换为绝对的ISO日期时间字符串。
</system>

<task>
分析庭审类笔录文档，验证其为有效的对话记录文书，识别我方当事人，提取所有明确分配给我方的庭后任务信息：任务描述、截止期限、相关案件详情。

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
- "三日内" = 当前日期 + 3天
- "一周内" = 当前日期 + 7天
- "庭后" = 当前日期 + 7天
- "某日期前" = 具体日期转换为ISO格式

时间默认值：
- 未指定具体时间 → 09:00:00

输出格式要求：
- 所有时间必须输出为ISO格式：YYYY-MM-DDTHH:MM:SS+08:00
- 在任务对象的 "raw_date_time" 字段中提供ISO字符串
- 例如：2025-03-28T09:00:00+08:00

转换示例：
- "三日内" → 2025-03-28T09:00:00+08:00（假设今天是2025-03-25）
- "庭后一周内提交" → 2025-04-01T09:00:00+08:00
</datetime_conversion_rules>

<validation_criteria>
文档必须满足以下条件才被认为是有效的庭审笔录文档：

对话文书标识：
- 标题关键词：庭审笔录、谈话笔录、质证笔录、询问笔录、听证笔录
- 对话标识：法官：、审判员：、仲裁员：、原告：、被告：、申请人：、被申请人：、代理人：

结构特征要求：
- 包含明确的角色标识和发言内容
- 存在对话形式的文档结构
- 包含案件基本信息（案号、案由等）
- 体现正式的法律程序记录特征

验证失败条件：
- 完全缺乏对话标识和庭审特征
- 仅为非正式沟通或提醒内容
- 缺少角色发言的对话结构
- 非庭审程序性质的法律文档
</validation_criteria>

<task_attribution_rules>
任务归属判定规则（核心业务逻辑）：

1. **我方当事人识别**：
   - 从identified_parties中查找status为MATCH_FOUND或NEW_CLIENT_PROPOSED的实体
   - 该实体即为"我方当事人"，是任务归属的基准

2. **任务归属判定**：
   - 明确分配给我方：法官对我方当事人/代理人直接发出指令
   - 分配给双方：法官对双方当事人同时发出相同指令，需为我方提取
   - 分配给对方：法官仅对对方当事人发出指令，必须忽略

3. **关键识别词汇**：
   - 任务动词：提交、补充、说明、提供、回答、准备、草拟、联系
   - 期限表述：三日内、一周内、庭后、下次开庭前、某日期前
   - 指向词汇：原告方、被告方、申请人、代理人、你方、你们
</task_attribution_rules>

<reasoning_process>
执行以下分析步骤：

步骤1 - 输入验证：
- 检查document_text和identified_parties数据完整性
- 验证输入格式的正确性

步骤2 - 文书类型验证：
- 根据validation_criteria检查笔录文书特征
- 确认存在对话标识和庭审结构
- 验证为有效的庭审笔录文档

步骤3 - 我方当事人确认：
- 在identified_parties中定位我方客户
- 提取标准化客户名称
- 确认客户在案件中的角色和地位

步骤4 - 案件信息提取：
- 提取案号、案由、当事人等案件基本信息
- 构建标准化案件概述描述

步骤5 - 任务识别与归属：
- 逐句分析法官/审判员的发言内容
- 根据task_attribution_rules判定任务归属
- 仅提取明确分配给我方的任务
- 为每个我方任务提取描述、期限、地点等信息

步骤6 - 质量检查：
- 验证任务归属判定的准确性
- 检查提取信息的完整性和逻辑性
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
    "total_tasks_found": 0,
    "extraction_completeness": "none",
    "potential_issues": ["文档文本为空或格式错误"]
  }}
}}

非庭审笔录文档：
{{
  "validation_passed": false,
  "extracted_events": [],
  "processing_notes": {{
    "error": "NOT_HEARING_TRANSCRIPT",
    "total_tasks_found": 0,
    "extraction_completeness": "none",
    "potential_issues": ["缺少对话标识", "非庭审笔录结构", "仅为非正式沟通"]
  }}
}}

无我方当事人：
{{
  "validation_passed": false,
  "extracted_events": [],
  "processing_notes": {{
    "error": "NO_OUR_PARTY_IDENTIFIED",
    "total_tasks_found": 0,
    "our_party_role": null,
    "potential_issues": ["identified_parties中无我方客户"]
  }}
}}
</error_handling>

<examples>
示例1 - 标准庭审笔录（有我方任务）：
输入文档：庭审笔录 案号（2025）京0105民初123号 案由合同纠纷 原告阿里巴巴公司 被告腾讯公司 法官针对原告主张的损失原告代理人你们在庭后三日内补充提交2023年度的详细财务流水 原告代理人好的 法官被告你们在庭后一周内书面说明一下服务器的维护记录 被告代理人收到
识别参与方：[{{"name":"阿里巴巴","client_resolution":{{"status":"MATCH_FOUND","client_name":"阿里巴巴（中国）有限公司"}}}}]
当前时间：2025-03-25T14:30:00+08:00

输出：
{{
  "validation_passed": true,
  "extracted_events": [
    {{
      "event_type": "post_hearing_task",
      "raw_title": "补充提交2023年度的详细财务流水",
      "raw_date_time": "2025-03-28T09:00:00+08:00",
      "raw_location": null,
      "related_party_name": "阿里巴巴（中国）有限公司",
      "note": "（2025）京0105民初123号阿里巴巴与腾讯公司合同纠纷",
      "confidence": 0.95,
      "task_details": {{
        "task_assignor": "法官",
        "task_context": "针对原告主张的损失需要补充证据→三日内→2025-03-28T09:00:00+08:00",
        "attribution_confidence": 0.98
      }}
    }}
  ],
  "processing_notes": {{
    "dialogue_participants": ["法官", "原告代理人", "被告代理人"],
    "case_info_extracted": "（2025）京0105民初123号合同纠纷",
    "total_tasks_found": 1,
    "our_party_role": "原告"
  }}
}}

示例2 - 非正式沟通（无效文档）：
输入文档：王律师上次开庭法官提到的阿里巴巴的证据我们准备得怎么样了下周就要交了
识别参与方：[{{"name":"阿里巴巴","client_resolution":{{"status":"MATCH_FOUND","client_name":"阿里巴巴（中国）有限公司"}}}}]

输出：
{{
  "validation_passed": false,
  "extracted_events": [],
  "processing_notes": {{
    "error": "NOT_HEARING_TRANSCRIPT",
    "total_tasks_found": 0,
    "extraction_completeness": "none",
    "potential_issues": ["缺少对话标识", "无正式庭审笔录结构", "仅为内部沟通提醒"]
  }}
}}
</examples>
"""


async def extract_post_hearing_tasks(
    state: AgentState, runtime: Runtime[Context]
) -> Dict[str, Any]:
    """Extract follow-up tasks from hearing transcripts."""
    # TODO: Validate for transcript-specific content
    # TODO: Extract action items and deadlines from transcript

    # Placeholder implementation
    extracted_events = [
        {
            "title": "Submit Evidence",
            "client_name": "Placeholder Client",
            "event_time": "2024-03-25T09:00:00",
            "location": "Office",
            "notes": "Evidence submission deadline from hearing transcript",
        }
    ]

    return {
        "validation_passed": True,
        "extracted_events": extracted_events,
    }
