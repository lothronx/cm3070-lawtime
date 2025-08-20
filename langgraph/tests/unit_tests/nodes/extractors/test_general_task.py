"""Unit tests for extract_general_task specialist extractor."""

import pytest
from unittest.mock import Mock, patch

from agent.nodes.extractors.general_task import (
    extract_general_task,
    GeneralTaskOutput,
    ExtractedEvent,
    ProcessingNotes,
    TaskDetails,
)
from tests.fixtures.mock_data import (
    get_mock_initial_state,
    MockDocuments,
    MockExtractedParties,
)


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


@pytest.fixture
def sample_general_task_event():
    """Sample general task event with all required fields."""
    return ExtractedEvent(
        event_type="general_task",
        raw_title="审核证据清单",
        raw_date_time=None,
        raw_location=None,
        related_party_name="阿里巴巴（中国）有限公司",
        note="检查附件中的证据清单是否有问题",
        confidence=0.95,
        task_details=TaskDetails(
            urgency_level="normal",
            action_type="文件审核",
            context_clues=["审核", "证据清单", "附件"]
        )
    )


@pytest.fixture
def sample_contact_task_event():
    """Sample contact task event with deadline."""
    return ExtractedEvent(
        event_type="general_task",
        raw_title="联系李明确认函件接收",
        raw_date_time="2025-03-26T14:00:00+08:00",
        raw_location=None,
        related_party_name="阿里巴巴（中国）有限公司",
        note="联系对方律师李明，确认函件接收情况",
        confidence=0.92,
        task_details=TaskDetails(
            urgency_level="urgent",
            action_type="对外联系",
            context_clues=["联系", "明天下午之前", "对方律师"]
        )
    )


@pytest.fixture
def sample_valid_general_task_output(sample_general_task_event, sample_contact_task_event):
    """Sample valid general task extraction output with multiple tasks."""
    return GeneralTaskOutput(
        validation_passed=True,
        extracted_events=[sample_general_task_event, sample_contact_task_event],
        processing_notes=ProcessingNotes(
            total_tasks_identified=2,
            action_keywords_found=["处理", "审核", "联系", "确认"],
            client_associations="阿里巴巴案件相关",
            extraction_completeness="high",
            error=None,
            potential_issues=None
        )
    )


@pytest.fixture
def sample_invalid_general_task_output():
    """Sample invalid general task extraction output."""
    return GeneralTaskOutput(
        validation_passed=False,
        extracted_events=[],
        processing_notes=ProcessingNotes(
            total_tasks_identified=0,
            extraction_completeness="none",
            action_keywords_found=None,
            client_associations=None,
            error="NO_ACTIONABLE_TASKS",
            potential_issues=["仅为信息告知", "无行动指示词汇", "缺少明确的执行指令"]
        )
    )


@pytest.fixture
def mock_state_with_general_task_document():
    """Mock state with general task document and identified parties."""
    state = get_mock_initial_state("ocr")
    state["raw_text"] = MockDocuments.GENERAL_TASK_CN
    state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
    state["document_type"] = "GENERAL"
    state["dashscope_api_key"] = "test_api_key"
    state["current_datetime"] = "2025-03-25T10:00:00+08:00"
    return state


class TestExtractGeneralTask:
    """Test cases for extract_general_task specialist extractor."""
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_valid_general_task_document(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_valid_general_task_output, mock_state_with_general_task_document
    ):
        """Test successful extraction from valid general task document."""
        # Arrange
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_valid_general_task_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_general_task(mock_state_with_general_task_document, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        # Should pass validation for valid general task document
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 2
        
        # Verify first task - document review
        event1 = result["extracted_events"][0]
        assert event1["event_type"] == "general_task"
        assert event1["raw_title"] == "审核证据清单"
        assert event1["raw_date_time"] is None
        assert event1["raw_location"] is None
        assert event1["related_party_name"] == "阿里巴巴（中国）有限公司"
        assert event1["note"] == "检查附件中的证据清单是否有问题"
        assert event1["confidence"] == 0.95
        assert event1["task_details"]["urgency_level"] == "normal"
        assert event1["task_details"]["action_type"] == "文件审核"
        
        # Verify second task - contact task with deadline
        event2 = result["extracted_events"][1]
        assert event2["event_type"] == "general_task"
        assert event2["raw_title"] == "联系李明确认函件接收"
        assert event2["raw_date_time"] == "2025-03-26T14:00:00+08:00"
        assert event2["related_party_name"] == "阿里巴巴（中国）有限公司"
        assert event2["task_details"]["urgency_level"] == "urgent"
        assert event2["task_details"]["action_type"] == "对外联系"
        
        # Verify LLM was called with correct parameters
        mock_llm_class.assert_called_once()
        call_kwargs = mock_llm_class.call_args.kwargs
        assert call_kwargs["model"] == "qwen3-30b-a3b-instruct-2507"
        assert call_kwargs["api_key"] == "test_api_key"
        assert call_kwargs["temperature"] == 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_fallback_for_failed_validation(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_general_task_event
    ):
        """Test general extractor as fallback when other extractors fail validation."""
        # Arrange - Use a document that failed another extractor's validation
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.INVALID_COURT_HEARING  # Failed court hearing validation
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"  # Routed to general after failure
        state["validation_passed"] = False  # Previous validation failed
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-03-25T10:00:00+08:00"
        
        # General extractor as fallback should still try to extract tasks
        fallback_output = GeneralTaskOutput(
            validation_passed=True,  # More lenient as fallback
            extracted_events=[sample_general_task_event],
            processing_notes=ProcessingNotes(
                total_tasks_identified=1,
                action_keywords_found=["约个时间", "讨论"],
                client_associations="阿里巴巴案件相关",
                extraction_completeness="medium",
                error=None,
                potential_issues=None
            )
        )
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=fallback_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # General extractor should be more lenient and extract what it can
        assert result["validation_passed"] is True  # As fallback, should be more accepting
        assert len(result["extracted_events"]) == 1
        
        # Verify event structure
        event = result["extracted_events"][0]
        assert event["event_type"] == "general_task"
        assert "raw_title" in event
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_multiple_general_tasks(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_valid_general_task_output
    ):
        """Test extraction of multiple general tasks from document."""
        # Arrange
        state = get_mock_initial_state("ocr")
        # Document contains two tasks: review evidence list + contact lawyer
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-03-25T10:00:00+08:00"
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_valid_general_task_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is True
        # Should extract multiple tasks:
        # 1. 审核证据清单
        # 2. 联系李明确认函件接收
        assert len(result["extracted_events"]) == 2
        
        # Verify both tasks have correct structure
        for event in result["extracted_events"]:
            assert isinstance(event, dict)
            assert event["event_type"] == "general_task"
            assert "raw_title" in event
            assert "task_details" in event
            assert "urgency_level" in event["task_details"]
            assert "action_type" in event["task_details"]
            assert "context_clues" in event["task_details"]
        
        # Verify specific task types
        task_titles = [event["raw_title"] for event in result["extracted_events"]]
        assert "审核证据清单" in task_titles
        assert "联系李明确认函件接收" in task_titles
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_task_with_deadline(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_contact_task_event
    ):
        """Test extraction of general task with deadline."""
        # Arrange
        state = get_mock_initial_state("ocr")
        # Contains "明天下午之前，联系一下对方律师李明"
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-03-25T10:00:00+08:00"
        
        deadline_output = GeneralTaskOutput(
            validation_passed=True,
            extracted_events=[sample_contact_task_event],
            processing_notes=ProcessingNotes(
                total_tasks_identified=1,
                action_keywords_found=["联系", "明天下午之前"],
                client_associations="阿里巴巴案件相关",
                extraction_completeness="high",
                error=None,
                potential_issues=None
            )
        )
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=deadline_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 1
        
        # Should extract deadline from task - converted to ISO format
        event = result["extracted_events"][0]
        assert event["raw_date_time"] == "2025-03-26T14:00:00+08:00"  # Tomorrow afternoon
        assert event["task_details"]["urgency_level"] == "urgent"
        assert "明天下午之前" in event["task_details"]["context_clues"]
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_task_without_deadline(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_general_task_event
    ):
        """Test extraction of general task without specific deadline."""
        # Arrange
        state = get_mock_initial_state("ocr")
        # Contains "请审核一下附件里的这份证据清单" - no specific deadline
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-03-25T10:00:00+08:00"
        
        no_deadline_output = GeneralTaskOutput(
            validation_passed=True,
            extracted_events=[sample_general_task_event],
            processing_notes=ProcessingNotes(
                total_tasks_identified=1,
                action_keywords_found=["审核", "处理"],
                client_associations="阿里巴巴案件相关",
                extraction_completeness="high",
                error=None,
                potential_issues=None
            )
        )
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=no_deadline_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 1
        
        # Should extract task even without deadline
        event = result["extracted_events"][0]
        assert event["raw_title"] == "审核证据清单"
        assert event["raw_date_time"] is None  # No specific deadline
        assert event["task_details"]["action_type"] == "文件审核"
        assert event["task_details"]["urgency_level"] == "normal"
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_task_with_contact_information(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_contact_task_event
    ):
        """Test extraction of task involving contact details."""
        # Arrange
        state = get_mock_initial_state("ocr")
        # Contains "联系一下对方律师李明"
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-03-25T10:00:00+08:00"
        
        contact_output = GeneralTaskOutput(
            validation_passed=True,
            extracted_events=[sample_contact_task_event],
            processing_notes=ProcessingNotes(
                total_tasks_identified=1,
                action_keywords_found=["联系", "对方律师"],
                client_associations="阿里巴巴案件相关",
                extraction_completeness="high",
                error=None,
                potential_issues=None
            )
        )
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=contact_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 1
        
        # Should capture contact information in task details
        event = result["extracted_events"][0]
        assert "李明" in event["raw_title"] or "李明" in event["note"]
        assert event["task_details"]["action_type"] == "对外联系"
        assert "对方律师" in event["task_details"]["context_clues"]
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_with_multiple_parties(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_general_task_event
    ):
        """Test extraction with multiple identified parties."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.MULTI_PARTY
        state["document_type"] = "GENERAL"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-03-25T10:00:00+08:00"
        
        multi_party_output = GeneralTaskOutput(
            validation_passed=True,
            extracted_events=[sample_general_task_event],
            processing_notes=ProcessingNotes(
                total_tasks_identified=1,
                action_keywords_found=["审核", "处理"],
                client_associations="多方案件相关",
                extraction_completeness="high",
                error=None,
                potential_issues=None
            )
        )
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=multi_party_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 1
        
        event = result["extracted_events"][0]
        assert isinstance(event, dict)
        # Should reference relevant party
        assert "related_party_name" in event
        assert event["related_party_name"] is not None
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_with_new_client_proposed(
        self, mock_parser_class, mock_llm_class, mock_runtime
    ):
        """Test extraction when new client is proposed."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.NEW_CLIENT_PROPOSED
        state["document_type"] = "GENERAL"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-03-25T10:00:00+08:00"
        
        new_client_event = ExtractedEvent(
            event_type="general_task",
            raw_title="审核证据清单",
            raw_date_time=None,
            raw_location=None,
            related_party_name="Global Industries Inc",  # New client
            note="检查附件中的证据清单是否有问题",
            confidence=0.90,
            task_details=TaskDetails(
                urgency_level="normal",
                action_type="文件审核",
                context_clues=["审核", "证据清单"]
            )
        )
        
        new_client_output = GeneralTaskOutput(
            validation_passed=True,
            extracted_events=[new_client_event],
            processing_notes=ProcessingNotes(
                total_tasks_identified=1,
                action_keywords_found=["审核", "处理"],
                client_associations="新客户 Global Industries Inc 相关",
                extraction_completeness="high",
                error=None,
                potential_issues=None
            )
        )
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=new_client_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 1
        
        event = result["extracted_events"][0]
        assert isinstance(event, dict)
        # Should reference the new client
        assert event["related_party_name"] == "Global Industries Inc"
    
    @pytest.mark.asyncio
    async def test_extract_with_empty_text(self, mock_runtime):
        """Test extraction with empty document text."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = ""
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-03-25T10:00:00+08:00"
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Empty text should fail validation
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_as_graceful_fallback(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_general_task_event
    ):
        """Test general extractor provides graceful fallback for any document."""
        # Arrange - Try with various document types that might fail other extractors
        test_documents = [
            MockDocuments.COURT_HEARING_CN,
            MockDocuments.CONTRACT_CN,
            MockDocuments.ASSET_PRESERVATION_CN,
            MockDocuments.HEARING_TRANSCRIPT_CN,
            "Some random legal text that doesn't fit other categories"
        ]
        
        # Setup mock to return graceful fallback output
        graceful_output = GeneralTaskOutput(
            validation_passed=True,  # Fallback should be graceful
            extracted_events=[sample_general_task_event],
            processing_notes=ProcessingNotes(
                total_tasks_identified=1,
                action_keywords_found=["处理", "准备"],
                client_associations="案件相关",
                extraction_completeness="medium",
                error=None,
                potential_issues=None
            )
        )
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=graceful_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        for doc_text in test_documents:
            state = get_mock_initial_state("ocr")
            state["raw_text"] = doc_text
            state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
            state["document_type"] = "GENERAL"
            state["dashscope_api_key"] = "test_api_key"
            state["current_datetime"] = "2025-03-25T10:00:00+08:00"
            
            # Act
            result = await extract_general_task(state, mock_runtime)
            
            # Assert
            assert "validation_passed" in result
            assert "extracted_events" in result
            # General extractor should handle any text gracefully
            assert isinstance(result["validation_passed"], bool)
            assert isinstance(result["extracted_events"], list)
            
            # As fallback, should typically succeed
            assert result["validation_passed"] is True
            assert len(result["extracted_events"]) >= 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_preserves_state(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_valid_general_task_output
    ):
        """Test that extraction preserves original state."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-03-25T10:00:00+08:00"
        
        original_raw_text = state["raw_text"]
        original_parties = state.get("identified_parties")
        original_doc_type = state.get("document_type")
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_valid_general_task_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert - Only validation_passed and extracted_events should be returned
        assert len(result.keys()) == 2
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Original state should remain unchanged
        assert state["raw_text"] == original_raw_text
        assert state.get("identified_parties") == original_parties
        assert state.get("document_type") == original_doc_type
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_return_type_structure(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_valid_general_task_output
    ):
        """Test extraction returns proper structure."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-03-25T10:00:00+08:00"
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_valid_general_task_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        assert isinstance(result, dict)
        assert len(result) == 2
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        # Verify event structure when validation passes
        if result["validation_passed"]:
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                assert "event_type" in event
                assert "raw_title" in event
                assert "task_details" in event
                assert isinstance(event["task_details"], dict)
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_validation_is_lenient(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_general_task_event
    ):
        """Test that general extractor validation is more lenient than specialists."""
        # Arrange - Test with various types of text
        test_cases = [
            (MockDocuments.GENERAL_TASK_CN, True),  # Should pass
            (MockDocuments.INVALID_COURT_HEARING, True),  # Should potentially pass (failed other validation)
            ("王律师，请处理一下这个案子的相关文件。", True),  # Generic legal task
            ("提醒：明天有个会议需要参加。", True),  # Simple reminder
            ("This is just an informational notice.", False)  # Pure information, no tasks
        ]
        
        # Setup lenient output for most cases
        lenient_output = GeneralTaskOutput(
            validation_passed=True,
            extracted_events=[sample_general_task_event],
            processing_notes=ProcessingNotes(
                total_tasks_identified=1,
                action_keywords_found=["处理", "提醒"],
                client_associations="案件相关",
                extraction_completeness="medium",
                error=None,
                potential_issues=None
            )
        )
        
        # Setup invalid output for pure information
        invalid_output = GeneralTaskOutput(
            validation_passed=False,
            extracted_events=[],
            processing_notes=ProcessingNotes(
                total_tasks_identified=0,
                extraction_completeness="none",
                action_keywords_found=None,
                client_associations=None,
                error="NO_ACTIONABLE_TASKS",
                potential_issues=["仅为信息告知"]
            )
        )
        
        mock_llm = Mock()
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        for text, should_pass in test_cases:
            state = get_mock_initial_state("ocr")
            state["raw_text"] = text
            state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
            state["dashscope_api_key"] = "test_api_key"
            state["current_datetime"] = "2025-03-25T10:00:00+08:00"
            
            # Setup mock response based on expected outcome
            mock_response = Mock()
            mock_response.content = f'{{"validation_passed": {str(should_pass).lower()}, "extracted_events": [...]}}'  
            mock_llm.invoke = Mock(return_value=mock_response)
            mock_parser.parse = Mock(return_value=lenient_output if should_pass else invalid_output)
            
            # Act
            result = await extract_general_task(state, mock_runtime)
            
            # Assert
            assert isinstance(result["validation_passed"], bool)
            # General extractor should be more accepting of various text formats
            assert result["validation_passed"] == should_pass, f"Failed for text: {text[:50]}..."
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_handles_unclear_tasks(
        self, mock_parser_class, mock_llm_class, mock_runtime
    ):
        """Test extraction handles vague or unclear task descriptions."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = "王律师，关于那个案子，你知道的，需要处理一下。"
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-03-25T10:00:00+08:00"
        
        # Create vague task event
        vague_task_event = ExtractedEvent(
            event_type="general_task",
            raw_title="处理案件相关事项",
            raw_date_time=None,
            raw_location=None,
            related_party_name="阿里巴巴（中国）有限公司",
            note="具体处理事项需要进一步明确",
            confidence=0.60,  # Lower confidence for vague tasks
            task_details=TaskDetails(
                urgency_level="normal",
                action_type="案件处理",
                context_clues=["处理", "案子"]
            )
        )
        
        unclear_output = GeneralTaskOutput(
            validation_passed=True,  # Still tries to extract something
            extracted_events=[vague_task_event],
            processing_notes=ProcessingNotes(
                total_tasks_identified=1,
                action_keywords_found=["处理"],
                client_associations="阿里巴巴案件相关",
                extraction_completeness="low",  # Lower completeness for unclear text
                error=None,
                potential_issues=None
            )
        )
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=unclear_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        # General extractor should handle vague instructions gracefully
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Should still try to extract something, even from unclear text
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 1
        
        event = result["extracted_events"][0]
        assert isinstance(event, dict)
        assert event["confidence"] == 0.60  # Lower confidence for unclear tasks
        assert "处理" in event["raw_title"]
        assert event["task_details"]["action_type"] == "案件处理"
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_with_llm_failure_and_retry(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_invalid_general_task_output
    ):
        """Test extraction with LLM failure and retry mechanism."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-03-25T10:00:00+08:00"
        
        # First two attempts fail, third succeeds
        mock_llm = Mock()
        mock_llm.invoke.side_effect = [
            Exception("Network timeout"),
            Exception("Rate limit exceeded"),
            Mock(content='{"validation_passed": false, "extracted_events": []}')
        ]
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse.return_value = sample_invalid_general_task_output
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        # Should retry twice then succeed on third attempt
        assert mock_llm.invoke.call_count == 3
        assert result["validation_passed"] is False  # Failed after retries
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_with_all_retries_exhausted(
        self, mock_parser_class, mock_llm_class, mock_runtime
    ):
        """Test extraction when all retry attempts are exhausted."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-03-25T10:00:00+08:00"
        
        # All attempts fail
        mock_llm = Mock()
        mock_llm.invoke.side_effect = Exception("Persistent failure")
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        # Should try 3 times (initial + 2 retries) then give up gracefully
        assert mock_llm.invoke.call_count == 3
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_with_parsing_error(
        self, mock_parser_class, mock_llm_class, mock_runtime
    ):
        """Test extraction with JSON parsing error."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-03-25T10:00:00+08:00"
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = 'Invalid JSON response'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        # Parser fails to parse invalid JSON
        mock_parser = Mock()
        mock_parser.parse.side_effect = Exception("JSON parsing error")
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        # Should handle parsing errors gracefully
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_with_missing_api_key(
        self, mock_parser_class, mock_llm_class, mock_runtime
    ):
        """Test extraction with missing Dashscope API key."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        # Missing dashscope_api_key
        state["current_datetime"] = "2025-03-25T10:00:00+08:00"
        
        # Mock LLM to fail due to missing API key
        mock_llm = Mock()
        mock_llm.invoke.side_effect = Exception("Invalid API key")
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        # Should handle missing API key gracefully by falling back to failure
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
        
        # Verify LLM was created with None API key (which would cause failure)
        mock_llm_class.assert_called_once()
        call_kwargs = mock_llm_class.call_args.kwargs
        assert call_kwargs["api_key"] is None
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_async_behavior(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_valid_general_task_output
    ):
        """Test that extraction properly handles async operations."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-03-25T10:00:00+08:00"
        
        # Mock async behavior with asyncio.to_thread
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_valid_general_task_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act - This should be truly async
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 2
        
        # Verify LLM was called (async operations wrapped in asyncio.to_thread)
        mock_llm.invoke.assert_called_once()
        mock_parser.parse.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_various_document_types_as_fallback(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_general_task_event
    ):
        """Test general extractor processes various document types as fallback."""
        # Test that general task extractor can handle documents from other types
        document_variations = [
            ("COURT_HEARING", MockDocuments.COURT_HEARING_CN),
            ("CONTRACT", MockDocuments.CONTRACT_CN),
            ("ASSET_PRESERVATION", MockDocuments.ASSET_PRESERVATION_CN),
            ("HEARING_TRANSCRIPT", MockDocuments.HEARING_TRANSCRIPT_CN),
            ("GENERAL", MockDocuments.GENERAL_TASK_CN)
        ]
        
        # Setup fallback extraction result
        fallback_output = GeneralTaskOutput(
            validation_passed=True,
            extracted_events=[sample_general_task_event],
            processing_notes=ProcessingNotes(
                total_tasks_identified=1,
                action_keywords_found=["处理", "准备"],
                client_associations="案件相关",
                extraction_completeness="medium",
                error=None,
                potential_issues=None
            )
        )
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=fallback_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        for doc_type, doc_text in document_variations:
            # Arrange
            state = get_mock_initial_state("ocr")
            state["raw_text"] = doc_text
            state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
            state["document_type"] = "GENERAL"  # All routed to general as fallback
            state["dashscope_api_key"] = "test_api_key"
            state["current_datetime"] = "2025-03-25T10:00:00+08:00"
            
            # Act
            result = await extract_general_task(state, mock_runtime)
            
            # Assert
            assert result["validation_passed"] is True, f"Failed for document type: {doc_type}"
            assert len(result["extracted_events"]) == 1, f"No events extracted for: {doc_type}"
            
            event = result["extracted_events"][0]
            assert event["event_type"] == "general_task"
            assert "raw_title" in event
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.general_task.ChatTongyi')
    @patch('agent.nodes.extractors.general_task.PydanticOutputParser')
    async def test_extract_validates_state_structure(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_valid_general_task_output
    ):
        """Test extraction validates and converts state structure correctly."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-03-25T10:00:00+08:00"
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_valid_general_task_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert - Verify state structure conversion
        assert isinstance(result, dict)
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Verify events are converted from Pydantic models to dicts
        for event in result["extracted_events"]:
            assert isinstance(event, dict)
            assert "event_type" in event
            assert "raw_title" in event
            assert "raw_date_time" in event
            assert "raw_location" in event
            assert "related_party_name" in event
            assert "note" in event
            assert "confidence" in event
            assert "task_details" in event
            
            # Verify nested task_details structure
            task_details = event["task_details"]
            assert isinstance(task_details, dict)
            assert "urgency_level" in task_details
            assert "action_type" in task_details
            assert "context_clues" in task_details
            assert isinstance(task_details["context_clues"], list)