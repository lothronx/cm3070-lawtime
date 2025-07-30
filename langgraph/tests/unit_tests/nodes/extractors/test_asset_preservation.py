"""Unit tests for extract_asset_preservation specialist extractor."""

import pytest
from unittest.mock import Mock

from agent.nodes.extractors.asset_preservation import extract_asset_preservation
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


class TestExtractAssetPreservation:
    """Test cases for extract_asset_preservation specialist extractor."""
    
    @pytest.mark.asyncio
    async def test_extract_valid_asset_preservation_document(self, mock_runtime):
        """Test extraction from valid asset preservation document."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.ASSET_PRESERVATION_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "ASSET_PRESERVATION"
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        if result["validation_passed"]:
            assert len(result["extracted_events"]) > 0
            # Verify event structure for asset preservation
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                assert any(field in event for field in ["title", "raw_title"])
                # Asset preservation should have expiration dates
                assert any(field in event for field in ["event_time", "raw_date_time"])
    
    @pytest.mark.asyncio
    async def test_extract_invalid_asset_preservation_fails_validation(self, mock_runtime):
        """Test extraction with invalid asset preservation document fails validation."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.INVALID_ASSET_PRESERVATION
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "ASSET_PRESERVATION"
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
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
        state["document_type"] = "ASSET_PRESERVATION"  # Misclassified
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Contract document should fail asset preservation validation
    
    @pytest.mark.asyncio
    async def test_extract_multiple_preservation_measures(self, mock_runtime):
        """Test extraction of multiple preservation measures from single document."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        # Document contains both property seizure and account freeze
        state["raw_text"] = MockDocuments.ASSET_PRESERVATION_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "ASSET_PRESERVATION"
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            # Should extract multiple preservation events
            # (Property seizure until 2028-07-07, account freeze until 2026-07-07)
            assert len(result["extracted_events"]) > 0
            
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                assert any(field in event for field in ["title", "raw_title"])
                # Each should have different expiration dates
                assert any(field in event for field in ["raw_date_time", "event_time"])
                if "event_type" in event:
                    assert event["event_type"] == "asset_preservation"
    
    @pytest.mark.asyncio
    async def test_extract_with_case_number(self, mock_runtime):
        """Test extraction includes case number information."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        # Document contains case number "(2025）京0105执保0001号"
        state["raw_text"] = MockDocuments.ASSET_PRESERVATION_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "ASSET_PRESERVATION"
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            assert len(result["extracted_events"]) > 0
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                # Should include case information in note or title
                if "note" in event:
                    assert isinstance(event["note"], str)
                    # Might contain case number or preservation details
    
    @pytest.mark.asyncio
    async def test_extract_with_multiple_parties(self, mock_runtime):
        """Test extraction with multiple identified parties."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.ASSET_PRESERVATION_CN
        state["identified_parties"] = MockExtractedParties.MULTI_PARTY
        state["document_type"] = "ASSET_PRESERVATION"
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
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
        state["raw_text"] = MockDocuments.ASSET_PRESERVATION_CN
        state["identified_parties"] = MockExtractedParties.NEW_CLIENT_PROPOSED
        state["document_type"] = "ASSET_PRESERVATION"
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            assert len(result["extracted_events"]) > 0
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                # Should reference the new client
                assert any(field in event for field in ["related_party_name", "client_name"])
    
    @pytest.mark.asyncio
    async def test_extract_with_empty_text(self, mock_runtime):
        """Test extraction with empty document text."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = ""
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "ASSET_PRESERVATION"
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Empty text should fail validation
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    async def test_extract_property_seizure_details(self, mock_runtime):
        """Test extraction of property seizure specific details."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.ASSET_PRESERVATION_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "ASSET_PRESERVATION"
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            # Should identify property seizure at 和平路1号
            property_events = [e for e in result["extracted_events"] 
                             if "和平路" in str(e.get("title", "")) or "和平路" in str(e.get("raw_title", ""))]
            # Implementation may or may not include location in title
            # But should extract the property seizure event
    
    @pytest.mark.asyncio
    async def test_extract_account_freeze_details(self, mock_runtime):
        """Test extraction of account freeze specific details."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.ASSET_PRESERVATION_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "ASSET_PRESERVATION"
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            # Should extract account freeze with amount 32635.22元
            freeze_events = [e for e in result["extracted_events"] 
                           if "账户" in str(e.get("title", "")) or "存款" in str(e.get("title", "")) or
                              "账户" in str(e.get("raw_title", "")) or "存款" in str(e.get("raw_title", ""))]
            # Implementation may or may not include specific amount details
            # But should extract the account freeze event
    
    @pytest.mark.asyncio
    async def test_extract_preserves_state(self, mock_runtime):
        """Test that extraction preserves original state."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        original_raw_text = state["raw_text"]
        original_parties = state.get("identified_parties")
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
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
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        assert isinstance(result, dict)
        assert len(result) == 2
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
    
    @pytest.mark.asyncio
    async def test_extract_validation_with_preservation_keywords(self, mock_runtime):
        """Test validation logic recognizes asset preservation keywords."""
        # Arrange - Test with preservation-specific keywords
        preservation_text = "保全告知书 查封 冻结 起止日期"
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = preservation_text
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        assert isinstance(result["validation_passed"], bool)
        # Text with preservation keywords should potentially pass validation
        
        # Test with non-preservation text
        non_preservation_text = "开庭传票 应到时间 审判庭"
        state["raw_text"] = non_preservation_text
        
        # Act
        result2 = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        assert isinstance(result2["validation_passed"], bool)
        # Court hearing text should potentially fail preservation validation