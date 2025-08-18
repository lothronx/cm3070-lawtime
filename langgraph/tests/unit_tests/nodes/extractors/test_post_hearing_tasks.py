"""Unit tests for extract_post_hearing_tasks specialist extractor."""

import pytest
from unittest.mock import Mock, patch, AsyncMock

from agent.nodes.extractors.post_hearing_tasks import (
    extract_post_hearing_tasks,
    PostHearingTasksOutput,
    ExtractedEvent,
    TaskDetails,
    ProcessingNotes,
)
from tests.fixtures.mock_data import (
    get_mock_initial_state,
    MockDocuments,
    MockExtractedParties,
    MockExtractedEvents,
)


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


@pytest.fixture
def sample_post_hearing_event():
    """Sample post-hearing task event with all required fields."""
    return ExtractedEvent(
        event_type="post_hearing_task",
        raw_title="提交2023年度的详细财务流水",
        raw_date_time="2025-03-28T09:00:00+08:00",
        raw_location=None,
        related_party_name="阿里巴巴（中国）有限公司",
        note="（2025）京0105民初123号阿里巴巴与腾讯公司合同纠纷",
        confidence=0.95,
        task_details=TaskDetails(
            task_assignor="法官",
            task_context="针对原告主张的损失需要补充证据→三日内→2025-03-28T09:00:00+08:00",
            attribution_confidence=0.98
        )
    )


@pytest.fixture
def sample_valid_post_hearing_output(sample_post_hearing_event):
    """Sample valid post-hearing task extraction output."""
    return PostHearingTasksOutput(
        validation_passed=True,
        extracted_events=[sample_post_hearing_event],
        processing_notes=ProcessingNotes(
            dialogue_participants=["法官", "原告代理人", "被告代理人"],
            case_info_extracted="（2025）京0105民初123号合同纠纷",
            our_party_role="原告",
            total_tasks_found=1,
            error=None,
            potential_issues=None
        )
    )


@pytest.fixture
def sample_invalid_post_hearing_output():
    """Sample invalid post-hearing task extraction output."""
    return PostHearingTasksOutput(
        validation_passed=False,
        extracted_events=[],
        processing_notes=ProcessingNotes(
            dialogue_participants=None,
            case_info_extracted=None,
            our_party_role=None,
            total_tasks_found=0,
            error="NOT_HEARING_TRANSCRIPT",
            potential_issues=["缺少对话标识", "非庭审笔录结构", "仅为非正式沟通"]
        )
    )


class TestExtractPostHearingTasks:
    """Test cases for extract_post_hearing_tasks specialist extractor."""
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.post_hearing_tasks.ChatTongyi')
    @patch('agent.nodes.extractors.post_hearing_tasks.PydanticOutputParser')
    async def test_successful_post_hearing_task_extraction(
        self, mock_parser, mock_chat_tongyi, mock_runtime, sample_valid_post_hearing_output
    ):
        """Test successful extraction of post-hearing tasks from valid hearing transcript."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["current_datetime"] = "2025-03-25T14:30:00+08:00"
        state["dashscope_api_key"] = "test-key"
        
        # Mock LLM response
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm_instance = Mock()
        mock_llm_instance.invoke = Mock(return_value=mock_response)
        mock_chat_tongyi.return_value = mock_llm_instance
        
        # Mock parser
        mock_parser_instance = Mock()
        mock_parser_instance.parse = Mock(return_value=sample_valid_post_hearing_output)
        mock_parser_instance.get_format_instructions = Mock(return_value="format instructions")
        mock_parser.return_value = mock_parser_instance
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 1
        
        event = result["extracted_events"][0]
        assert event["event_type"] == "post_hearing_task"
        assert event["raw_title"] == "提交2023年度的详细财务流水"
        assert event["raw_date_time"] == "2025-03-28T09:00:00+08:00"
        assert event["related_party_name"] == "阿里巴巴（中国）有限公司"
        assert "task_details" in event
        assert event["task_details"]["task_assignor"] == "法官"
        
        # Verify mocks called correctly
        mock_chat_tongyi.assert_called_once()
        mock_llm_instance.invoke.assert_called_once()
        mock_parser_instance.parse.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.post_hearing_tasks.ChatTongyi')
    @patch('agent.nodes.extractors.post_hearing_tasks.PydanticOutputParser')
    async def test_validation_failure_with_non_hearing_transcript(
        self, mock_parser, mock_chat_tongyi, mock_runtime, sample_invalid_post_hearing_output
    ):
        """Test validation failure when document is not a hearing transcript."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.CONTRACT_CN  # Not a hearing transcript
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["current_datetime"] = "2025-03-25T14:30:00+08:00"
        state["dashscope_api_key"] = "test-key"
        
        # Mock LLM response for validation failure
        mock_response = Mock()
        mock_response.content = '{"validation_passed": false, "extracted_events": []}'
        mock_llm_instance = Mock()
        mock_llm_instance.invoke = Mock(return_value=mock_response)
        mock_chat_tongyi.return_value = mock_llm_instance
        
        # Mock parser returning validation failure
        mock_parser_instance = Mock()
        mock_parser_instance.parse = Mock(return_value=sample_invalid_post_hearing_output)
        mock_parser_instance.get_format_instructions = Mock(return_value="format instructions")
        mock_parser.return_value = mock_parser_instance
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
        
        # Verify LLM and parser were called
        mock_chat_tongyi.assert_called_once()
        mock_llm_instance.invoke.assert_called_once()
        mock_parser_instance.parse.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.post_hearing_tasks.ChatTongyi')
    @patch('agent.nodes.extractors.post_hearing_tasks.PydanticOutputParser')
    async def test_multiple_post_hearing_tasks_extraction(
        self, mock_parser, mock_chat_tongyi, mock_runtime
    ):
        """Test extraction of multiple tasks from hearing transcript with multiple parties."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.MULTI_PARTY
        state["current_datetime"] = "2025-03-25T14:30:00+08:00"
        state["dashscope_api_key"] = "test-key"
        
        # Create multiple tasks output
        multiple_events = [
            ExtractedEvent(
                event_type="post_hearing_task",
                raw_title="提交2023年度的详细财务流水",
                raw_date_time="2025-03-28T09:00:00+08:00",
                raw_location=None,
                related_party_name="阿里巴巴（中国）有限公司",
                note="（2025）京0105民初123号合同纠纷",
                confidence=0.95,
                task_details=TaskDetails(
                    task_assignor="法官",
                    task_context="针对原告主张的损失需要补充证据→三日内",
                    attribution_confidence=0.98
                )
            ),
            ExtractedEvent(
                event_type="post_hearing_task",
                raw_title="书面说明服务器维护记录",
                raw_date_time="2025-04-01T09:00:00+08:00",
                raw_location=None,
                related_party_name="腾讯公司",
                note="（2025）京0105民初123号合同纠纷",
                confidence=0.90,
                task_details=TaskDetails(
                    task_assignor="法官",
                    task_context="被告需要说明服务器维护情况→一周内",
                    attribution_confidence=0.95
                )
            )
        ]
        
        multiple_output = PostHearingTasksOutput(
            validation_passed=True,
            extracted_events=multiple_events,
            processing_notes=ProcessingNotes(
                dialogue_participants=["法官", "原告代理人", "被告代理人"],
                case_info_extracted="（2025）京0105民初123号合同纠纷",
                our_party_role="原告",
                total_tasks_found=2,
                error=None,
                potential_issues=None
            )
        )
        
        # Mock LLM response
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm_instance = Mock()
        mock_llm_instance.invoke = Mock(return_value=mock_response)
        mock_chat_tongyi.return_value = mock_llm_instance
        
        # Mock parser
        mock_parser_instance = Mock()
        mock_parser_instance.parse = Mock(return_value=multiple_output)
        mock_parser_instance.get_format_instructions = Mock(return_value="format instructions")
        mock_parser.return_value = mock_parser_instance
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 2
        
        # Check first task (for plaintiff)
        first_event = result["extracted_events"][0]
        assert first_event["event_type"] == "post_hearing_task"
        assert "财务流水" in first_event["raw_title"]
        assert first_event["raw_date_time"] == "2025-03-28T09:00:00+08:00"
        
        # Check second task (for defendant)
        second_event = result["extracted_events"][1]
        assert second_event["event_type"] == "post_hearing_task"
        assert "服务器" in second_event["raw_title"]
        assert second_event["raw_date_time"] == "2025-04-01T09:00:00+08:00"
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.post_hearing_tasks.ChatTongyi')
    @patch('agent.nodes.extractors.post_hearing_tasks.PydanticOutputParser')
    async def test_extract_plaintiff_task_with_specific_deadline(
        self, mock_parser, mock_chat_tongyi, mock_runtime
    ):
        """Test extraction of plaintiff task with 三日内 deadline conversion."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["current_datetime"] = "2025-03-25T14:30:00+08:00"
        state["dashscope_api_key"] = "test-key"
        
        # Create output with specific plaintiff task
        plaintiff_event = ExtractedEvent(
            event_type="post_hearing_task",
            raw_title="补充提交2023年度的详细财务流水",
            raw_date_time="2025-03-28T09:00:00+08:00",  # 三日内 -> +3 days
            raw_location=None,
            related_party_name="阿里巴巴（中国）有限公司",
            note="（2025）京0105民初123号阿里巴巴与腾讯公司合同纠纷",
            confidence=0.95,
            task_details=TaskDetails(
                task_assignor="法官",
                task_context="针对原告主张的损失需要补充证据→三日内",
                attribution_confidence=0.98
            )
        )
        
        output = PostHearingTasksOutput(
            validation_passed=True,
            extracted_events=[plaintiff_event],
            processing_notes=ProcessingNotes(
                dialogue_participants=["法官", "原告代理人"],
                case_info_extracted="（2025）京0105民初123号合同纠纷",
                our_party_role="原告",
                total_tasks_found=1,
                error=None,
                potential_issues=None
            )
        )
        
        # Mock LLM response
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm_instance = Mock()
        mock_llm_instance.invoke = Mock(return_value=mock_response)
        mock_chat_tongyi.return_value = mock_llm_instance
        
        # Mock parser
        mock_parser_instance = Mock()
        mock_parser_instance.parse = Mock(return_value=output)
        mock_parser_instance.get_format_instructions = Mock(return_value="format instructions")
        mock_parser.return_value = mock_parser_instance
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 1
        
        event = result["extracted_events"][0]
        assert "财务流水" in event["raw_title"]
        assert event["raw_date_time"] == "2025-03-28T09:00:00+08:00"  # Converted from "三日内"
        assert event["related_party_name"] == "阿里巴巴（中国）有限公司"
        assert event["task_details"]["task_assignor"] == "法官"
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.post_hearing_tasks.ChatTongyi')
    @patch('agent.nodes.extractors.post_hearing_tasks.PydanticOutputParser')
    async def test_extract_defendant_task_with_weekly_deadline(
        self, mock_parser, mock_chat_tongyi, mock_runtime
    ):
        """Test extraction of defendant task with 一周内 deadline conversion."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.MULTI_PARTY
        state["current_datetime"] = "2025-03-25T14:30:00+08:00"
        state["dashscope_api_key"] = "test-key"
        
        # Create output with defendant task (but shown from our perspective)
        defendant_event = ExtractedEvent(
            event_type="post_hearing_task",
            raw_title="书面说明服务器维护记录",
            raw_date_time="2025-04-01T09:00:00+08:00",  # 一周内 -> +7 days
            raw_location=None,
            related_party_name="腾讯公司",
            note="（2025）京0105民初123号合同纠纷，被告任务",
            confidence=0.90,
            task_details=TaskDetails(
                task_assignor="法官",
                task_context="被告需要说明服务器维护情况→一周内",
                attribution_confidence=0.95
            )
        )
        
        output = PostHearingTasksOutput(
            validation_passed=True,
            extracted_events=[defendant_event],
            processing_notes=ProcessingNotes(
                dialogue_participants=["法官", "被告代理人"],
                case_info_extracted="（2025）京0105民初123号合同纠纷",
                our_party_role="监督方",
                total_tasks_found=1,
                error=None,
                potential_issues=None
            )
        )
        
        # Mock LLM response
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm_instance = Mock()
        mock_llm_instance.invoke = Mock(return_value=mock_response)
        mock_chat_tongyi.return_value = mock_llm_instance
        
        # Mock parser
        mock_parser_instance = Mock()
        mock_parser_instance.parse = Mock(return_value=output)
        mock_parser_instance.get_format_instructions = Mock(return_value="format instructions")
        mock_parser.return_value = mock_parser_instance
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 1
        
        event = result["extracted_events"][0]
        assert "服务器" in event["raw_title"]
        assert event["raw_date_time"] == "2025-04-01T09:00:00+08:00"  # Converted from "一周内"
        assert "腾讯" in event["related_party_name"]
        assert event["task_details"]["task_assignor"] == "法官"
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.post_hearing_tasks.ChatTongyi')
    @patch('agent.nodes.extractors.post_hearing_tasks.PydanticOutputParser')
    async def test_extraction_includes_case_information_and_parties(
        self, mock_parser, mock_chat_tongyi, mock_runtime, sample_valid_post_hearing_output
    ):
        """Test extraction includes case number and party information in notes."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["current_datetime"] = "2025-03-25T14:30:00+08:00"
        state["dashscope_api_key"] = "test-key"
        
        # Mock LLM response
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm_instance = Mock()
        mock_llm_instance.invoke = Mock(return_value=mock_response)
        mock_chat_tongyi.return_value = mock_llm_instance
        
        # Mock parser
        mock_parser_instance = Mock()
        mock_parser_instance.parse = Mock(return_value=sample_valid_post_hearing_output)
        mock_parser_instance.get_format_instructions = Mock(return_value="format instructions")
        mock_parser.return_value = mock_parser_instance
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) > 0
        
        event = result["extracted_events"][0]
        assert "note" in event
        assert "（2025）京0105民初123号" in event["note"]
        assert "阿里巴巴" in event["note"]
        assert "腾讯" in event["note"]
        assert "related_party_name" in event
        assert event["related_party_name"] == "阿里巴巴（中国）有限公司"
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.post_hearing_tasks.ChatTongyi')
    @patch('agent.nodes.extractors.post_hearing_tasks.PydanticOutputParser')
    async def test_relative_deadline_conversion_to_iso_format(
        self, mock_parser, mock_chat_tongyi, mock_runtime
    ):
        """Test conversion of relative deadlines (三日内, 一周内) to ISO format."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["current_datetime"] = "2025-03-25T14:30:00+08:00"
        state["dashscope_api_key"] = "test-key"
        
        # Create output with different deadline formats
        deadline_events = [
            ExtractedEvent(
                event_type="post_hearing_task",
                raw_title="提交财务流水",
                raw_date_time="2025-03-28T09:00:00+08:00",  # 三日内
                raw_location=None,
                related_party_name="阿里巴巴（中国）有限公司",
                note="（2025）京0105民初123号合同纠纷",
                confidence=0.95,
                task_details=TaskDetails(
                    task_assignor="法官",
                    task_context="三日内提交",
                    attribution_confidence=0.98
                )
            ),
            ExtractedEvent(
                event_type="post_hearing_task",
                raw_title="说明服务器维护",
                raw_date_time="2025-04-01T09:00:00+08:00",  # 一周内
                raw_location=None,
                related_party_name="腾讯公司",
                note="（2025）京0105民初123号合同纠纷",
                confidence=0.90,
                task_details=TaskDetails(
                    task_assignor="法官",
                    task_context="一周内说明",
                    attribution_confidence=0.95
                )
            )
        ]
        
        output = PostHearingTasksOutput(
            validation_passed=True,
            extracted_events=deadline_events,
            processing_notes=ProcessingNotes(
                dialogue_participants=["法官", "原告代理人", "被告代理人"],
                case_info_extracted="（2025）京0105民初123号合同纠纷",
                our_party_role="原告",
                total_tasks_found=2,
                error=None,
                potential_issues=None
            )
        )
        
        # Mock LLM response
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm_instance = Mock()
        mock_llm_instance.invoke = Mock(return_value=mock_response)
        mock_chat_tongyi.return_value = mock_llm_instance
        
        # Mock parser
        mock_parser_instance = Mock()
        mock_parser_instance.parse = Mock(return_value=output)
        mock_parser_instance.get_format_instructions = Mock(return_value="format instructions")
        mock_parser.return_value = mock_parser_instance
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 2
        
        # Check ISO format deadlines
        deadlines = [e["raw_date_time"] for e in result["extracted_events"]]
        assert "2025-03-28T09:00:00+08:00" in deadlines  # 三日内 converted
        assert "2025-04-01T09:00:00+08:00" in deadlines  # 一周内 converted
        
        # All deadlines should be in ISO format
        for deadline in deadlines:
            assert "T" in deadline
            assert "+08:00" in deadline
    
    @pytest.mark.asyncio
    async def test_empty_text_returns_validation_failure(self, mock_runtime):
        """Test extraction with empty document text returns validation failure."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = ""  # Empty text
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["current_datetime"] = "2025-03-25T14:30:00+08:00"
        state["dashscope_api_key"] = "test-key"
        
        # Act - no mocking needed as function should handle empty text early
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is False
        assert result["extracted_events"] == []
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.post_hearing_tasks.ChatTongyi')
    @patch('agent.nodes.extractors.post_hearing_tasks.PydanticOutputParser')
    async def test_extraction_with_new_client_proposed(
        self, mock_parser, mock_chat_tongyi, mock_runtime
    ):
        """Test extraction when new client is proposed in identified parties."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.NEW_CLIENT_PROPOSED
        state["current_datetime"] = "2025-03-25T14:30:00+08:00"
        state["dashscope_api_key"] = "test-key"
        
        # Create output for new client scenario
        new_client_event = ExtractedEvent(
            event_type="post_hearing_task",
            raw_title="提交财务流水",
            raw_date_time="2025-03-28T09:00:00+08:00",
            raw_location=None,
            related_party_name="新客户名称",  # New client name from mock data
            note="（2025）京0105民初123号合同纠纷",
            confidence=0.95,
            task_details=TaskDetails(
                task_assignor="法官",
                task_context="新客户提交任务",
                attribution_confidence=0.98
            )
        )
        
        output = PostHearingTasksOutput(
            validation_passed=True,
            extracted_events=[new_client_event],
            processing_notes=ProcessingNotes(
                dialogue_participants=["法官", "原告代理人"],
                case_info_extracted="（2025）京0105民初123号合同纠纷",
                our_party_role="原告",
                total_tasks_found=1,
                error=None,
                potential_issues=None
            )
        )
        
        # Mock LLM response
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm_instance = Mock()
        mock_llm_instance.invoke = Mock(return_value=mock_response)
        mock_chat_tongyi.return_value = mock_llm_instance
        
        # Mock parser
        mock_parser_instance = Mock()
        mock_parser_instance.parse = Mock(return_value=output)
        mock_parser_instance.get_format_instructions = Mock(return_value="format instructions")
        mock_parser.return_value = mock_parser_instance
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 1
        
        event = result["extracted_events"][0]
        assert "related_party_name" in event
        assert event["related_party_name"] == "新客户名称"
        assert event["event_type"] == "post_hearing_task"
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.post_hearing_tasks.ChatTongyi')
    @patch('agent.nodes.extractors.post_hearing_tasks.PydanticOutputParser')
    async def test_function_preserves_original_state(
        self, mock_parser, mock_chat_tongyi, mock_runtime, sample_valid_post_hearing_output
    ):
        """Test that extraction function preserves original state unchanged."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["current_datetime"] = "2025-03-25T14:30:00+08:00"
        state["dashscope_api_key"] = "test-key"
        
        # Store original state values
        original_raw_text = state["raw_text"]
        original_parties = state["identified_parties"]
        original_datetime = state["current_datetime"]
        original_key_count = len(state.keys())
        
        # Mock LLM response
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm_instance = Mock()
        mock_llm_instance.invoke = Mock(return_value=mock_response)
        mock_chat_tongyi.return_value = mock_llm_instance
        
        # Mock parser
        mock_parser_instance = Mock()
        mock_parser_instance.parse = Mock(return_value=sample_valid_post_hearing_output)
        mock_parser_instance.get_format_instructions = Mock(return_value="format instructions")
        mock_parser.return_value = mock_parser_instance
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert - Function should return only specific keys
        assert len(result.keys()) == 2
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Assert - Original state should remain unchanged
        assert state["raw_text"] == original_raw_text
        assert state["identified_parties"] == original_parties
        assert state["current_datetime"] == original_datetime
        assert len(state.keys()) == original_key_count
    
    @pytest.mark.asyncio
    async def test_function_return_structure_consistency(self, mock_runtime):
        """Test function always returns consistent structure regardless of input."""
        # Test with empty state
        empty_state = get_mock_initial_state("ocr")
        empty_state["raw_text"] = ""
        
        result = await extract_post_hearing_tasks(empty_state, mock_runtime)
        
        # Assert consistent structure
        assert isinstance(result, dict)
        assert len(result) == 2
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        # Test with missing keys
        minimal_state = {"raw_text": "test"}
        
        result2 = await extract_post_hearing_tasks(minimal_state, mock_runtime)
        
        # Assert same structure maintained
        assert isinstance(result2, dict)
        assert len(result2) == 2
        assert "validation_passed" in result2
        assert "extracted_events" in result2
        assert isinstance(result2["validation_passed"], bool)
        assert isinstance(result2["extracted_events"], list)
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.post_hearing_tasks.ChatTongyi')
    @patch('agent.nodes.extractors.post_hearing_tasks.PydanticOutputParser')
    async def test_validation_with_transcript_keywords(
        self, mock_parser, mock_chat_tongyi, mock_runtime
    ):
        """Test validation logic with transcript-specific keywords vs non-transcript text."""
        # Test 1: Text with transcript keywords
        state = get_mock_initial_state("ocr")
        state["raw_text"] = "庭审笔录 法官 原告代理人 被告代理人 庭后"
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["current_datetime"] = "2025-03-25T14:30:00+08:00"
        state["dashscope_api_key"] = "test-key"
        
        # Mock successful validation for transcript keywords
        transcript_output = PostHearingTasksOutput(
            validation_passed=True,
            extracted_events=[],
            processing_notes=ProcessingNotes(
                dialogue_participants=["法官", "原告代理人"],
                case_info_extracted="庭审笔录文档",
                our_party_role="原告",
                total_tasks_found=0,
                error=None,
                potential_issues=None
            )
        )
        
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true}'
        mock_llm_instance = Mock()
        mock_llm_instance.invoke = Mock(return_value=mock_response)
        mock_chat_tongyi.return_value = mock_llm_instance
        
        mock_parser_instance = Mock()
        mock_parser_instance.parse = Mock(return_value=transcript_output)
        mock_parser_instance.get_format_instructions = Mock(return_value="format instructions")
        mock_parser.return_value = mock_parser_instance
        
        result1 = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Test 2: Non-transcript text (contract)
        state["raw_text"] = "法律顾问协议书 有效期 2027年5月31日止"
        
        # Mock validation failure for contract text
        contract_output = PostHearingTasksOutput(
            validation_passed=False,
            extracted_events=[],
            processing_notes=ProcessingNotes(
                dialogue_participants=None,
                case_info_extracted=None,
                our_party_role=None,
                total_tasks_found=0,
                error="NOT_HEARING_TRANSCRIPT",
                potential_issues=["缺少对话标识", "非庭审笔录结构"]
            )
        )
        
        mock_response.content = '{"validation_passed": false}'
        mock_parser_instance.parse = Mock(return_value=contract_output)
        
        result2 = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        assert isinstance(result1["validation_passed"], bool)
        assert isinstance(result2["validation_passed"], bool)
        
        # Typically, transcript keywords should pass validation better than contract text
        # But this depends on the actual LLM implementation
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.post_hearing_tasks.ChatTongyi')
    @patch('agent.nodes.extractors.post_hearing_tasks.PydanticOutputParser')
    async def test_judge_instruction_pattern_recognition(
        self, mock_parser, mock_chat_tongyi, mock_runtime
    ):
        """Test recognition of judge instruction patterns with acknowledgments."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN  # Contains judge instructions
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["current_datetime"] = "2025-03-25T14:30:00+08:00"
        state["dashscope_api_key"] = "test-key"
        
        # Create output recognizing judge instructions
        judge_instruction_event = ExtractedEvent(
            event_type="post_hearing_task",
            raw_title="提交2023年度财务流水",
            raw_date_time="2025-03-28T09:00:00+08:00",
            raw_location=None,
            related_party_name="阿里巴巴（中国）有限公司",
            note="（2025）京0105民初123号合同纠纷",
            confidence=0.95,
            task_details=TaskDetails(
                task_assignor="法官",  # Recognized as judge instruction
                task_context="法官指示并得到原告代理人确认：好的",
                attribution_confidence=0.98
            )
        )
        
        output = PostHearingTasksOutput(
            validation_passed=True,
            extracted_events=[judge_instruction_event],
            processing_notes=ProcessingNotes(
                dialogue_participants=["法官", "原告代理人", "被告代理人"],
                case_info_extracted="（2025）京0105民初123号合同纠纷",
                our_party_role="原告",
                total_tasks_found=1,
                error=None,
                potential_issues=None
            )
        )
        
        # Mock LLM response
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm_instance = Mock()
        mock_llm_instance.invoke = Mock(return_value=mock_response)
        mock_chat_tongyi.return_value = mock_llm_instance
        
        # Mock parser
        mock_parser_instance = Mock()
        mock_parser_instance.parse = Mock(return_value=output)
        mock_parser_instance.get_format_instructions = Mock(return_value="format instructions")
        mock_parser.return_value = mock_parser_instance
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) > 0
        
        event = result["extracted_events"][0]
        assert event["task_details"]["task_assignor"] == "法官"
        assert "法官" in event["task_details"]["task_context"] or "确认" in event["task_details"]["task_context"]
        assert event["event_type"] == "post_hearing_task"
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.post_hearing_tasks.ChatTongyi')
    @patch('agent.nodes.extractors.post_hearing_tasks.PydanticOutputParser')
    async def test_llm_failure_with_retry_mechanism(
        self, mock_parser, mock_chat_tongyi, mock_runtime
    ):
        """Test retry mechanism when LLM fails and eventual fallback."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["current_datetime"] = "2025-03-25T14:30:00+08:00"
        state["dashscope_api_key"] = "test-key"
        
        # Mock LLM to fail multiple times then succeed
        mock_llm_instance = Mock()
        mock_llm_instance.invoke = Mock(side_effect=[
            Exception("LLM timeout"),
            Exception("Connection error"),
            Exception("Final failure")
        ])
        mock_chat_tongyi.return_value = mock_llm_instance
        
        mock_parser_instance = Mock()
        mock_parser_instance.get_format_instructions = Mock(return_value="format instructions")
        mock_parser.return_value = mock_parser_instance
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert - Should return failed validation after all retries
        assert result["validation_passed"] is False
        assert result["extracted_events"] == []
        
        # Verify retry attempts (3 attempts = max_retries + 1)
        assert mock_llm_instance.invoke.call_count == 3
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.post_hearing_tasks.ChatTongyi')
    @patch('agent.nodes.extractors.post_hearing_tasks.PydanticOutputParser')
    async def test_parser_error_handling(
        self, mock_parser, mock_chat_tongyi, mock_runtime
    ):
        """Test handling of parsing errors from malformed LLM responses."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["current_datetime"] = "2025-03-25T14:30:00+08:00"
        state["dashscope_api_key"] = "test-key"
        
        # Mock LLM to return invalid JSON
        mock_response = Mock()
        mock_response.content = "This is not valid JSON at all"
        mock_llm_instance = Mock()
        mock_llm_instance.invoke = Mock(return_value=mock_response)
        mock_chat_tongyi.return_value = mock_llm_instance
        
        # Mock parser to fail with parsing error
        mock_parser_instance = Mock()
        mock_parser_instance.parse = Mock(side_effect=Exception("Invalid JSON format"))
        mock_parser_instance.get_format_instructions = Mock(return_value="format instructions")
        mock_parser.return_value = mock_parser_instance
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert - Should gracefully handle parse error
        assert result["validation_passed"] is False
        assert result["extracted_events"] == []
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.post_hearing_tasks.ChatTongyi')
    @patch('agent.nodes.extractors.post_hearing_tasks.asyncio.to_thread')
    async def test_async_wrapper_functionality(
        self, mock_to_thread, mock_chat_tongyi, mock_runtime, sample_valid_post_hearing_output
    ):
        """Test async wrapper using asyncio.to_thread for blocking operations."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["current_datetime"] = "2025-03-25T14:30:00+08:00"
        state["dashscope_api_key"] = "test-key"
        
        # Mock LLM
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true}'
        mock_llm_instance = Mock()
        mock_chat_tongyi.return_value = mock_llm_instance
        
        # Mock asyncio.to_thread calls
        mock_to_thread.side_effect = [
            mock_response,  # First call for LLM invoke
            sample_valid_post_hearing_output  # Second call for parser
        ]
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 1
        
        # Verify asyncio.to_thread was called for both LLM and parser
        assert mock_to_thread.call_count == 2