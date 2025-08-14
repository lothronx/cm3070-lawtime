"""Unit tests for initialize_agent_state node."""

import pytest
from unittest.mock import Mock

from agent.nodes.initialize_agent_state import initialize_agent_state, validate_frontend_input
from agent.utils.state import AgentState
from tests.fixtures.mock_data import get_mock_ocr_request, get_mock_asr_request, MOCK_CLIENT_LIST


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


class TestValidateFrontendInput:
    """Test cases for validate_frontend_input function."""
    
    def test_valid_ocr_input(self):
        """Test validation passes for valid OCR input."""
        input_state = get_mock_ocr_request()
        # Should not raise any exception
        validate_frontend_input(input_state)
    
    def test_valid_asr_input(self):
        """Test validation passes for valid ASR input."""
        input_state = get_mock_asr_request()
        # Should not raise any exception
        validate_frontend_input(input_state)
    
    def test_missing_source_type(self):
        """Test validation fails when source_type is missing."""
        input_state = {
            "source_file_urls": ["http://example.com/test.jpg"],
            "client_list": MOCK_CLIENT_LIST
        }
        
        with pytest.raises(ValueError, match="source_type is required"):
            validate_frontend_input(input_state)
    
    def test_empty_source_type(self):
        """Test validation fails when source_type is empty."""
        input_state = {
            "source_type": "",
            "source_file_urls": ["http://example.com/test.jpg"],
            "client_list": MOCK_CLIENT_LIST
        }
        
        with pytest.raises(ValueError, match="source_type is required"):
            validate_frontend_input(input_state)
    
    def test_invalid_source_type(self):
        """Test validation fails for invalid source_type."""
        input_state = {
            "source_type": "invalid",
            "source_file_urls": ["http://example.com/test.jpg"],
            "client_list": MOCK_CLIENT_LIST
        }
        
        with pytest.raises(ValueError, match="source_type must be 'ocr' or 'asr', got 'invalid'"):
            validate_frontend_input(input_state)
    
    def test_missing_source_file_urls(self):
        """Test validation fails when source_file_urls is missing."""
        input_state = {
            "source_type": "ocr",
            "client_list": MOCK_CLIENT_LIST
        }
        
        with pytest.raises(ValueError, match="source_file_urls is required and cannot be empty"):
            validate_frontend_input(input_state)
    
    def test_empty_source_file_urls(self):
        """Test validation fails when source_file_urls is empty list."""
        input_state = {
            "source_type": "ocr",
            "source_file_urls": [],
            "client_list": MOCK_CLIENT_LIST
        }
        
        with pytest.raises(ValueError, match="source_file_urls is required and cannot be empty"):
            validate_frontend_input(input_state)
    
    def test_invalid_source_file_urls_type(self):
        """Test validation fails when source_file_urls is not a list."""
        input_state = {
            "source_type": "ocr",
            "source_file_urls": "not_a_list",
            "client_list": MOCK_CLIENT_LIST
        }
        
        with pytest.raises(ValueError, match="source_file_urls must be a list"):
            validate_frontend_input(input_state)
    
    def test_invalid_source_file_urls_content(self):
        """Test validation fails when source_file_urls contains invalid URLs."""
        input_state = {
            "source_type": "ocr",
            "source_file_urls": ["http://example.com/test.jpg", "", "valid_url.jpg"],
            "client_list": MOCK_CLIENT_LIST
        }
        
        with pytest.raises(ValueError, match="All source_file_urls must be non-empty strings"):
            validate_frontend_input(input_state)
    
    def test_invalid_client_list_type(self):
        """Test validation fails when client_list is not a list."""
        input_state = {
            "source_type": "ocr",
            "source_file_urls": ["http://example.com/test.jpg"],
            "client_list": "not_a_list"
        }
        
        with pytest.raises(ValueError, match="client_list must be a list"):
            validate_frontend_input(input_state)
    
    def test_invalid_client_list_item_type(self):
        """Test validation fails when client_list contains non-dict items."""
        input_state = {
            "source_type": "ocr",
            "source_file_urls": ["http://example.com/test.jpg"],
            "client_list": [{"client_name": "Valid Client"}, "invalid_item"]
        }
        
        with pytest.raises(ValueError, match="client_list\\[1\\] must be a dictionary"):
            validate_frontend_input(input_state)
    
    def test_invalid_client_list_missing_name(self):
        """Test validation fails when client_list item missing client_name field."""
        input_state = {
            "source_type": "ocr",
            "source_file_urls": ["http://example.com/test.jpg"],
            "client_list": [{"client_name": "Valid Client"}, {"id": 123}]  # Missing 'client_name'
        }
        
        with pytest.raises(ValueError, match="client_list\\[1\\] must have a 'client_name' field"):
            validate_frontend_input(input_state)
    
    def test_valid_input_without_client_list(self):
        """Test validation passes when client_list is None or missing."""
        input_state = {
            "source_type": "ocr",
            "source_file_urls": ["http://example.com/test.jpg"]
        }
        
        # Should not raise any exception
        validate_frontend_input(input_state)
        
        # Test with explicit None
        input_state["client_list"] = None
        validate_frontend_input(input_state)


class TestInitializeAgentState:
    """Test cases for initialize_agent_state node."""
    
    @pytest.mark.asyncio
    async def test_initialize_ocr_state_with_full_input(self, mock_runtime):
        """Test initializing state for OCR workflow with complete input."""
        # Arrange
        input_state = get_mock_ocr_request()
        
        # Act
        result = await initialize_agent_state(input_state, mock_runtime)
        
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
        assert result["raw_text"] == ""
    
    @pytest.mark.asyncio
    async def test_initialize_state_with_none_client_list(self, mock_runtime):
        """Test initialization when client_list is explicitly None."""
        # Arrange
        input_state = {
            "source_type": "asr",
            "source_file_urls": ["http://example.com/audio.m4a"],
            "client_list": None
        }
        
        # Act
        result = await initialize_agent_state(input_state, mock_runtime)
        
        # Assert - Verify default client_list is set
        assert result["client_list"] == []
    
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
        assert result["client_list"] == []
        assert result["raw_text"] == ""
        assert result["extracted_events"] == []
        assert result["proposed_tasks"] == []
        assert result["identified_parties"] is None
        assert result["document_type"] is None
        assert result["validation_passed"] is None
    
    @pytest.mark.asyncio
    async def test_validation_error_propagates(self, mock_runtime):
        """Test that validation errors are properly propagated."""
        # Arrange
        input_state = {
            "source_type": "invalid",
            "source_file_urls": ["http://example.com/test.jpg"]
        }
        
        # Act & Assert
        with pytest.raises(ValueError, match="source_type must be 'ocr' or 'asr', got 'invalid'"):
            await initialize_agent_state(input_state, mock_runtime)
    
    @pytest.mark.asyncio
    async def test_empty_source_file_urls_error(self, mock_runtime):
        """Test that empty source_file_urls raises appropriate error."""
        # Arrange
        input_state = {
            "source_type": "ocr",
            "source_file_urls": []
        }
        
        # Act & Assert
        with pytest.raises(ValueError, match="source_file_urls is required and cannot be empty"):
            await initialize_agent_state(input_state, mock_runtime)
    
    @pytest.mark.asyncio
    async def test_preserves_existing_client_list(self, mock_runtime):
        """Test that existing valid client_list is preserved."""
        # Arrange
        input_state = {
            "source_type": "ocr",
            "source_file_urls": ["http://example.com/test.jpg"],
            "client_list": MOCK_CLIENT_LIST
        }
        
        # Act
        result = await initialize_agent_state(input_state, mock_runtime)
        
        assert "client_list" in result