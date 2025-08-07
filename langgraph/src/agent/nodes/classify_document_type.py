"""Classify legal documents into specialized categories."""

from typing import Any, Dict, List, Optional, Literal
from langgraph.runtime import Runtime
from pydantic import BaseModel, Field
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from agent.utils.state import AgentState


class Context:
    """Context parameters for the agent."""

    pass


from typing import List, Literal
from pydantic import BaseModel, Field

# Define the five allowed categories using Literal
ClassificationCategory = Literal[
    "COURT_HEARING", "CONTRACT", "ASSET_PRESERVATION", "HEARING_TRANSCRIPT", "GENERAL"
]


class DocumentClassification(BaseModel):
    """Data model for the output of the document classification task."""

    classification: ClassificationCategory = Field(
        description="The single most appropriate category for the document."
    )
    confidence: float = Field(
        description="The confidence score of the classification, from 0.0 to 1.0."
    )
    key_indicators: List[str] = Field(
        description="A list of keywords or phrases from the text that justify the classification."
    )
    reasoning: str = Field(
        description="A brief, one-sentence explanation for the chosen classification."
    )


PROMPT_CLASSIFY_DOCUMENT = """
<system>
你是LawTime法律AI助手的文档分类专家，负责准确识别中文法律文档的类型。你必须基于文档的核心法律目的进行分类，输出格式必须与LangGraph工作流完全兼容。
</system>

<task>
分析提供的法律文档文本，根据其主要法律目的和功能特征，将其归类到预定义的5个类别中的一个。
</task>

<context>
<document_text>
{raw_text}
</document_text>
</context>

<classification_rules>
严格按照以下决策树进行分类：

1. **COURT_HEARING** - 庭审日程相关文档
   关键词：传票、出庭通知、开庭、听证、谈话、质证、应到时间、审判庭
   典型文档：开庭传票、出庭通知书、听证会通知、质证通知书
   
2. **CONTRACT** - 法律协议合同文档  
   关键词：协议、合同、甲方、乙方、有效期、协议期限、条款
   典型文档：各类合同协议、委托协议、服务协议、顾问协议
   
3. **ASSET_PRESERVATION** - 财产保全执行文档
   关键词：保全告知、执行裁定、查封、冻结、扣押、财产控制、保全措施
   典型文档：保全告知书、执行裁定书、财产控制反馈表、查封通知
   
4. **HEARING_TRANSCRIPT** - 庭审记录文档
   关键词：庭审笔录、谈话笔录、质证笔录、法官说、原告代理人、被告代理人
   典型特征：对话格式、发言人标识、庭审过程记录
   
5. **GENERAL** - 通用法律文档
   适用于：不符合上述4类的其他法律相关文档
   包括：法律咨询、案例分析、内部备忘录、法规通知等
</classification_rules>

<reasoning_process>
执行以下分析步骤：

步骤1 - 输入验证：
- 检查document_text是否为空或长度不足
- 如为空或无效，返回错误状态

步骤2 - 文本预处理：
- 清理多余空格和特殊字符
- 标准化关键法律术语

步骤3 - 特征提取：
- 识别核心法律关键词
- 分析文档结构和格式特征  
- 确定文档的主要法律功能

步骤4 - 分类决策：
- 按优先级顺序匹配classification_rules中的类别
- 优先匹配专门类别（1-4），最后考虑GENERAL
- 选择匹配度最高的类别

步骤5 - 置信度评估：
- 评估分类结果的可信度（0.0-1.0）
- 低置信度（<0.7）应标记为需要人工审核
</reasoning_process>

{format_instructions}

<error_handling>
如遇输入无效，返回以下格式：

{{
  "classification": "GENERAL",
  "confidence": 0.0,
  "key_indicators": [],
  "reasoning": "文档文本为空或无效，无法进行分类",
  "error": "EMPTY_OR_INVALID_TEXT"
}}
</error_handling>

<examples>
示例1 - 开庭传票：
输入：威海市文登区人民法院开庭传票 案号(2025)鲁1003民初0001号 被传唤人：阿里巴巴公司 传唤事由：开庭 应到时间：2025年8月26日13:40

输出：
{{
  "classification": "COURT_HEARING",
  "confidence": 0.95,
  "key_indicators": ["开庭传票", "传唤事由", "应到时间", "开庭"],
  "reasoning": "包含传票标题、传唤事由和明确的开庭时间，典型的庭审日程安排文档"
}}

示例2 - 法律顾问协议：
输入：聘请常年法律顾问协议书 甲方：阿里巴巴公司 乙方：朝阳律师事务所 协议有效期：2025年6月1日至2027年5月31日

输出：
{{
  "classification": "CONTRACT", 
  "confidence": 0.92,
  "key_indicators": ["协议书", "甲方", "乙方", "协议有效期"],
  "reasoning": "明确的协议标题，包含甲乙方和有效期条款，典型的合同协议文档"
}}

示例3 - 保全告知书：
输入：保全告知书 查封深圳腾讯公司名下和平路1号不动产，查封起止日期2025年7月8日至2028年7月7日

输出：
{{
  "classification": "ASSET_PRESERVATION",
  "confidence": 0.98,
  "key_indicators": ["保全告知书", "查封", "不动产", "查封起止日期"],
  "reasoning": "保全告知书标题，包含具体的查封措施和期限，典型的财产保全文档"
}}
</examples>
"""


async def classify_document_type(
    state: AgentState, runtime: Runtime[Context]
) -> Dict[str, Any]:
    """Perform quick analysis to determine document category."""
    # TODO: Make focused LLM call to classify document

    # Placeholder implementation - cycle through types for testing
    return {
        "document_type": "CONTRACT",  # Could be CONTRACT, COURT_HEARING, ASSET_PRESERVATION, HEARING_TRANSCRIPT, GENERAL
    }
