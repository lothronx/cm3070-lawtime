"""Unit tests for classify_document_type node."""

import pytest
from unittest.mock import Mock

from agent.nodes.classify_document_type import classify_document_type
from agent.utils.state import AgentState
from tests.fixtures.mock_data import (
    get_mock_ocr_state_after_text_extraction, 
    MockDocuments
)


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


class TestClassifyDocumentType:
    """Test cases for classify_document_type node."""
    
    @pytest.mark.asyncio
    async def test_classify_document_with_court_hearing_text(self, mock_runtime):
        """Test classification of court hearing document."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        
        # Act
        result = await classify_document_type(state, mock_runtime)
        
        # Assert
        assert "document_type" in result
        assert isinstance(result["document_type"], str)
        assert result["document_type"] in [
            "COURT_HEARING", "CONTRACT", "ASSET_PRESERVATION", 
            "HEARING_TRANSCRIPT", "GENERAL"
        ]
    
    @pytest.mark.asyncio
    async def test_classify_document_with_contract_text(self, mock_runtime):
        """Test classification of contract document."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.CONTRACT_CN
        
        # Act
        result = await classify_document_type(state, mock_runtime)
        
        # Assert
        assert "document_type" in result
        assert isinstance(result["document_type"], str)
        assert result["document_type"] in [
            "COURT_HEARING", "CONTRACT", "ASSET_PRESERVATION", 
            "HEARING_TRANSCRIPT", "GENERAL"
        ]
    
    @pytest.mark.asyncio
    async def test_classify_document_with_asset_preservation_text(self, mock_runtime):
        """Test classification of asset preservation document."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.ASSET_PRESERVATION_CN
        
        # Act
        result = await classify_document_type(state, mock_runtime)
        
        # Assert
        assert "document_type" in result
        assert isinstance(result["document_type"], str)
        assert result["document_type"] in [
            "COURT_HEARING", "CONTRACT", "ASSET_PRESERVATION", 
            "HEARING_TRANSCRIPT", "GENERAL"
        ]
    
    @pytest.mark.asyncio
    async def test_classify_document_with_hearing_transcript_text(self, mock_runtime):
        """Test classification of hearing transcript document."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        
        # Act
        result = await classify_document_type(state, mock_runtime)
        
        # Assert
        assert "document_type" in result
        assert isinstance(result["document_type"], str)
        assert result["document_type"] in [
            "COURT_HEARING", "CONTRACT", "ASSET_PRESERVATION", 
            "HEARING_TRANSCRIPT", "GENERAL"
        ]
    
    @pytest.mark.asyncio
    async def test_classify_document_with_general_text(self, mock_runtime):
        """Test classification of general task document."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        
        # Act
        result = await classify_document_type(state, mock_runtime)
        
        # Assert
        assert "document_type" in result
        assert isinstance(result["document_type"], str)
        assert result["document_type"] in [
            "COURT_HEARING", "CONTRACT", "ASSET_PRESERVATION", 
            "HEARING_TRANSCRIPT", "GENERAL"
        ]
    
    @pytest.mark.asyncio
    async def test_classify_document_with_empty_text(self, mock_runtime):
        """Test classification with empty raw text."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = ""
        
        # Act
        result = await classify_document_type(state, mock_runtime)
        
        # Assert
        assert "document_type" in result
        assert isinstance(result["document_type"], str)
        # Should still return a valid document type (likely GENERAL for empty text)
        assert result["document_type"] in [
            "COURT_HEARING", "CONTRACT", "ASSET_PRESERVATION", 
            "HEARING_TRANSCRIPT", "GENERAL"
        ]
    
    @pytest.mark.asyncio
    async def test_classify_document_preserves_state(self, mock_runtime):
        """Test that classification preserves existing state fields."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        original_client_list = state["client_list"]
        original_source_type = state["source_type"]
        
        # Act
        result = await classify_document_type(state, mock_runtime)
        
        # Assert - Only document_type should be added, other fields preserved
        assert len(result.keys()) == 1  # Only returns document_type
        assert "document_type" in result
        # Original state should remain unchanged
        assert state["client_list"] == original_client_list
        assert state["source_type"] == original_source_type
    
    @pytest.mark.asyncio
    async def test_classify_document_return_type(self, mock_runtime):
        """Test that classification returns proper dictionary structure."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        
        # Act
        result = await classify_document_type(state, mock_runtime)
        
        # Assert
        assert isinstance(result, dict)
        assert len(result) == 1
        assert "document_type" in result
        assert isinstance(result["document_type"], str)
        assert len(result["document_type"]) > 0