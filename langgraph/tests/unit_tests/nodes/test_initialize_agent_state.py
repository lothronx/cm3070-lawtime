"""Unit tests for initialize_agent_state node."""

import pytest
from unittest.mock import Mock

from agent.nodes.initialize_agent_state import initialize_agent_state
from agent.utils.state import AgentState
from tests.fixtures.mock_data import get_mock_ocr_request, get_mock_asr_request, MOCK_CLIENT_LIST


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


class TestInitializeAgentState:
    """Test cases for initialize_agent_state node."""
    
    @pytest.mark.asyncio
    async def test_initialize_ocr_state_with_full_input(self, mock_runtime):
        """Test initializing state for OCR workflow with complete input."""
        # Arrange
        input_state = get_mock_ocr_request()
        
        # Act
        result = await initialize_agent_state(input_state, mock_runtime)
        
        # Assert - Verify all input fields are preserved
        assert result["source_type"] == "ocr"
        assert result["source_file_urls"] == input_state["source_file_urls"]
        assert result["client_list"] == MOCK_CLIENT_LIST
        
        # Assert - Verify workflow fields are initialized
        assert result["raw_text"] == ""
        assert result["extracted_events"] == []
        assert result["proposed_tasks"] == []
        assert result["identified_parties"] is None
        assert result["document_type"] is None
        assert result["validation_passed"] is None
    
    @pytest.mark.asyncio
    async def test_initialize_asr_state_with_full_input(self, mock_runtime):
        """Test initializing state for ASR workflow with complete input."""
        # Arrange
        input_state = get_mock_asr_request()
        
        # Act
        result = await initialize_agent_state(input_state, mock_runtime)
        
        # Assert - Verify all input fields are preserved
        assert result["source_type"] == "asr"
        assert result["source_file_urls"] == input_state["source_file_urls"]
        assert result["client_list"] == MOCK_CLIENT_LIST
        
        # Assert - Verify workflow fields are initialized
        assert result["raw_text"] == ""
        assert result["extracted_events"] == []
        assert result["proposed_tasks"] == []
        assert result["identified_parties"] is None
        assert result["document_type"] is None
        assert result["validation_passed"] is None
    
    @pytest.mark.asyncio
    async def test_initialize_state_without_client_list(self, mock_runtime):
        """Test initialization when client_list is missing from input."""
        # Arrange
        input_state = {
            "source_type": "ocr",
            "source_file_urls": ["http://example.com/test.jpg"]
        }
        
        # Act
        result = await initialize_agent_state(input_state, mock_runtime)
        
        # Assert - Verify default client_list is set
        assert result["client_list"] == []
        assert result["source_type"] == "ocr"
        assert result["source_file_urls"] == input_state["source_file_urls"]
    
    @pytest.mark.asyncio
    async def test_initialize_state_preserves_existing_fields(self, mock_runtime):
        """Test that any additional fields in input state are preserved."""
        # Arrange
        input_state = get_mock_ocr_request()
        input_state["custom_field"] = "custom_value"
        
        # Act
        result = await initialize_agent_state(input_state, mock_runtime)
        
        # Assert - Verify custom field is preserved
        assert result["custom_field"] == "custom_value"
        assert result["source_type"] == "ocr"
    
    @pytest.mark.asyncio
    async def test_initialize_minimal_state(self, mock_runtime):
        """Test initialization with minimal required fields."""
        # Arrange
        input_state = {
            "source_type": "asr",
            "source_file_urls": ["http://example.com/audio.m4a"]
        }
        
        # Act
        result = await initialize_agent_state(input_state, mock_runtime)
        
        # Assert
        assert result["source_type"] == "asr"
        assert result["source_file_urls"] == input_state["source_file_urls"]
        assert result["client_list"] == []
        assert result["raw_text"] == ""
        assert result["extracted_events"] == []
        assert result["proposed_tasks"] == []