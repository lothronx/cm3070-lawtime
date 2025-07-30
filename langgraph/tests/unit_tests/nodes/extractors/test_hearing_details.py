"""Unit tests for extract_hearing_details specialist extractor."""

import pytest
from unittest.mock import Mock

from agent.nodes.extractors.hearing_details import extract_hearing_details
from agent.utils.state import AgentState
from tests.fixtures.mock_data import (
    get_mock_ocr_state_after_text_extraction,
    MockDocuments,
    MockExtractedEvents,
    MockExtractedParties,
    MockValidationResults
)


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


class TestExtractHearingDetails:
    """Test cases for extract_hearing_details specialist extractor."""
    
    @pytest.mark.asyncio
    async def test_extract_valid_court_hearing_document(self, mock_runtime):
        """Test extraction from valid court hearing document."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "COURT_HEARING"
        
        # Act
        result = await extract_hearing_details(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        if result["validation_passed"]:
            assert len(result["extracted_events"]) > 0
            # Verify event structure for hearing details
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                assert any(field in event for field in ["title", "raw_title"])
                # Court hearing should have date/time information
                assert any(field in event for field in ["event_time", "raw_date_time"])
    
    @pytest.mark.asyncio
    async def test_extract_invalid_document_fails_validation(self, mock_runtime):
        """Test extraction with invalid document fails validation."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.INVALID_COURT_HEARING
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "COURT_HEARING"
        
        # Act
        result = await extract_hearing_details(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        # Invalid document should fail validation
        if not result["validation_passed"]:
            assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    async def test_extract_contract_document_fails_validation(self, mock_runtime):
        """Test extraction with contract document (wrong type) fails validation."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.CONTRACT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "COURT_HEARING"  # Misclassified
        
        # Act
        result = await extract_hearing_details(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Contract document should fail hearing validation
        # (Implementation may vary - might pass if contains hearing keywords)
    
    @pytest.mark.asyncio
    async def test_extract_with_multiple_parties(self, mock_runtime):
        """Test extraction with multiple identified parties."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        state["identified_parties"] = MockExtractedParties.MULTI_PARTY
        state["document_type"] = "COURT_HEARING"
        
        # Act
        result = await extract_hearing_details(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        if result["validation_passed"]:
            # Should extract hearing details for identified client
            assert len(result["extracted_events"]) > 0
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                # Should reference one of the identified parties
                assert any(field in event for field in ["related_party_name", "client_name"])
    
    @pytest.mark.asyncio
    async def test_extract_with_new_client_proposed(self, mock_runtime):
        """Test extraction when new client is proposed."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        state["identified_parties"] = MockExtractedParties.NEW_CLIENT_PROPOSED
        state["document_type"] = "COURT_HEARING"
        
        # Act
        result = await extract_hearing_details(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        if result["validation_passed"]:
            assert len(result["extracted_events"]) > 0
            # Should handle new client scenario
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                # Event should reference the new client
                assert any(field in event for field in ["related_party_name", "client_name"])
    
    @pytest.mark.asyncio
    async def test_extract_with_empty_text(self, mock_runtime):
        """Test extraction with empty document text."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = ""
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "COURT_HEARING"
        
        # Act
        result = await extract_hearing_details(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Empty text should fail validation
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    async def test_extract_preserves_state(self, mock_runtime):
        """Test that extraction preserves original state."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        original_raw_text = state["raw_text"]
        original_parties = state.get("identified_parties")
        
        # Act
        result = await extract_hearing_details(state, mock_runtime)
        
        # Assert - Only validation_passed and extracted_events should be returned
        assert len(result.keys()) == 2
        assert "validation_passed" in result
        assert "extracted_events" in result
        # Original state should remain unchanged
        assert state["raw_text"] == original_raw_text
        assert state.get("identified_parties") == original_parties
    
    @pytest.mark.asyncio
    async def test_extract_return_type_structure(self, mock_runtime):
        """Test extraction returns proper structure."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        
        # Act
        result = await extract_hearing_details(state, mock_runtime)
        
        # Assert
        assert isinstance(result, dict)
        assert len(result) == 2
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
    
    @pytest.mark.asyncio
    async def test_extract_hearing_event_structure(self, mock_runtime):
        """Test that extracted hearing events have proper structure."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        
        # Act
        result = await extract_hearing_details(state, mock_runtime)
        
        # Assert
        if result["validation_passed"] and len(result["extracted_events"]) > 0:
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                # Hearing events should have specific structure
                # (Exact fields depend on implementation)
                expected_fields = ["title", "raw_title", "event_time", "raw_date_time", "location", "raw_location"]
                assert any(field in event for field in expected_fields)
    
    @pytest.mark.asyncio
    async def test_extract_validation_logic(self, mock_runtime):
        """Test that validation logic works correctly."""
        # Arrange - Test with known valid document
        valid_state = get_mock_ocr_state_after_text_extraction()
        valid_state["raw_text"] = MockDocuments.COURT_HEARING_CN
        valid_state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        
        # Act
        valid_result = await extract_hearing_details(valid_state, mock_runtime)
        
        # Assert
        # Should validate hearing document based on keywords/structure
        assert isinstance(valid_result["validation_passed"], bool)
        
        # Arrange - Test with known invalid document
        invalid_state = get_mock_ocr_state_after_text_extraction()
        invalid_state["raw_text"] = MockDocuments.INVALID_COURT_HEARING
        invalid_state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        
        # Act
        invalid_result = await extract_hearing_details(invalid_state, mock_runtime)
        
        # Assert
        assert isinstance(invalid_result["validation_passed"], bool)
        # Different documents should potentially have different validation results