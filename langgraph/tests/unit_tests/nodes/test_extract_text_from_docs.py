"""Unit tests for extract_text_from_docs node."""

import pytest
from unittest.mock import Mock, patch

from agent.nodes.extract_text_from_docs import extract_text_from_docs
from agent.utils.state import AgentState
from tests.fixtures.mock_data import get_mock_initial_state, MockDocuments


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


class TestExtractTextFromDocs:
    """Test cases for extract_text_from_docs node."""
    
    @pytest.mark.asyncio
    async def test_extract_text_placeholder_implementation(self, mock_runtime):
        """Test the current placeholder implementation."""
        # Arrange
        state = get_mock_initial_state("ocr")
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert result["raw_text"] == "Placeholder extracted text from documents"
    
    @pytest.mark.asyncio
    async def test_extract_text_preserves_state_structure(self, mock_runtime):
        """Test that the node returns only the expected state updates."""
        # Arrange
        state = get_mock_initial_state("ocr")
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        # Should only return raw_text update, not modify other state fields
        assert len(result) == 1
        assert "raw_text" in result
        assert "extracted_events" not in result
        assert "document_type" not in result
    
    @pytest.mark.asyncio
    async def test_extract_text_with_single_file(self, mock_runtime):
        """Test OCR extraction with single file URL."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://example.com/court_notice.jpg"]
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert isinstance(result["raw_text"], str)
        assert len(result["raw_text"]) > 0
    
    @pytest.mark.asyncio
    async def test_extract_text_with_multiple_files(self, mock_runtime):
        """Test OCR extraction with multiple file URLs."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = [
            "https://example.com/page1.jpg",
            "https://example.com/page2.jpg",
            "https://example.com/page3.pdf"
        ]
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert isinstance(result["raw_text"], str)
        assert len(result["raw_text"]) > 0
    
    @pytest.mark.asyncio
    async def test_extract_text_with_empty_file_list(self, mock_runtime):
        """Test OCR extraction with empty file list."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = []
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        # Should still return some result (placeholder implementation)
        assert "raw_text" in result
        assert isinstance(result["raw_text"], str)
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.extract_text_from_docs')
    async def test_extract_text_future_implementation_court_hearing(self, mock_extract, mock_runtime):
        """Test future implementation with court hearing document."""
        # Arrange - Mock the future OCR implementation
        mock_extract.return_value = {"raw_text": MockDocuments.COURT_HEARING_CN}
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://example.com/court_hearing.jpg"]
        
        # Act
        result = await mock_extract(state, mock_runtime)
        
        # Assert
        assert result["raw_text"] == MockDocuments.COURT_HEARING_CN
        assert "威海市文登区人民法院" in result["raw_text"]
        assert "开庭传票" in result["raw_text"]
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.extract_text_from_docs')
    async def test_extract_text_future_implementation_contract(self, mock_extract, mock_runtime):
        """Test future implementation with contract document."""
        # Arrange - Mock the future OCR implementation
        mock_extract.return_value = {"raw_text": MockDocuments.CONTRACT_CN}
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://example.com/contract.pdf"]
        
        # Act
        result = await mock_extract(state, mock_runtime)
        
        # Assert
        assert result["raw_text"] == MockDocuments.CONTRACT_CN
        assert "聘请常年法律顾问协议书" in result["raw_text"]
        assert "阿里巴巴（中国）有限公司" in result["raw_text"]
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.extract_text_from_docs')
    async def test_extract_text_future_implementation_asset_preservation(self, mock_extract, mock_runtime):
        """Test future implementation with asset preservation document."""
        # Arrange - Mock the future OCR implementation
        mock_extract.return_value = {"raw_text": MockDocuments.ASSET_PRESERVATION_CN}
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://example.com/preservation_notice.jpg"]
        
        # Act
        result = await mock_extract(state, mock_runtime)
        
        # Assert
        assert result["raw_text"] == MockDocuments.ASSET_PRESERVATION_CN
        assert "保全告知书" in result["raw_text"]
        assert "查封" in result["raw_text"]
        assert "冻结" in result["raw_text"]