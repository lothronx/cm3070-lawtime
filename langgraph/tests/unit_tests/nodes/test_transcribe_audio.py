"""Unit tests for transcribe_audio node."""

import pytest
from unittest.mock import Mock

from agent.nodes.transcribe_audio import transcribe_audio
from agent.utils.state import AgentState
from tests.fixtures.mock_data import (
    get_mock_initial_state,
    get_mock_asr_request,
    MOCK_CLIENT_LIST
)


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


class TestTranscribeAudio:
    """Test cases for transcribe_audio node."""
    
    @pytest.mark.asyncio
    async def test_transcribe_audio_with_asr_state(self, mock_runtime):
        """Test audio transcription for ASR workflow."""
        # Arrange
        state = get_mock_initial_state("asr")
        
        # Act
        result = await transcribe_audio(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert isinstance(result["raw_text"], str)
        assert len(result["raw_text"]) > 0
    
    @pytest.mark.asyncio
    async def test_transcribe_audio_with_single_file(self, mock_runtime):
        """Test transcription with single audio file."""
        # Arrange
        state = get_mock_initial_state("asr")
        state["source_file_urls"] = ["https://example.com/audio1.m4a"]
        
        # Act
        result = await transcribe_audio(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert isinstance(result["raw_text"], str)
        assert len(result["raw_text"]) > 0
    
    @pytest.mark.asyncio
    async def test_transcribe_audio_with_multiple_files(self, mock_runtime):
        """Test transcription with multiple audio files."""
        # Arrange
        state = get_mock_initial_state("asr")
        state["source_file_urls"] = [
            "https://example.com/audio1.m4a",
            "https://example.com/audio2.wav"
        ]
        
        # Act
        result = await transcribe_audio(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert isinstance(result["raw_text"], str)
        assert len(result["raw_text"]) > 0
    
    @pytest.mark.asyncio
    async def test_transcribe_audio_with_client_context(self, mock_runtime):
        """Test transcription uses client list for vocabulary context."""
        # Arrange
        state = get_mock_initial_state("asr")
        state["client_list"] = MOCK_CLIENT_LIST
        
        # Act
        result = await transcribe_audio(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert isinstance(result["raw_text"], str)
        # Client context should be available during transcription
        # (Implementation detail - would be used for custom vocabulary)
    
    @pytest.mark.asyncio
    async def test_transcribe_audio_with_empty_file_list(self, mock_runtime):
        """Test transcription with empty file URLs list."""
        # Arrange
        state = get_mock_initial_state("asr")
        state["source_file_urls"] = []
        
        # Act
        result = await transcribe_audio(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert isinstance(result["raw_text"], str)
        # Should handle empty input gracefully
    
    @pytest.mark.asyncio
    async def test_transcribe_audio_preserves_state(self, mock_runtime):
        """Test that transcription only returns raw_text and preserves state."""
        # Arrange
        state = get_mock_initial_state("asr")
        original_source_type = state["source_type"]
        original_client_list = state["client_list"]
        
        # Act
        result = await transcribe_audio(state, mock_runtime)
        
        # Assert - Only raw_text should be returned
        assert len(result.keys()) == 1
        assert "raw_text" in result
        # Original state should remain unchanged
        assert state["source_type"] == original_source_type
        assert state["client_list"] == original_client_list
    
    @pytest.mark.asyncio
    async def test_transcribe_audio_return_type(self, mock_runtime):
        """Test transcription returns proper dictionary structure."""
        # Arrange
        state = get_mock_initial_state("asr")
        
        # Act
        result = await transcribe_audio(state, mock_runtime)
        
        # Assert
        assert isinstance(result, dict)
        assert len(result) == 1
        assert "raw_text" in result
        assert isinstance(result["raw_text"], str)
    
    @pytest.mark.asyncio
    async def test_transcribe_audio_with_various_audio_formats(self, mock_runtime):
        """Test transcription handles different audio format URLs."""
        # Arrange
        audio_formats = [
            "https://example.com/audio.m4a",
            "https://example.com/audio.wav", 
            "https://example.com/audio.mp3",
            "https://example.com/audio.aac"
        ]
        
        for audio_url in audio_formats:
            state = get_mock_initial_state("asr")
            state["source_file_urls"] = [audio_url]
            
            # Act
            result = await transcribe_audio(state, mock_runtime)
            
            # Assert
            assert "raw_text" in result
            assert isinstance(result["raw_text"], str)
    
    @pytest.mark.asyncio
    async def test_transcribe_audio_with_chinese_legal_context(self, mock_runtime):
        """Test transcription in legal context with Chinese client names."""
        # Arrange
        state = get_mock_initial_state("asr")
        state["client_list"] = [
            {"id": 102, "client_name": "阿里巴巴（中国）有限公司"}
        ]
        
        # Act
        result = await transcribe_audio(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert isinstance(result["raw_text"], str)
        # Should handle Chinese legal vocabulary context