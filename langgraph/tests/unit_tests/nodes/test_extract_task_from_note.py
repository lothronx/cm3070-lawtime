"""Unit tests for extract_task_from_note node."""

import pytest
from unittest.mock import Mock

from agent.nodes.extract_task_from_note import extract_task_from_note
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


class TestExtractTaskFromNote:
    """Test cases for extract_task_from_note node."""
    
    @pytest.mark.asyncio
    async def test_extract_task_from_voice_note(self, mock_runtime):
        """Test task extraction from voice note transcription."""
        # Arrange
        state = get_mock_asr_state_after_transcription()
        state["raw_text"] = MockDocuments.VOICE_NOTE_CN
        
        # Act
        result = await extract_task_from_note(state, mock_runtime)
        
        # Assert
        assert "extracted_events" in result
        assert isinstance(result["extracted_events"], list)
        assert len(result["extracted_events"]) > 0
        
        # Verify event structure
        for event in result["extracted_events"]:
            assert isinstance(event, dict)
            # Should contain required fields (structure may vary in implementation)
            assert "title" in event or "raw_title" in event
    
    @pytest.mark.asyncio
    async def test_extract_task_with_client_matching(self, mock_runtime):
        """Test task extraction with client name matching."""
        # Arrange
        state = get_mock_asr_state_after_transcription()
        state["raw_text"] = "提醒我明天上午跟进一下阿里巴巴那个案子"
        state["client_list"] = MOCK_CLIENT_LIST
        
        # Act
        result = await extract_task_from_note(state, mock_runtime)
        
        # Assert
        assert "extracted_events" in result
        assert isinstance(result["extracted_events"], list)
        
        # Should identify client from voice note
        for event in result["extracted_events"]:
            assert isinstance(event, dict)
            # Event should reference client or party
            assert any(field in event for field in ["client_name", "related_party_name", "title"])
    
    @pytest.mark.asyncio
    async def test_extract_task_with_time_information(self, mock_runtime):
        """Test extraction of time-specific tasks from voice note."""
        # Arrange
        state = get_mock_asr_state_after_transcription()
        state["raw_text"] = "下午两点在星巴克跟张三开个会"
        
        # Act
        result = await extract_task_from_note(state, mock_runtime)
        
        # Assert
        assert "extracted_events" in result
        assert isinstance(result["extracted_events"], list)
        assert len(result["extracted_events"]) > 0
        
        # Should extract time and location details
        for event in result["extracted_events"]:
            assert isinstance(event, dict)
            # Time/location should be captured in some form
            assert any(field in event for field in ["event_time", "raw_date_time", "location", "raw_location"])
    
    @pytest.mark.asyncio
    async def test_extract_task_with_multiple_tasks(self, mock_runtime):
        """Test extraction of multiple tasks from single voice note."""
        # Arrange
        state = get_mock_asr_state_after_transcription()
        state["raw_text"] = MockDocuments.VOICE_NOTE_CN  # Contains multiple tasks
        
        # Act
        result = await extract_task_from_note(state, mock_runtime)
        
        # Assert
        assert "extracted_events" in result
        assert isinstance(result["extracted_events"], list)
        # Voice note contains multiple tasks - should extract all
        # (Exact count depends on implementation, but should be > 0)
        assert len(result["extracted_events"]) > 0
    
    @pytest.mark.asyncio
    async def test_extract_task_with_empty_text(self, mock_runtime):
        """Test extraction with empty transcribed text."""
        # Arrange
        state = get_mock_asr_state_after_transcription()
        state["raw_text"] = ""
        
        # Act
        result = await extract_task_from_note(state, mock_runtime)
        
        # Assert
        assert "extracted_events" in result
        assert isinstance(result["extracted_events"], list)
        # Empty text should result in empty events list
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    async def test_extract_task_with_unclear_voice_note(self, mock_runtime):
        """Test extraction with unclear or garbled transcription."""
        # Arrange
        state = get_mock_asr_state_after_transcription()
        state["raw_text"] = "嗯...那个...就是...开会什么的"
        
        # Act
        result = await extract_task_from_note(state, mock_runtime)
        
        # Assert
        assert "extracted_events" in result
        assert isinstance(result["extracted_events"], list)
        # Unclear text might result in no events or generic task
        # Implementation should handle gracefully
    
    @pytest.mark.asyncio
    async def test_extract_task_preserves_state(self, mock_runtime):
        """Test that extraction only returns extracted_events and preserves state."""
        # Arrange
        state = get_mock_asr_state_after_transcription()
        original_raw_text = state["raw_text"]
        original_client_list = state["client_list"]
        
        # Act
        result = await extract_task_from_note(state, mock_runtime)
        
        # Assert - Only extracted_events should be returned
        assert len(result.keys()) == 1
        assert "extracted_events" in result
        # Original state should remain unchanged
        assert state["raw_text"] == original_raw_text
        assert state["client_list"] == original_client_list
    
    @pytest.mark.asyncio
    async def test_extract_task_return_type(self, mock_runtime):
        """Test extraction returns proper dictionary structure."""
        # Arrange
        state = get_mock_asr_state_after_transcription()
        
        # Act
        result = await extract_task_from_note(state, mock_runtime)
        
        # Assert
        assert isinstance(result, dict)
        assert len(result) == 1
        assert "extracted_events" in result
        assert isinstance(result["extracted_events"], list)
    
    @pytest.mark.asyncio
    async def test_extract_task_with_legal_terminology(self, mock_runtime):
        """Test extraction handles legal terminology in voice notes."""
        # Arrange
        state = get_mock_asr_state_after_transcription()
        state["raw_text"] = "记得明天提交诉讼材料，还有准备庭审的证据清单"
        
        # Act
        result = await extract_task_from_note(state, mock_runtime)
        
        # Assert
        assert "extracted_events" in result
        assert isinstance(result["extracted_events"], list)
        # Should handle legal terms and extract relevant tasks
        assert len(result["extracted_events"]) > 0
    
    @pytest.mark.asyncio
    async def test_extract_task_with_contact_information(self, mock_runtime):
        """Test extraction of tasks involving contact information."""
        # Arrange
        state = get_mock_asr_state_after_transcription()
        state["raw_text"] = "提醒我联系对方律师李明确认收到函件"
        
        # Act
        result = await extract_task_from_note(state, mock_runtime)
        
        # Assert
        assert "extracted_events" in result
        assert isinstance(result["extracted_events"], list)
        assert len(result["extracted_events"]) > 0
        
        # Should capture contact-related task details
        for event in result["extracted_events"]:
            assert isinstance(event, dict)
            # Should contain task information about contacting someone