"""Unit tests for extract_task_from_note node."""

import asyncio
import pytest
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch, MagicMock

from agent.nodes.extract_task_from_note import (
    extract_task_from_note,
    ExtractedTasks,
    Task,
    VoiceNoteDetails,
)
from agent.utils.state import AgentState
from tests.fixtures.mock_data import (
    get_mock_asr_state_after_transcription,
    MockDocuments,
    MockExtractedEvents,
    MOCK_CLIENT_LIST
)


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


@pytest.fixture
def sample_voice_note_task():
    """Sample voice note task with all required fields."""
    return Task(
        event_type="general_task",
        raw_title="跟进阿里巴巴案子",
        raw_date_time="2025-03-26T09:00:00+08:00",
        raw_location=None,
        related_party_name="阿里巴巴（中国）有限公司",
        note="提醒我明天上午跟进一下阿里巴巴那个案子",
        confidence=0.92,
        voice_note_details=VoiceNoteDetails(
            original_mention="阿里巴巴",
            client_match_confidence=0.95,
            time_interpretation="相对时间-明天上午→2025-03-26T09:00:00+08:00",
            speech_patterns=["提醒我", "那个案子", "跟进一下"]
        )
    )


@pytest.fixture
def sample_extracted_tasks_response(sample_voice_note_task):
    """Sample ExtractedTasks response."""
    return ExtractedTasks(tasks=[sample_voice_note_task])


@pytest.fixture
def mock_state_with_current_datetime():
    """Mock state with current datetime for time conversion tests."""
    state = get_mock_asr_state_after_transcription()
    state["current_datetime"] = "2025-03-25T10:30:00+08:00"
    state["dashscope_api_key"] = "test_api_key"
    state["client_list_formatted"] = str(MOCK_CLIENT_LIST)
    return state


class TestExtractTaskFromNote:
    """Test cases for extract_task_from_note node."""
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_task_from_note.ChatTongyi')
    @patch('agent.nodes.extract_task_from_note.PydanticOutputParser')
    async def test_extract_single_task_from_voice_note(
        self, mock_parser_class, mock_llm_class, mock_runtime, 
        sample_extracted_tasks_response, mock_state_with_current_datetime
    ):
        """Test extraction of single task from voice note transcription."""
        # Arrange
        mock_state_with_current_datetime["raw_text"] = "提醒我明天上午跟进一下阿里巴巴那个案子"
        
        # Mock LLM response
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"tasks": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        # Mock parser
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_extracted_tasks_response)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_task_from_note(mock_state_with_current_datetime, mock_runtime)
        
        # Assert
        assert "extracted_events" in result
        assert isinstance(result["extracted_events"], list)
        assert len(result["extracted_events"]) == 1
        
        # Verify event structure matches expected format
        event = result["extracted_events"][0]
        assert event["event_type"] == "general_task"
        assert event["raw_title"] == "跟进阿里巴巴案子"
        assert event["raw_date_time"] == "2025-03-26T09:00:00+08:00"
        assert event["related_party_name"] == "阿里巴巴（中国）有限公司"
        assert "voice_note_details" in event
        assert event["voice_note_details"]["original_mention"] == "阿里巴巴"
        
        # Verify LLM was called with correct parameters
        mock_llm_class.assert_called_once()
        call_kwargs = mock_llm_class.call_args.kwargs
        assert call_kwargs["model"] == "qwen3-30b-a3b-instruct-2507"
        assert call_kwargs["api_key"] == "test_api_key"
        assert call_kwargs["temperature"] == 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_task_from_note.ChatTongyi')
    @patch('agent.nodes.extract_task_from_note.PydanticOutputParser')
    async def test_extract_multiple_tasks_from_voice_note(
        self, mock_parser_class, mock_llm_class, mock_runtime, mock_state_with_current_datetime
    ):
        """Test extraction of multiple tasks from single voice note."""
        # Arrange - Use realistic multi-task voice note
        mock_state_with_current_datetime["raw_text"] = MockDocuments.VOICE_NOTE_CN  # Contains two tasks
        
        # Create multiple tasks response
        task1 = Task(
            event_type="general_task",
            raw_title="跟进阿里巴巴案子",
            raw_date_time="2025-03-26T09:00:00+08:00",
            raw_location=None,
            related_party_name="阿里巴巴（中国）有限公司",
            note="提醒我明天上午跟进一下阿里巴巴那个案子",
            confidence=0.92,
            voice_note_details=VoiceNoteDetails(
                original_mention="阿里巴巴",
                client_match_confidence=0.95,
                time_interpretation="相对时间-明天上午→2025-03-26T09:00:00+08:00",
                speech_patterns=["提醒我", "那个案子", "跟进一下"]
            )
        )
        
        task2 = Task(
            event_type="general_task",
            raw_title="与张三开会",
            raw_date_time="2025-03-25T14:00:00+08:00",
            raw_location="星巴克",
            related_party_name="张三",
            note="下午两点在星巴克跟张三开个会",
            confidence=0.88,
            voice_note_details=VoiceNoteDetails(
                original_mention="张三",
                client_match_confidence=0.6,
                time_interpretation="具体时间-下午两点→2025-03-25T14:00:00+08:00",
                speech_patterns=["下午两点", "开个会"]
            )
        )
        
        multi_task_response = ExtractedTasks(tasks=[task1, task2])
        
        # Mock LLM and parser
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"tasks": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=multi_task_response)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_task_from_note(mock_state_with_current_datetime, mock_runtime)
        
        # Assert
        assert "extracted_events" in result
        assert isinstance(result["extracted_events"], list)
        assert len(result["extracted_events"]) == 2
        
        # Verify first task (client matching)
        event1 = result["extracted_events"][0]
        assert event1["related_party_name"] == "阿里巴巴（中国）有限公司"
        assert event1["voice_note_details"]["client_match_confidence"] == 0.95
        
        # Verify second task (location and time)
        event2 = result["extracted_events"][1]
        assert event2["raw_location"] == "星巴克"
        assert event2["raw_date_time"] == "2025-03-25T14:00:00+08:00"
        assert event2["voice_note_details"]["time_interpretation"] == "具体时间-下午两点→2025-03-25T14:00:00+08:00"
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_task_from_note.ChatTongyi')
    @patch('agent.nodes.extract_task_from_note.PydanticOutputParser')
    async def test_extract_task_with_client_matching(
        self, mock_parser_class, mock_llm_class, mock_runtime, mock_state_with_current_datetime
    ):
        """Test client name matching with Alibaba case from fixtures."""
        # Arrange - Use Alibaba mention that should match
        mock_state_with_current_datetime["raw_text"] = "提醒我明天上午跟进一下阿里巴巴那个案子"
        
        # Create task with high confidence client matching
        alibaba_task = Task(
            event_type="general_task",
            raw_title="跟进阿里巴巴案子",
            raw_date_time="2025-03-26T09:00:00+08:00",
            raw_location=None,
            related_party_name="阿里巴巴（中国）有限公司",  # Should match client from MOCK_CLIENT_LIST
            note="提醒我明天上午跟进一下阿里巴巴那个案子",
            confidence=0.92,
            voice_note_details=VoiceNoteDetails(
                original_mention="阿里巴巴",
                client_match_confidence=0.95,  # High confidence match
                time_interpretation="相对时间-明天上午→2025-03-26T09:00:00+08:00",
                speech_patterns=["提醒我", "那个案子", "跟进一下"]
            )
        )
        
        response = ExtractedTasks(tasks=[alibaba_task])
        
        # Mock LLM and parser
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"tasks": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=response)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_task_from_note(mock_state_with_current_datetime, mock_runtime)
        
        # Assert client matching
        assert len(result["extracted_events"]) == 1
        event = result["extracted_events"][0]
        
        # Verify client was matched to existing client list
        assert event["related_party_name"] == "阿里巴巴（中国）有限公司"
        assert event["voice_note_details"]["original_mention"] == "阿里巴巴"
        assert event["voice_note_details"]["client_match_confidence"] == 0.95
        
        # Verify prompt included client list for matching
        prompt_call = mock_llm.invoke.call_args[0][0]
        assert str(MOCK_CLIENT_LIST) in prompt_call
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_task_from_note.ChatTongyi')
    @patch('agent.nodes.extract_task_from_note.PydanticOutputParser')
    async def test_extract_task_with_time_and_location(
        self, mock_parser_class, mock_llm_class, mock_runtime, mock_state_with_current_datetime
    ):
        """Test extraction of time-specific tasks with location details."""
        # Arrange - Task with specific time and location
        mock_state_with_current_datetime["raw_text"] = "下午两点在星巴克跟张三开个会"
        
        time_location_task = Task(
            event_type="general_task",
            raw_title="与张三开会",
            raw_date_time="2025-03-25T14:00:00+08:00",  # Specific time conversion
            raw_location="星巴克",  # Specific location
            related_party_name="张三",
            note="下午两点在星巴克跟张三开个会",
            confidence=0.88,
            voice_note_details=VoiceNoteDetails(
                original_mention="张三",
                client_match_confidence=0.6,  # Lower confidence - not in client list
                time_interpretation="具体时间-下午两点→2025-03-25T14:00:00+08:00",
                speech_patterns=["下午两点", "开个会"]
            )
        )
        
        response = ExtractedTasks(tasks=[time_location_task])
        
        # Mock LLM and parser
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"tasks": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=response)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_task_from_note(mock_state_with_current_datetime, mock_runtime)
        
        # Assert time and location extraction
        assert len(result["extracted_events"]) == 1
        event = result["extracted_events"][0]
        
        # Verify time conversion from relative to absolute
        assert event["raw_date_time"] == "2025-03-25T14:00:00+08:00"
        assert event["voice_note_details"]["time_interpretation"] == "具体时间-下午两点→2025-03-25T14:00:00+08:00"
        
        # Verify location extraction
        assert event["raw_location"] == "星巴克"
        
        # Verify speech pattern recognition
        assert "下午两点" in event["voice_note_details"]["speech_patterns"]
        assert "开个会" in event["voice_note_details"]["speech_patterns"]
    
    @pytest.mark.asyncio
    async def test_extract_task_with_empty_text(self, mock_runtime, mock_state_with_current_datetime):
        """Test extraction with empty transcribed text."""
        # Arrange
        mock_state_with_current_datetime["raw_text"] = ""
        
        # Act
        result = await extract_task_from_note(mock_state_with_current_datetime, mock_runtime)
        
        # Assert - Should return empty list without calling LLM
        assert "extracted_events" in result
        assert isinstance(result["extracted_events"], list)
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    async def test_extract_task_with_whitespace_only_text(self, mock_runtime, mock_state_with_current_datetime):
        """Test extraction with whitespace-only text."""
        # Arrange
        mock_state_with_current_datetime["raw_text"] = "   \n\t   "
        
        # Act
        result = await extract_task_from_note(mock_state_with_current_datetime, mock_runtime)
        
        # Assert - Should return empty list without calling LLM
        assert "extracted_events" in result
        assert isinstance(result["extracted_events"], list)
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_task_from_note.ChatTongyi')
    @patch('agent.nodes.extract_task_from_note.PydanticOutputParser')
    async def test_extract_task_with_unclear_voice_note(
        self, mock_parser_class, mock_llm_class, mock_runtime, mock_state_with_current_datetime
    ):
        """Test extraction with unclear or garbled transcription."""
        # Arrange - Unclear, fragmentary speech
        mock_state_with_current_datetime["raw_text"] = "嗯...那个...就是...开会什么的"
        
        # Mock LLM to return empty tasks (realistic for unclear input)
        empty_response = ExtractedTasks(tasks=[])  # No tasks identified
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"tasks": []}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=empty_response)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_task_from_note(mock_state_with_current_datetime, mock_runtime)
        
        # Assert - Should handle gracefully with empty result
        assert "extracted_events" in result
        assert isinstance(result["extracted_events"], list)
        assert len(result["extracted_events"]) == 0
        
        # Verify LLM was still called (but returned no tasks)
        mock_llm.invoke.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_task_from_note.ChatTongyi')
    @patch('agent.nodes.extract_task_from_note.PydanticOutputParser') 
    async def test_extract_task_preserves_state(
        self, mock_parser_class, mock_llm_class, mock_runtime, 
        sample_extracted_tasks_response, mock_state_with_current_datetime
    ):
        """Test that extraction only returns extracted_events and preserves original state."""
        # Arrange
        original_raw_text = mock_state_with_current_datetime["raw_text"]
        original_client_list = mock_state_with_current_datetime["client_list"]
        original_current_datetime = mock_state_with_current_datetime["current_datetime"]
        
        # Mock LLM and parser
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"tasks": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_extracted_tasks_response)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_task_from_note(mock_state_with_current_datetime, mock_runtime)
        
        # Assert - Only extracted_events should be returned
        assert isinstance(result, dict)
        assert len(result.keys()) == 1
        assert "extracted_events" in result
        
        # Original state should remain unchanged
        assert mock_state_with_current_datetime["raw_text"] == original_raw_text
        assert mock_state_with_current_datetime["client_list"] == original_client_list
        assert mock_state_with_current_datetime["current_datetime"] == original_current_datetime
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_task_from_note.ChatTongyi')
    @patch('agent.nodes.extract_task_from_note.PydanticOutputParser')
    async def test_extract_task_return_type_structure(
        self, mock_parser_class, mock_llm_class, mock_runtime, 
        sample_extracted_tasks_response, mock_state_with_current_datetime
    ):
        """Test extraction returns proper dictionary structure with all required fields."""
        # Mock LLM and parser
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"tasks": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_extracted_tasks_response)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_task_from_note(mock_state_with_current_datetime, mock_runtime)
        
        # Assert return structure
        assert isinstance(result, dict)
        assert len(result) == 1
        assert "extracted_events" in result
        assert isinstance(result["extracted_events"], list)
        
        # Verify complete task structure
        if result["extracted_events"]:
            event = result["extracted_events"][0]
            required_fields = [
                "event_type", "raw_title", "raw_date_time", "raw_location", 
                "related_party_name", "note", "confidence", "voice_note_details"
            ]
            for field in required_fields:
                assert field in event
                
            # Verify voice_note_details structure
            voice_details = event["voice_note_details"]
            detail_fields = [
                "original_mention", "client_match_confidence", 
                "time_interpretation", "speech_patterns"
            ]
            for field in detail_fields:
                assert field in voice_details
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_task_from_note.ChatTongyi')
    @patch('agent.nodes.extract_task_from_note.PydanticOutputParser')
    async def test_extract_task_with_legal_terminology(
        self, mock_parser_class, mock_llm_class, mock_runtime, mock_state_with_current_datetime
    ):
        """Test extraction handles legal terminology in voice notes."""
        # Arrange - Legal terminology voice note
        mock_state_with_current_datetime["raw_text"] = "记得明天提交诉讼材料，还有准备庭审的证据清单"
        
        # Create tasks with legal terminology
        legal_task1 = Task(
            event_type="general_task",
            raw_title="提交诉讼材料",
            raw_date_time="2025-03-26T09:00:00+08:00",
            raw_location=None,
            related_party_name=None,
            note="记得明天提交诉讼材料",
            confidence=0.85,
            voice_note_details=VoiceNoteDetails(
                original_mention=None,
                client_match_confidence=None,
                time_interpretation="相对时间-明天→2025-03-26T09:00:00+08:00",
                speech_patterns=["记得", "提交"]
            )
        )
        
        legal_task2 = Task(
            event_type="general_task",
            raw_title="准备庭审的证据清单",
            raw_date_time=None,
            raw_location=None,
            related_party_name=None,
            note="准备庭审的证据清单",
            confidence=0.82,
            voice_note_details=VoiceNoteDetails(
                original_mention=None,
                client_match_confidence=None,
                time_interpretation="无具体时间",
                speech_patterns=["准备", "庭审"]
            )
        )
        
        legal_response = ExtractedTasks(tasks=[legal_task1, legal_task2])
        
        # Mock LLM and parser
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"tasks": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=legal_response)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_task_from_note(mock_state_with_current_datetime, mock_runtime)
        
        # Assert legal term handling
        assert len(result["extracted_events"]) == 2
        
        # Verify legal terminology preservation
        titles = [event["raw_title"] for event in result["extracted_events"]]
        assert "提交诉讼材料" in titles
        assert "准备庭审的证据清单" in titles
        
        # Verify speech patterns include legal terms
        patterns = []
        for event in result["extracted_events"]:
            patterns.extend(event["voice_note_details"]["speech_patterns"])
        assert "庭审" in patterns
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_task_from_note.ChatTongyi')
    @patch('agent.nodes.extract_task_from_note.PydanticOutputParser')
    async def test_extract_task_with_contact_information(
        self, mock_parser_class, mock_llm_class, mock_runtime, mock_state_with_current_datetime
    ):
        """Test extraction of tasks involving contact information."""
        # Arrange - Contact-related task
        mock_state_with_current_datetime["raw_text"] = "提醒我联系对方律师李明确认收到函件"
        
        contact_task = Task(
            event_type="general_task",
            raw_title="联系李明确认函件接收情况",
            raw_date_time=None,
            raw_location=None,
            related_party_name="李明",
            note="提醒我联系对方律师李明确认收到函件",
            confidence=0.87,
            voice_note_details=VoiceNoteDetails(
                original_mention="李明",
                client_match_confidence=0.3,  # Low confidence - not in client list
                time_interpretation="无具体时间",
                speech_patterns=["提醒我", "联系", "确认"]
            )
        )
        
        contact_response = ExtractedTasks(tasks=[contact_task])
        
        # Mock LLM and parser
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"tasks": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=contact_response)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_task_from_note(mock_state_with_current_datetime, mock_runtime)
        
        # Assert contact information handling
        assert len(result["extracted_events"]) == 1
        event = result["extracted_events"][0]
        
        # Verify contact person was extracted
        assert event["related_party_name"] == "李明"
        assert "联系" in event["raw_title"]
        assert "确认" in event["raw_title"]
        
        # Verify contact-related speech patterns
        speech_patterns = event["voice_note_details"]["speech_patterns"]
        assert "联系" in speech_patterns
        assert "确认" in speech_patterns
    
    # === ERROR HANDLING AND EDGE CASES ===
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_task_from_note.ChatTongyi')
    async def test_llm_call_failure_with_retry(
        self, mock_llm_class, mock_runtime, mock_state_with_current_datetime
    ):
        """Test LLM call failure triggers retry mechanism."""
        # Arrange - Mock LLM to fail twice, succeed on third attempt
        mock_llm = Mock()
        mock_llm.invoke.side_effect = [
            Exception("Connection timeout"),
            Exception("Rate limit exceeded"),
            Mock(content='{"tasks": []}')
        ]
        mock_llm_class.return_value = mock_llm
        
        with patch('agent.nodes.extract_task_from_note.PydanticOutputParser') as mock_parser_class:
            mock_parser = Mock()
            mock_parser.parse = Mock(return_value=ExtractedTasks(tasks=[]))
            mock_parser.get_format_instructions = Mock(return_value="format instructions")
            mock_parser_class.return_value = mock_parser
            
            # Act
            result = await extract_task_from_note(mock_state_with_current_datetime, mock_runtime)
            
            # Assert
            assert result["extracted_events"] == []
            # Should have called invoke 3 times (2 failures + 1 success)
            assert mock_llm.invoke.call_count == 3
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_task_from_note.ChatTongyi')
    async def test_llm_call_exhausts_all_retries(
        self, mock_llm_class, mock_runtime, mock_state_with_current_datetime
    ):
        """Test LLM call failure exhausts all retries and returns empty."""
        # Arrange - Mock LLM to always fail
        mock_llm = Mock()
        mock_llm.invoke.side_effect = Exception("Persistent failure")
        mock_llm_class.return_value = mock_llm
        
        # Act
        result = await extract_task_from_note(mock_state_with_current_datetime, mock_runtime)
        
        # Assert graceful degradation
        assert result["extracted_events"] == []
        # Should have attempted max_retries + 1 = 3 times
        assert mock_llm.invoke.call_count == 3
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_task_from_note.ChatTongyi')
    @patch('agent.nodes.extract_task_from_note.PydanticOutputParser')
    async def test_json_parsing_failure(
        self, mock_parser_class, mock_llm_class, mock_runtime, mock_state_with_current_datetime
    ):
        """Test JSON parsing failure is handled gracefully."""
        # Arrange - Mock LLM returns valid response, but parser fails
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = "Invalid JSON response"
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse.side_effect = ValueError("Invalid JSON format")
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_task_from_note(mock_state_with_current_datetime, mock_runtime)
        
        # Assert graceful degradation
        assert result["extracted_events"] == []
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_task_from_note.ChatTongyi')
    @patch('agent.nodes.extract_task_from_note.PydanticOutputParser')
    async def test_pydantic_validation_failure(
        self, mock_parser_class, mock_llm_class, mock_runtime, mock_state_with_current_datetime
    ):
        """Test Pydantic validation failure is handled gracefully."""
        # Arrange - Mock parser to raise validation error
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"tasks": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        from pydantic import ValidationError
        # Create a proper ValidationError with the right structure
        validation_error = ValidationError.from_exception_data(
            "ExtractedTasks", 
            [{"type": "missing", "loc": ("tasks",), "msg": "field required", "input": {}}]
        )
        mock_parser.parse.side_effect = validation_error
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_task_from_note(mock_state_with_current_datetime, mock_runtime)
        
        # Assert graceful degradation
        assert result["extracted_events"] == []
    
    @pytest.mark.asyncio
    async def test_missing_required_state_fields(self, mock_runtime):
        """Test handling of missing required state fields."""
        # Arrange - Minimal state missing some fields
        minimal_state = {
            "source_type": "asr",
            "raw_text": "提醒我明天开会"
            # Missing: client_list_formatted, current_datetime, dashscope_api_key
        }
        
        # Act & Assert - Should handle gracefully
        result = await extract_task_from_note(minimal_state, mock_runtime)
        
        # Should return empty result rather than crash
        assert "extracted_events" in result
        assert isinstance(result["extracted_events"], list)
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_task_from_note.ChatTongyi')
    @patch('agent.nodes.extract_task_from_note.PydanticOutputParser')
    @patch('agent.nodes.extract_task_from_note.asyncio.to_thread')
    async def test_async_behavior_with_asyncio_to_thread(
        self, mock_to_thread, mock_parser_class, mock_llm_class, mock_runtime, 
        sample_extracted_tasks_response, mock_state_with_current_datetime
    ):
        """Test async behavior using asyncio.to_thread for LLM calls."""
        # Arrange
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"tasks": [...]}'
        
        # Mock asyncio.to_thread to return our expected values directly
        mock_to_thread.side_effect = [
            mock_response,  # First call returns LLM response
            sample_extracted_tasks_response  # Second call returns parsed result
        ]
        
        mock_llm_class.return_value = mock_llm
        mock_parser = Mock()
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_task_from_note(mock_state_with_current_datetime, mock_runtime)
        
        # Assert async calls were made
        assert mock_to_thread.call_count == 2  # One for invoke, one for parse
        assert "extracted_events" in result
        assert len(result["extracted_events"]) == 1  # Should have extracted the sample task
    
    @pytest.mark.asyncio
    async def test_unexpected_exception_handling(self, mock_runtime, mock_state_with_current_datetime):
        """Test handling of unexpected exceptions throughout the function."""
        # Arrange - Trigger unexpected exception during initialization
        with patch('agent.nodes.extract_task_from_note.ChatTongyi') as mock_llm_class:
            mock_llm_class.side_effect = RuntimeError("Unexpected initialization error")
            
            # Act
            result = await extract_task_from_note(mock_state_with_current_datetime, mock_runtime)
            
            # Assert graceful degradation
            assert "extracted_events" in result
            assert result["extracted_events"] == []
    
    # === PYDANTIC MODEL VALIDATION TESTS ===
    
    def test_task_pydantic_model_structure(self):
        """Test Task Pydantic model validates required fields correctly."""
        # Test valid task creation
        valid_task = Task(
            event_type="general_task",
            raw_title="测试任务",
            raw_date_time="2025-03-26T09:00:00+08:00",
            raw_location="会议室",
            related_party_name="张三",
            note="测试用的任务备注",
            confidence=0.95,
            voice_note_details=VoiceNoteDetails(
                original_mention="张三",
                client_match_confidence=0.8,
                time_interpretation="明天上午",
                speech_patterns=["提醒我", "开会"]
            )
        )
        
        assert valid_task.event_type == "general_task"
        assert valid_task.raw_title == "测试任务"
        assert valid_task.confidence == 0.95
        assert isinstance(valid_task.voice_note_details, VoiceNoteDetails)
    
    def test_task_model_with_optional_fields_none(self):
        """Test Task model handles optional None fields correctly."""
        minimal_task = Task(
            raw_title="简单任务",
            raw_date_time=None,
            raw_location=None,
            related_party_name=None,
            note="简单备注",
            confidence=0.5,
            voice_note_details=VoiceNoteDetails(
                original_mention=None,
                client_match_confidence=None,
                time_interpretation="无具体时间",
                speech_patterns=[]
            )
        )
        
        assert minimal_task.event_type == "general_task"  # Should default
        assert minimal_task.raw_date_time is None
        assert minimal_task.raw_location is None
        assert minimal_task.related_party_name is None
        assert minimal_task.voice_note_details.original_mention is None
    
    def test_extracted_tasks_model_with_empty_list(self):
        """Test ExtractedTasks model handles empty task list."""
        empty_tasks = ExtractedTasks(tasks=[])
        assert empty_tasks.tasks == []
        assert isinstance(empty_tasks.tasks, list)
    
    def test_voice_note_details_model_structure(self):
        """Test VoiceNoteDetails model validates speech patterns correctly."""
        voice_details = VoiceNoteDetails(
            original_mention="阿里巴巴",
            client_match_confidence=0.95,
            time_interpretation="相对时间-明天上午→2025-03-26T09:00:00+08:00",
            speech_patterns=["提醒我", "那个案子", "跟进一下"]
        )
        
        assert voice_details.original_mention == "阿里巴巴"
        assert voice_details.client_match_confidence == 0.95
        assert len(voice_details.speech_patterns) == 3
        assert "提醒我" in voice_details.speech_patterns