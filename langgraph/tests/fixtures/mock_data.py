"""Mock data for testing the LawTime agentic workflow.

This module provides realistic test data that matches the API specification
and covers all workflow paths (OCR and ASR) with various document types.
"""

from typing import Dict, Any


# === MOCK CLIENT DATA ===

MOCK_CLIENT_LIST = [
    {
        "id": 101,
        "client_name": "ACME Corporation"
    },
    {
        "id": 102,
        "client_name": "阿里巴巴（中国）有限公司"
    },
    {
        "id": 103,
        "client_name": "New Horizons LLC"
    }
]


# === MOCK API REQUESTS ===

def get_mock_ocr_request() -> Dict[str, Any]:
    """Mock OCR request payload matching API specification."""
    return {
        "source_type": "ocr",
        "source_file_urls": [
            "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/summon1.png",
            "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/summon2.jpg",
        ],
        "client_list": MOCK_CLIENT_LIST,
    }


def get_mock_asr_request() -> Dict[str, Any]:
    """Mock ASR request payload matching API specification."""
    return {
        "source_type": "asr",
        "source_file_urls": [
            "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/audio1.m4a"
        ],
        "client_list": MOCK_CLIENT_LIST,
    }


# === MOCK DOCUMENT TEXTS ===

class MockDocuments:
    """Collection of mock document texts for different types."""
    
    # Court Hearing Document (Chinese)
    COURT_HEARING_CN = """威海市文登区人民法院 开庭传票
案 号 (2025)鲁1003民初0001号
案 由 建设工程施工合同纠纷
被传唤人 阿里巴巴（中国）有限公司
传唤事由 开庭
应到时间 2025年08月26日 13:40
应到处所 开发区第一审判庭
"""

    # Contract Document (Chinese)
    CONTRACT_CN = """聘请常年法律顾问协议书
甲方: 阿里巴巴（中国）有限公司
乙方: 北京朝阳律师事务所
八、本协议有效期贰年,自2025年6月1日起至2027年5月31日止。
"""

    # Asset Preservation Document (Chinese)
    ASSET_PRESERVATION_CN = """(2025）京0105执保0001号 保全告知书
阿里巴巴（中国）有限公司与深圳市腾讯计算机系统有限公司合同纠纷一案…采取以下保全措施:
1. 查封深圳市腾讯计算机系统有限公司名下位于和平路1号不动产(查封起止日期:2025年7月8日至2028年7月7日);
2. 冻结深圳市腾讯计算机系统有限公司名下网络账户及银行存款等共计32635.22元，冻结起始日期2025年7月8日,冻结期限为1年。
"""

    # Hearing Transcript Document (Chinese)
    HEARING_TRANSCRIPT_CN = """庭审笔录
案号：（2025）京0105民初123号
案由：合同纠纷
原告：阿里巴巴（中国）有限公司
被告：深圳市腾讯计算机系统有限公司
…
法官：针对原告主张的损失，原告代理人，你们在庭后三日内，补充提交2023年度的详细财务流水。
原告代理人：好的。
法官：被告，你们在庭后一周内，书面说明一下服务器的维护记录。
被告代理人：收到。
…
"""

    # General Task Document (Chinese)
    GENERAL_TASK_CN = """王律师，关于阿里巴巴的案子有两件事需要处理：
1. 请审核一下附件里的这份证据清单，看看有没有问题。
2. 请在明天下午之前，联系一下对方律师李明，确认一下他是否收到了我们的函件。
"""

    # Voice Note Transcript (Chinese)
    VOICE_NOTE_CN = "提醒我明天上午跟进一下阿里巴巴那个案子，另外下午两点在星巴克跟张三开个会。"

    # Invalid Documents for Testing Validation
    INVALID_COURT_HEARING = "韩律师，提醒一下，关于阿里巴巴的案子，对方律师想跟我们约个时间讨论一下证据材料。"
    INVALID_CONTRACT = "王律师，关于阿里巴巴和朝阳所的法律顾问合同，我想约个时间讨论一下明年的服务范围是否需要调整。"
    INVALID_ASSET_PRESERVATION = "王律师，关于阿里巴巴和腾讯的财产保全事宜，我想约个时间讨论一下能否置换解封。"


# === MOCK EXTRACTED PARTIES ===

class MockExtractedParties:
    """Mock party extraction results."""
    
    ALIBABA_MATCH_FOUND = [
        {
            "name": "阿里巴巴（中国）有限公司",
            "role": "被传唤人",
            "client_resolution": {
                "status": "MATCH_FOUND",
                "client_id": 102,
                "client_name": "阿里巴巴（中国）有限公司"
            }
        }
    ]
    
    NEW_CLIENT_PROPOSED = [
        {
            "name": "Global Industries Inc",
            "role": "被告",
            "client_resolution": {
                "status": "NEW_CLIENT_PROPOSED",
                "client_id": None,
                "client_name": "Global Industries Inc"
            }
        }
    ]
    
    MULTI_PARTY = [
        {
            "name": "阿里巴巴（中国）有限公司",
            "role": "原告",
            "client_resolution": {
                "status": "MATCH_FOUND",
                "client_id": 102,
                "client_name": "阿里巴巴（中国）有限公司"
            }
        },
        {
            "name": "深圳市腾讯计算机系统有限公司",
            "role": "被告",
            "client_resolution": {
                "status": "OTHER_PARTY",
                "client_id": None,
                "client_name": None
            }
        }
    ]


# === MOCK EXTRACTED EVENTS ===

class MockExtractedEvents:
    """Mock extracted event results for different document types."""
    
    COURT_HEARING = [
        {
            "event_type": "court_hearing",
            "raw_title": "开庭",
            "raw_date_time": "2025年08月26日 13:40",
            "raw_location": "威海市文登区人民法院开发区第一审判庭",
            "related_party_name": "阿里巴巴（中国）有限公司",
            "note": "(2025)鲁1003民初0001号建设工程施工合同纠纷"
        }
    ]
    
    CONTRACT_RENEWAL = [
        {
            "event_type": "contract_renewal",
            "raw_title": "法律顾问合同到期",
            "raw_date_time": "2027年5月31日",
            "raw_location": None,
            "related_party_name": "阿里巴巴（中国）有限公司",
            "note": "北京朝阳律师事务所与阿里巴巴（中国）有限公司签订的聘请常年法律顾问协议书"
        }
    ]
    
    ASSET_PRESERVATION = [
        {
            "event_type": "asset_preservation",
            "raw_title": "腾讯公司和平路1号不动产查封冻结到期",
            "raw_date_time": "2028年7月7日",
            "raw_location": None,
            "related_party_name": "阿里巴巴（中国）有限公司",
            "note": "（2025）京0105执保0001号阿里巴巴与腾讯合同纠纷"
        },
        {
            "event_type": "asset_preservation",
            "raw_title": "腾讯公司网络账户及银行存款查封冻结到期",
            "raw_date_time": "2026年7月7日",
            "raw_location": None,
            "related_party_name": "阿里巴巴（中国）有限公司",
            "note": "（2025）京0105执保0001号阿里巴巴与腾讯合同纠纷"
        }
    ]
    
    POST_HEARING_TASKS = [
        {
            "event_type": "post_hearing_task",
            "raw_title": "提交2023年度的详细财务流水",
            "raw_date_time": "三日内",
            "raw_location": None,
            "related_party_name": "阿里巴巴（中国）有限公司",
            "note": "（2025）京0105民初123号阿里巴巴与腾讯公司合同纠纷"
        }
    ]
    
    GENERAL_TASKS = [
        {
            "event_type": "general_task",
            "raw_title": "审核证据清单",
            "raw_date_time": None,
            "raw_location": None,
            "related_party_name": "阿里巴巴（中国）有限公司",
            "note": None
        },
        {
            "event_type": "general_task",
            "raw_title": "联系李明，确认函件接收情况",
            "raw_date_time": "明天下午之前",
            "raw_location": None,
            "related_party_name": "阿里巴巴（中国）有限公司",
            "note": "联系人：对方律师李明"
        }
    ]
    
    VOICE_NOTE_TASKS = [
        {
            "event_type": "general_task",
            "raw_title": "跟进阿里巴巴案子",
            "raw_date_time": "明天上午",
            "raw_location": None,
            "related_party_name": "阿里巴巴（中国）有限公司",
            "note": "提醒我明天上午跟进一下阿里巴巴那个案子"
        },
        {
            "event_type": "general_task",
            "raw_title": "与张三开会",
            "raw_date_time": "下午两点",
            "raw_location": "星巴克",
            "related_party_name": "张三",
            "note": "下午两点在星巴克跟张三开个会"
        }
    ]


# === MOCK FINAL PROPOSED TASKS ===

class MockProposedTasks:
    """Mock final proposed task responses matching API specification."""
    
    MATCH_FOUND_RESPONSE = {
        "proposed_tasks": [
            {
                "title": "Court Hearing",
                "event_time": "2025-08-26T13:40:00+08:00",
                "location": "威海市文登区人民法院开发区第一审判庭",
                "note": "Case number: (2025)鲁1003民初0001号建设工程施工合同纠纷",
                "client_resolution": {
                    "status": "MATCH_FOUND",
                    "client_id": 102,
                    "client_name": "阿里巴巴（中国）有限公司"
                }
            }
        ]
    }
    
    NEW_CLIENT_PROPOSED_RESPONSE = {
        "proposed_tasks": [
            {
                "title": "Court Hearing",
                "event_time": "2025-09-05T09:00:00+08:00",
                "location": "Chaoyang Court Room 5",
                "note": "Case number: (2025)J0105S0001",
                "client_resolution": {
                    "status": "NEW_CLIENT_PROPOSED",
                    "client_id": None,
                    "client_name": "Global Industries Inc"
                }
            }
        ]
    }
    
    AI_PROCESSING_FAILED_RESPONSE = {
        "error": {
            "code": "AI_PROCESSING_FAILED",
            "message": "The AI agent could not process the user upload."
        }
    }


# === MOCK AGENT STATE DATA ===

def get_mock_initial_state(source_type: str = "ocr") -> Dict[str, Any]:
    """Get mock initial agent state."""
    return {
        "source_type": source_type,
        "source_file_urls": get_mock_ocr_request()["source_file_urls"] if source_type == "ocr" else get_mock_asr_request()["source_file_urls"],
        "client_list": MOCK_CLIENT_LIST,
        "raw_text": "",
        "extracted_events": [],
        "proposed_tasks": [],
        "identified_parties": None,
        "document_type": None,
        "validation_passed": None,
    }


def get_mock_ocr_state_after_text_extraction() -> Dict[str, Any]:
    """Get mock state after OCR text extraction."""
    state = get_mock_initial_state("ocr")
    state["raw_text"] = MockDocuments.COURT_HEARING_CN
    return state


def get_mock_asr_state_after_transcription() -> Dict[str, Any]:
    """Get mock state after ASR transcription."""
    state = get_mock_initial_state("asr")
    state["raw_text"] = MockDocuments.VOICE_NOTE_CN
    return state


# === MOCK VALIDATION RESULTS ===

class MockValidationResults:
    """Mock validation results for specialist extractors."""
    
    VALID_COURT_HEARING = {
        "validation_passed": True,
        "extracted_events": MockExtractedEvents.COURT_HEARING
    }
    
    INVALID_COURT_HEARING = {
        "validation_passed": False,
        "extracted_events": []
    }
    
    VALID_CONTRACT = {
        "validation_passed": True,
        "extracted_events": MockExtractedEvents.CONTRACT_RENEWAL
    }
    
    INVALID_CONTRACT = {
        "validation_passed": False,
        "extracted_events": []
    }


# === TEST SCENARIOS ===

class TestScenarios:
    """Complete test scenarios combining all mock data."""
    
    @staticmethod
    def get_court_hearing_scenario() -> Dict[str, Any]:
        """Complete OCR court hearing scenario."""
        return {
            "request": get_mock_ocr_request(),
            "document_text": MockDocuments.COURT_HEARING_CN,
            "document_type": "COURT_HEARING",
            "identified_parties": MockExtractedParties.ALIBABA_MATCH_FOUND,
            "extracted_events": MockExtractedEvents.COURT_HEARING,
            "expected_response": MockProposedTasks.MATCH_FOUND_RESPONSE
        }
    
    @staticmethod
    def get_contract_renewal_scenario() -> Dict[str, Any]:
        """Complete OCR contract renewal scenario."""
        return {
            "request": get_mock_ocr_request(),
            "document_text": MockDocuments.CONTRACT_CN,
            "document_type": "CONTRACT",
            "identified_parties": MockExtractedParties.ALIBABA_MATCH_FOUND,
            "extracted_events": MockExtractedEvents.CONTRACT_RENEWAL,
            "expected_response": MockProposedTasks.MATCH_FOUND_RESPONSE
        }
    
    @staticmethod
    def get_voice_note_scenario() -> Dict[str, Any]:
        """Complete ASR voice note scenario."""
        return {
            "request": get_mock_asr_request(),
            "transcribed_text": MockDocuments.VOICE_NOTE_CN,
            "extracted_events": MockExtractedEvents.VOICE_NOTE_TASKS,
            "expected_response": MockProposedTasks.MATCH_FOUND_RESPONSE
        }
    
    @staticmethod
    def get_validation_failure_scenario() -> Dict[str, Any]:
        """Scenario where specialist validation fails and fallback is used."""
        return {
            "request": get_mock_ocr_request(),
            "document_text": MockDocuments.INVALID_COURT_HEARING,
            "document_type": "COURT_HEARING",
            "identified_parties": MockExtractedParties.ALIBABA_MATCH_FOUND,
            "validation_result": MockValidationResults.INVALID_COURT_HEARING,
            "fallback_events": MockExtractedEvents.GENERAL_TASKS,
            "expected_response": MockProposedTasks.MATCH_FOUND_RESPONSE
        }
