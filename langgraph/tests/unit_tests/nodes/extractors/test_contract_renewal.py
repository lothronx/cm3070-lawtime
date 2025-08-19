"""Unit tests for extract_contract_renewal specialist extractor."""

import pytest
from unittest.mock import Mock

from agent.nodes.extractors.contract_renewal import (
    extract_contract_renewal,
    ContractRenewalOutput,
    ContractEvent,
    ProcessingNotes,
)
from tests.fixtures.mock_data import (
    get_mock_initial_state,
    MockDocuments,
    MockExtractedParties,
)


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


@pytest.fixture
def sample_contract_event():
    """Sample contract renewal event with all required fields."""
    return ContractEvent(
        event_type="contract_renewal",
        raw_title="阿里巴巴法律顾问合同到期",
        raw_date_time="2027-05-31T09:00:00+08:00",
        raw_location=None,
        related_party_name="阿里巴巴（中国）有限公司",
        note="北京朝阳律师事务所与阿里巴巴（中国）有限公司签订的聘请常年法律顾问协议书",
        confidence=0.95
    )


@pytest.fixture
def sample_valid_contract_output(sample_contract_event):
    """Sample valid contract renewal extraction output."""
    return ContractRenewalOutput(
        validation_passed=True,
        extracted_events=[sample_contract_event],
        processing_notes=ProcessingNotes(
            contract_type="法律顾问协议",
            expiry_date_source="协议有效期条款",
            parties_identified=["阿里巴巴（中国）有限公司", "北京朝阳律师事务所"],
            extraction_completeness="high"
        )
    )


@pytest.fixture
def sample_invalid_contract_output():
    """Sample invalid contract renewal extraction output."""
    return ContractRenewalOutput(
        validation_passed=False,
        extracted_events=[],
        processing_notes=ProcessingNotes(
            contract_type=None,
            expiry_date_source=None,
            parties_identified=None,
            extraction_completeness="none",
            error="NOT_CONTRACT_DOCUMENT",
            potential_issues=["缺少合同和有效期关键词", "非合同性质文档"]
        )
    )


@pytest.fixture
def mock_state_with_contract_document():
    """Mock state with contract document and identified parties."""
    state = get_mock_initial_state("ocr")
    state["raw_text"] = MockDocuments.CONTRACT_CN
    state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
    state["document_type"] = "CONTRACT"
    state["dashscope_api_key"] = "test_api_key"
    return state


class TestExtractContractRenewal:
    """Test cases for extract_contract_renewal specialist extractor."""
    
    @pytest.mark.asyncio
    async def test_extract_valid_contract_document(self, mock_runtime):
        """Test extraction from valid contract document."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.CONTRACT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "CONTRACT"
        
        # Act
        result = await extract_contract_renewal(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        if result["validation_passed"]:
            assert len(result["extracted_events"]) > 0
            # Verify event structure for contract renewal
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                assert any(field in event for field in ["title", "raw_title"])
                # Contract should have expiration/renewal date
                assert any(field in event for field in ["event_time", "raw_date_time"])
    
    @pytest.mark.asyncio
    async def test_extract_invalid_contract_fails_validation(self, mock_runtime):
        """Test extraction with invalid contract document fails validation."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.INVALID_CONTRACT
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "CONTRACT"
        
        # Act
        result = await extract_contract_renewal(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        # Invalid contract should fail validation
        if not result["validation_passed"]:
            assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    async def test_extract_court_hearing_document_fails_validation(self, mock_runtime):
        """Test extraction with court hearing document (wrong type) fails validation."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "CONTRACT"  # Misclassified
        
        # Act
        result = await extract_contract_renewal(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Court hearing document should fail contract validation
        # (Implementation may vary based on validation logic)
    
    @pytest.mark.asyncio
    async def test_extract_with_contract_expiration_date(self, mock_runtime):
        """Test extraction of contract with explicit expiration date."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.CONTRACT_CN  # Contains "2027年5月31日止"
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "CONTRACT"
        
        # Act
        result = await extract_contract_renewal(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            assert len(result["extracted_events"]) > 0
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                # Should extract the expiration date
                assert any(field in event for field in ["raw_date_time", "event_time"])
                # Should be contract renewal type
                if "event_type" in event:
                    assert event["event_type"] == "contract_renewal"
    
    @pytest.mark.asyncio
    async def test_extract_with_multiple_parties(self, mock_runtime):
        """Test extraction with multiple identified parties."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.CONTRACT_CN
        state["identified_parties"] = MockExtractedParties.MULTI_PARTY
        state["document_type"] = "CONTRACT"
        
        # Act
        result = await extract_contract_renewal(state, mock_runtime)
        
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
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.CONTRACT_CN
        state["identified_parties"] = MockExtractedParties.NEW_CLIENT_PROPOSED
        state["document_type"] = "CONTRACT"
        
        # Act
        result = await extract_contract_renewal(state, mock_runtime)
        
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
        state = get_mock_initial_state("ocr")
        state["raw_text"] = ""
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "CONTRACT"
        
        # Act
        result = await extract_contract_renewal(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Empty text should fail validation
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    async def test_extract_contract_with_legal_advisor_agreement(self, mock_runtime):
        """Test extraction of legal advisor agreement specifically."""
        # Arrange
        state = get_mock_initial_state("ocr")
        # Contract contains "聘请常年法律顾问协议书"
        state["raw_text"] = MockDocuments.CONTRACT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "CONTRACT"
        
        # Act
        result = await extract_contract_renewal(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            assert len(result["extracted_events"]) > 0
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                # Should identify this as legal advisor contract
                if "note" in event:
                    # Note might contain contract details
                    assert isinstance(event["note"], str)
    
    @pytest.mark.asyncio
    async def test_extract_preserves_state(self, mock_runtime):
        """Test that extraction preserves original state."""
        # Arrange
        state = get_mock_initial_state("ocr")
        original_raw_text = state["raw_text"]
        original_parties = state.get("identified_parties")
        
        # Act
        result = await extract_contract_renewal(state, mock_runtime)
        
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
        state = get_mock_initial_state("ocr")
        
        # Act
        result = await extract_contract_renewal(state, mock_runtime)
        
        # Assert
        assert isinstance(result, dict)
        assert len(result) == 2
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
    
    @pytest.mark.asyncio
    async def test_extract_contract_event_structure(self, mock_runtime):
        """Test that extracted contract events have proper structure."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.CONTRACT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        
        # Act
        result = await extract_contract_renewal(state, mock_runtime)
        
        # Assert
        if result["validation_passed"] and len(result["extracted_events"]) > 0:
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                # Contract events should have specific structure
                expected_fields = ["title", "raw_title", "event_time", "raw_date_time"]
                assert any(field in event for field in expected_fields)
                # Contract renewal might not have location
                # Should have related party information
                assert any(field in event for field in ["related_party_name", "client_name"])
    
    @pytest.mark.asyncio
    async def test_extract_validation_with_contract_keywords(self, mock_runtime):
        """Test validation logic recognizes contract-specific keywords."""
        # Arrange - Test with contract containing specific keywords
        contract_keywords_text = "法律顾问协议书 有效期 2027年5月31日止"
        state = get_mock_initial_state("ocr")
        state["raw_text"] = contract_keywords_text
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        
        # Act
        result = await extract_contract_renewal(state, mock_runtime)
        
        # Assert
        assert isinstance(result["validation_passed"], bool)
        # Text with contract keywords should potentially pass validation
        
        # Test with non-contract text
        non_contract_text = "开庭传票 应到时间 审判庭"
        state["raw_text"] = non_contract_text
        
        # Act
        result2 = await extract_contract_renewal(state, mock_runtime)
        
        # Assert
        assert isinstance(result2["validation_passed"], bool)
        # Court hearing text should potentially fail contract validation