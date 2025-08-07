"""Extract asset preservation/seizure expiration dates."""

from typing import Any, Dict, List, Optional, Literal
from langgraph.runtime import Runtime
from pydantic import BaseModel, Field
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from agent.utils.state import AgentState


class Context:
    """Context parameters for the agent."""

    pass


# Define the allowed string values using Literal for strong typing
AssetType = Literal["银行存款", "车辆", "不动产", "股权", "其他"]
PreservationMethod = Literal["查封", "冻结", "扣押"]
CalculationMethod = Literal["explicit_date", "calculated_from_period", "legal_default"]
CompletenessLevel = Literal["high", "medium", "low", "none"]


class AssetDetails(BaseModel):
    """Details specific to the preserved asset."""

    asset_type: AssetType = Field(description="资产的类型")
    preservation_method: PreservationMethod = Field(description="采取的保全方式")
    calculation_method: CalculationMethod = Field(description="保全到期日的计算方法")


class PreservationEvent(BaseModel):
    """Represents a single asset preservation event."""

    event_type: Literal["asset_preservation"] = Field(
        default="asset_preservation",
        description="事件类型，固定为 'asset_preservation'",
    )
    raw_title: str = Field(
        description="格式化的事件标题，例如：'腾讯公司和平路1号不动产查封冻结到期'"
    )
    raw_date_time: Optional[str] = Field(
        description="任务的绝对ISO日期时间字符串（格式：YYYY-MM-DDTHH:MM:SS+08:00），如果没有时间则为null"
    )
    raw_location: None = Field(default=None, description="地点信息，固定为null")
    related_party_name: Optional[str] = Field(description="关联的我方客户标准名称")
    note: Optional[str] = Field(description="案件概述信息，包含案号、当事人等")
    confidence: float = Field(description="提取结果的置信度，范围0.0到1.0")
    asset_details: AssetDetails


class ProcessingNotes(BaseModel):
    """Metadata about the extraction process and validation."""

    total_assets_found: int = Field(description="识别到的独立保全资产总数")
    case_number: Optional[str] = Field(description="从文书中提取的案号")
    validation_keywords: Optional[List[str]] = Field(
        description="提取过程中匹配到的关键验证词"
    )
    extraction_completeness: CompletenessLevel = Field(
        description="提取信息完整度的评估"
    )
    error: Optional[str] = Field(
        default=None, description="仅在处理失败时出现，描述错误类型"
    )
    potential_issues: Optional[List[str]] = Field(
        default=None, description="仅在处理失败时出现，描述潜在问题"
    )


class AssetPreservationOutput(BaseModel):
    """The final, validated output for asset preservation extraction."""

    validation_passed: bool = Field(
        description="文档是否被验证为有效的财产保全执行文书"
    )
    extracted_events: List[PreservationEvent] = Field(
        description="提取出的所有保全、查封、冻结、扣押事件列表。如果validation_passed为false，此列表必须为空。"
    )
    processing_notes: ProcessingNotes


PROMPT_EXTRACT_ASSET_PRESERVATION = """
<system>
你是LawTime法律AI助手的专业财产保全信息提取模块，专门从中文财产保全和执行文书中精确提取资产保全到期信息。你必须严格验证文书有效性，处理多项资产，确保输出格式与LangGraph工作流完全兼容。

重要：你必须将所有提取的日期转换为绝对的ISO日期时间字符串格式。
</system>

<task>
分析财产保全/执行文书，验证其有效性，识别所有被保全资产，并为每项资产计算保全到期日期。

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
文档必须满足以下条件才被认为是有效的财产保全执行文书：

文书类型标识：
- 标题关键词：保全告知书、执行裁定书、财产控制反馈、查封通知书、冻结通知书
- 措施关键词：查封、冻结、扣押、保全措施、财产控制、执行措施

结构特征要求：
- 包含案号信息（格式如：(2025)京0105执保0001号）
- 包含保全措施的具体描述
- 包含资产信息和时间期限
- 包含当事方信息

验证失败条件：
- 完全缺乏保全和执行相关关键词
- 仅为保全事宜的非正式讨论
- 缺少具体的保全措施和资产信息
- 非执行或保全性质的法律文档
</validation_criteria>

<legal_preservation_periods>
中国法律规定的保全期限标准（当文书未明确期限时适用）：

1. 银行存款冻结：1年
2. 动产查封/扣押：2年  
3. 不动产查封：3年
4. 其他财产权冻结：3年

计算规则：
- 保全到期日 = 保全开始日期 + 法定期限 - 1日
- 转换为ISO格式：YYYY-MM-DDTHH:MM:SS+08:00
- 到期时间默认为09:00:00
- 示例：2025年7月8日开始 + 1年 = 2026-07-07T09:00:00+08:00
</legal_preservation_periods>

<extraction_rules>
资产提取和处理规则：

1. **资产识别**:
   - 逐项分析每个独立的保全措施
   - 区分不同类型资产：不动产、银行存款、股权、其他财产
   - 提取完整的资产描述信息

2. **日期处理**:
   - 优先使用文书中明确的到期日期
   - 如仅有期限描述，结合开始日期计算
   - 如无明确期限，按legal_preservation_periods计算

3. **标题构建 (raw_title)**:
   - 格式：{资产简要描述}查封冻结到期
   - 示例：腾讯公司和平路1号不动产查封冻结到期

4. **案件信息 (note)**:
   - 提取案号、当事人、案由信息
   - 格式：(案号)当事人vs当事人案由纠纷

5. **客户关联 (related_party_name)**:
   - 从identified_parties中选择我方客户
   - 使用status为MATCH_FOUND或NEW_CLIENT_PROPOSED的实体
</extraction_rules>

<reasoning_process>
执行以下分析步骤：

步骤1 - 输入验证：
- 检查document_text和identified_parties数据完整性
- 验证输入格式正确性

步骤2 - 文书类型验证：
- 根据validation_criteria检查保全文书特征
- 确认包含必要的保全措施关键词
- 验证文书结构完整性

步骤3 - 客户关系确认：
- 在identified_parties中定位我方客户
- 确认客户在保全案件中的角色
- 提取标准化客户名称

步骤4 - 案件信息提取：
- 提取案号、案由、当事人信息
- 构建标准化案件概述

步骤5 - 资产逐项处理：
- 识别每项独立的保全资产
- 提取资产描述、开始日期、期限信息
- 计算每项资产的到期日期
- 为每项资产创建独立事件对象

步骤6 - 质量检查：
- 验证日期计算的准确性
- 检查资产信息的完整性
- 确保输出格式符合要求
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
    "total_assets_found": 0,
    "extraction_completeness": "none",
    "potential_issues": ["文档文本为空或格式错误"]
  }}
}}

非保全执行文档：
{{
  "validation_passed": false,
  "extracted_events": [],
  "processing_notes": {{
    "error": "NOT_PRESERVATION_DOCUMENT",
    "total_assets_found": 0,
    "extraction_completeness": "none",
    "potential_issues": ["缺少保全执行关键词", "非保全性质文档"]
  }}
}}

无保全资产信息：
{{
  "validation_passed": false,
  "extracted_events": [],
  "processing_notes": {{
    "error": "NO_ASSETS_FOUND",
    "total_assets_found": 0,
    "case_number": "提取的案号(如有)",
    "extraction_completeness": "low",
    "potential_issues": ["识别为保全文书但无具体资产信息"]
  }}
}}
</error_handling>

<examples>
示例1 - 标准保全告知书：
输入文档：(2025)京0105执保0001号保全告知书 阿里巴巴与腾讯合同纠纷一案 采取以下保全措施 1.查封腾讯公司名下和平路1号不动产查封起止日期2025年7月8日至2028年7月7日 2.冻结腾讯公司银行存款32635.22元冻结起始日期2025年7月8日冻结期限1年
识别参与方：[{{"name":"阿里巴巴（中国）有限公司","client_resolution":{{"status":"MATCH_FOUND","client_name":"阿里巴巴（中国）有限公司"}}}}]

输出：
{{
  "validation_passed": true,
  "extracted_events": [
    {{
      "event_type": "asset_preservation",
      "raw_title": "腾讯公司和平路1号不动产查封冻结到期",
      "raw_date_time": "2028-07-07T09:00:00+08:00",
      "raw_location": null,
      "related_party_name": "阿里巴巴（中国）有限公司",
      "note": "(2025)京0105执保0001号阿里巴巴与腾讯合同纠纷",
      "confidence": 0.98,
      "asset_details": {{
        "asset_type": "不动产",
        "preservation_method": "查封", 
        "calculation_method": "explicit_date"
      }}
    }},
    {{
      "event_type": "asset_preservation", 
      "raw_title": "腾讯公司银行存款查封冻结到期",
      "raw_date_time": "2026-07-07T09:00:00+08:00",
      "raw_location": null,
      "related_party_name": "阿里巴巴（中国）有限公司",
      "note": "(2025)京0105执保0001号阿里巴巴与腾讯合同纠纷",
      "confidence": 0.95,
      "asset_details": {{
        "asset_type": "银行存款",
        "preservation_method": "冻结",
        "calculation_method": "calculated_from_period"
      }}
    }}
  ],
  "processing_notes": {{
    "total_assets_found": 2,
    "case_number": "(2025)京0105执保0001号",
    "validation_keywords": ["保全告知书", "查封", "冻结", "保全措施"],
    "extraction_completeness": "high"
  }}
}}

示例2 - 非保全文档：
输入文档：王律师，关于阿里巴巴和腾讯的财产保全事宜，我想约个时间讨论一下能否置换解封。
识别参与方：[{{"name":"阿里巴巴","client_resolution":{{"status":"MATCH_FOUND","client_name":"阿里巴巴（中国）有限公司"}}}}]

输出：
{{
  "validation_passed": false,
  "extracted_events": [],
  "processing_notes": {{
    "error": "NOT_PRESERVATION_DOCUMENT", 
    "total_assets_found": 0,
    "extraction_completeness": "none",
    "potential_issues": ["非正式沟通内容", "缺少保全文书结构", "仅为保全事宜讨论"]
  }}
}}
</examples>
"""


async def extract_asset_preservation(
    state: AgentState, runtime: Runtime[Context]
) -> Dict[str, Any]:
    """Extract asset preservation/seizure expiration dates."""
    # TODO: Validate for asset preservation keywords
    # TODO: Extract preservation order deadlines

    # Placeholder implementation
    extracted_events = [
        {
            "title": "Asset Preservation Order Expires",
            "client_name": "Placeholder Client",
            "event_time": "2024-04-01T09:00:00",
            "location": "Court",
            "notes": "Asset preservation order expiration extracted from document",
        }
    ]

    return {
        "validation_passed": True,
        "extracted_events": extracted_events,
    }
