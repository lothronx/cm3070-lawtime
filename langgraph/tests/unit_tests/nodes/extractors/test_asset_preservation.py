"""Unit tests for extract_asset_preservation specialist extractor."""

import pytest
from unittest.mock import Mock, patch
import asyncio

from agent.nodes.extractors.asset_preservation import (
    extract_asset_preservation,
    AssetPreservationOutput,
    PreservationEvent,
    AssetDetails,
    ProcessingNotes,
)
from tests.fixtures.mock_data import (
    get_mock_initial_state,
    MockDocuments,
    MockExtractedEvents,
    MockExtractedParties,
)


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


@pytest.fixture
def sample_property_preservation_event():
    """Sample property preservation event with all required fields."""
    return PreservationEvent(
        event_type="asset_preservation",
        raw_title="腾讯公司和平路1号不动产查封冻结到期",
        raw_date_time="2028-07-07T09:00:00+08:00",
        raw_location=None,
        related_party_name="阿里巴巴（中国）有限公司",
        note="（2025）京0105执保0001号阿里巴巴与腾讯合同纠纷",
        confidence=0.98,
        asset_details=AssetDetails(
            asset_type="不动产",
            preservation_method="查封",
            calculation_method="explicit_date"
        )
    )


@pytest.fixture
def sample_bank_preservation_event():
    """Sample bank account preservation event with all required fields."""
    return PreservationEvent(
        event_type="asset_preservation",
        raw_title="腾讯公司银行存款查封冻结到期",
        raw_date_time="2026-07-07T09:00:00+08:00",
        raw_location=None,
        related_party_name="阿里巴巴（中国）有限公司",
        note="（2025）京0105执保0001号阿里巴巴与腾讯合同纠纷",
        confidence=0.95,
        asset_details=AssetDetails(
            asset_type="银行存款",
            preservation_method="冻结",
            calculation_method="calculated_from_period"
        )
    )


@pytest.fixture
def sample_valid_asset_preservation_output(sample_property_preservation_event, sample_bank_preservation_event):
    """Sample valid asset preservation extraction output with multiple events."""
    return AssetPreservationOutput(
        validation_passed=True,
        extracted_events=[sample_property_preservation_event, sample_bank_preservation_event],
        processing_notes=ProcessingNotes(
            total_assets_found=2,
            case_number="（2025）京0105执保0001号",
            validation_keywords=["保全告知书", "查封", "冻结", "保全措施"],
            extraction_completeness="high"
        )
    )


@pytest.fixture
def sample_invalid_asset_preservation_output():
    """Sample invalid asset preservation extraction output."""
    return AssetPreservationOutput(
        validation_passed=False,
        extracted_events=[],
        processing_notes=ProcessingNotes(
            total_assets_found=0,
            case_number=None,
            validation_keywords=None,
            extraction_completeness="none",
            error="NOT_PRESERVATION_DOCUMENT",
            potential_issues=["非正式沟通内容", "缺少保全文书结构", "仅为保全事宜讨论"]
        )
    )


@pytest.fixture
def mock_state_with_asset_preservation_document():
    """Mock state with asset preservation document and identified parties."""
    state = get_mock_initial_state("ocr")
    state["raw_text"] = MockDocuments.ASSET_PRESERVATION_CN
    state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
    state["document_type"] = "ASSET_PRESERVATION"
    state["dashscope_api_key"] = "test_api_key"
    state["current_datetime"] = "2025-01-15T10:00:00+08:00"
    return state


class TestExtractAssetPreservation:
    """Test cases for extract_asset_preservation specialist extractor."""
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.asset_preservation.ChatTongyi')
    @patch('agent.nodes.extractors.asset_preservation.PydanticOutputParser')
    async def test_extract_valid_asset_preservation_document(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_valid_asset_preservation_output, mock_state_with_asset_preservation_document
    ):
        """Test successful extraction from valid asset preservation document with multiple events."""
        # Arrange
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_valid_asset_preservation_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_asset_preservation(mock_state_with_asset_preservation_document, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        # Should pass validation for valid asset preservation document
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 2  # Property + bank account preservation
        
        # Verify first event structure (property preservation)
        property_event = result["extracted_events"][0]
        assert property_event["event_type"] == "asset_preservation"
        assert property_event["raw_title"] == "腾讯公司和平路1号不动产查封冻结到期"
        assert property_event["raw_date_time"] == "2028-07-07T09:00:00+08:00"
        assert property_event["raw_location"] is None
        assert property_event["related_party_name"] == "阿里巴巴（中国）有限公司"
        assert property_event["note"] == "（2025）京0105执保0001号阿里巴巴与腾讯合同纠纷"
        assert property_event["confidence"] == 0.98
        assert property_event["asset_details"]["asset_type"] == "不动产"
        assert property_event["asset_details"]["preservation_method"] == "查封"
        assert property_event["asset_details"]["calculation_method"] == "explicit_date"
        
        # Verify second event structure (bank account preservation)
        bank_event = result["extracted_events"][1]
        assert bank_event["event_type"] == "asset_preservation"
        assert bank_event["raw_title"] == "腾讯公司银行存款查封冻结到期"
        assert bank_event["raw_date_time"] == "2026-07-07T09:00:00+08:00"
        assert bank_event["raw_location"] is None
        assert bank_event["related_party_name"] == "阿里巴巴（中国）有限公司"
        assert bank_event["note"] == "（2025）京0105执保0001号阿里巴巴与腾讯合同纠纷"
        assert bank_event["confidence"] == 0.95
        assert bank_event["asset_details"]["asset_type"] == "银行存款"
        assert bank_event["asset_details"]["preservation_method"] == "冻结"
        assert bank_event["asset_details"]["calculation_method"] == "calculated_from_period"
        
        # Verify LLM was called with correct parameters
        mock_llm_class.assert_called_once()
        call_kwargs = mock_llm_class.call_args.kwargs
        assert call_kwargs["model"] == "qwen3-30b-a3b-instruct-2507"
        assert call_kwargs["api_key"] == "test_api_key"
        assert call_kwargs["temperature"] == 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.asset_preservation.ChatTongyi')
    @patch('agent.nodes.extractors.asset_preservation.PydanticOutputParser')
    async def test_extract_invalid_document_fails_validation(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_invalid_asset_preservation_output
    ):
        """Test extraction with invalid asset preservation document fails validation."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.INVALID_ASSET_PRESERVATION
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "ASSET_PRESERVATION"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-01-15T10:00:00+08:00"
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": false, "extracted_events": []}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_invalid_asset_preservation_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        # Invalid document should fail validation
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.asset_preservation.ChatTongyi')
    @patch('agent.nodes.extractors.asset_preservation.PydanticOutputParser')
    async def test_extract_contract_document_fails_validation(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_invalid_asset_preservation_output
    ):
        """Test extraction with contract document (wrong type) fails validation."""
        # Arrange - Contract misclassified as asset preservation
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.CONTRACT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "ASSET_PRESERVATION"  # Misclassified
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-01-15T10:00:00+08:00"
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": false, "extracted_events": []}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_invalid_asset_preservation_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        # Contract document should fail asset preservation validation
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.asset_preservation.ChatTongyi')
    @patch('agent.nodes.extractors.asset_preservation.PydanticOutputParser')
    async def test_extract_with_court_hearing_document_fails_validation(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_invalid_asset_preservation_output
    ):
        """Test extraction with court hearing document (wrong type) fails validation."""
        # Arrange - Court hearing misclassified as asset preservation
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "ASSET_PRESERVATION"  # Misclassified
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-01-15T10:00:00+08:00"
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": false, "extracted_events": []}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_invalid_asset_preservation_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        # Court hearing document should fail asset preservation validation
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.asset_preservation.ChatTongyi')
    @patch('agent.nodes.extractors.asset_preservation.PydanticOutputParser')
    async def test_extract_with_multiple_identified_parties(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_valid_asset_preservation_output
    ):
        """Test extraction with multiple identified parties."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.ASSET_PRESERVATION_CN
        state["identified_parties"] = MockExtractedParties.MULTI_PARTY
        state["document_type"] = "ASSET_PRESERVATION"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-01-15T10:00:00+08:00"
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_valid_asset_preservation_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        if result["validation_passed"]:
            assert len(result["extracted_events"]) > 0
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                # Should reference one of the identified parties
                assert "related_party_name" in event
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.asset_preservation.ChatTongyi')
    @patch('agent.nodes.extractors.asset_preservation.PydanticOutputParser')
    async def test_extract_with_new_client_proposed(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_valid_asset_preservation_output
    ):
        """Test extraction when new client is proposed."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.ASSET_PRESERVATION_CN
        state["identified_parties"] = MockExtractedParties.NEW_CLIENT_PROPOSED
        state["document_type"] = "ASSET_PRESERVATION"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-01-15T10:00:00+08:00"
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_valid_asset_preservation_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        if result["validation_passed"]:
            assert len(result["extracted_events"]) > 0
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                # Should reference the new client
                assert "related_party_name" in event
    
    @pytest.mark.asyncio
    async def test_extract_with_empty_text(self, mock_runtime):
        """Test extraction with empty document text."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = ""
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "ASSET_PRESERVATION"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-01-15T10:00:00+08:00"
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        # Empty text should fail validation
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    async def test_extract_with_whitespace_only_text(self, mock_runtime):
        """Test extraction with whitespace-only document text."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = "   \n\t   "
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "ASSET_PRESERVATION"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-01-15T10:00:00+08:00"
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        # Whitespace-only text should fail validation
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.asset_preservation.ChatTongyi')
    async def test_llm_call_failure_with_retry(
        self, mock_llm_class, mock_runtime, mock_state_with_asset_preservation_document
    ):
        """Test LLM call failure with retry mechanism."""
        # Arrange
        mock_llm = Mock()
        # First two attempts fail, third succeeds
        mock_llm.invoke = Mock(side_effect=[
            Exception("Connection timeout"),
            Exception("Rate limit exceeded"),
            Mock(content='{"validation_passed": false, "extracted_events": []}')
        ])
        mock_llm_class.return_value = mock_llm
        
        with patch('agent.nodes.extractors.asset_preservation.PydanticOutputParser') as mock_parser_class:
            mock_parser = Mock()
            sample_output = AssetPreservationOutput(
                validation_passed=False,
                extracted_events=[],
                processing_notes=ProcessingNotes(
                    total_assets_found=0,
                    case_number=None,
                    validation_keywords=None,
                    extraction_completeness="none",
                    error="NO_ASSETS_FOUND"
                )
            )
            mock_parser.parse = Mock(return_value=sample_output)
            mock_parser.get_format_instructions = Mock(return_value="format instructions")
            mock_parser_class.return_value = mock_parser
            
            # Act
            result = await extract_asset_preservation(mock_state_with_asset_preservation_document, mock_runtime)
            
            # Assert
            assert "validation_passed" in result
            assert "extracted_events" in result
            assert result["validation_passed"] is False
            assert len(result["extracted_events"]) == 0
            
            # Should have retried 3 times total
            assert mock_llm.invoke.call_count == 3
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.asset_preservation.ChatTongyi')
    async def test_llm_call_failure_all_retries_exhausted(
        self, mock_llm_class, mock_runtime, mock_state_with_asset_preservation_document
    ):
        """Test LLM call failure when all retries are exhausted."""
        # Arrange
        mock_llm = Mock()
        # All 3 attempts fail
        mock_llm.invoke = Mock(side_effect=[
            Exception("Connection timeout"),
            Exception("Rate limit exceeded"),
            Exception("Service unavailable")
        ])
        mock_llm_class.return_value = mock_llm
        
        # Act
        result = await extract_asset_preservation(mock_state_with_asset_preservation_document, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
        
        # Should have attempted 3 times
        assert mock_llm.invoke.call_count == 3
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.asset_preservation.ChatTongyi')
    @patch('agent.nodes.extractors.asset_preservation.PydanticOutputParser')
    async def test_parser_failure_handling(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        mock_state_with_asset_preservation_document
    ):
        """Test handling of parser failures."""
        # Arrange
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = 'invalid json response'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(side_effect=Exception("JSON parsing failed"))
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_asset_preservation(mock_state_with_asset_preservation_document, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.asset_preservation.ChatTongyi')
    async def test_extract_with_missing_dashscope_api_key(
        self, mock_llm_class, mock_runtime
    ):
        """Test extraction with missing dashscope_api_key."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.ASSET_PRESERVATION_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "ASSET_PRESERVATION"
        state["current_datetime"] = "2025-01-15T10:00:00+08:00"
        # Note: missing dashscope_api_key
        
        # Mock LLM to fail due to missing API key
        mock_llm_class.side_effect = Exception("API key required")
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        # Should handle missing API key gracefully
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.asset_preservation.ChatTongyi')
    @patch('agent.nodes.extractors.asset_preservation.PydanticOutputParser')
    async def test_async_behavior_with_asyncio_to_thread(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_valid_asset_preservation_output, mock_state_with_asset_preservation_document
    ):
        """Test that async behavior works correctly with asyncio.to_thread."""
        # Arrange
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_valid_asset_preservation_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        with patch('agent.nodes.extractors.asset_preservation.asyncio.to_thread', side_effect=asyncio.to_thread) as mock_to_thread:
            result = await extract_asset_preservation(mock_state_with_asset_preservation_document, mock_runtime)
            
            # Assert
            assert "validation_passed" in result
            assert "extracted_events" in result
            assert result["validation_passed"] is True
            assert len(result["extracted_events"]) == 2
            
            # Should have used asyncio.to_thread for both LLM call and parsing
            assert mock_to_thread.call_count == 2
            
    @pytest.mark.asyncio
    async def test_extract_return_type_structure(self, mock_runtime):
        """Test extraction returns proper structure."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.ASSET_PRESERVATION_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "ASSET_PRESERVATION"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-01-15T10:00:00+08:00"
        
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
    async def test_extract_preserves_original_state(self, mock_runtime):
        """Test that extraction preserves original state."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.ASSET_PRESERVATION_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "ASSET_PRESERVATION"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-01-15T10:00:00+08:00"
        
        original_raw_text = state["raw_text"]
        original_parties = state.get("identified_parties")
        original_document_type = state.get("document_type")
        
        # Act
        result = await extract_asset_preservation(state, mock_runtime)
        
        # Assert - Only validation_passed and extracted_events should be returned
        assert len(result.keys()) == 2
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Original state should remain unchanged
        assert state["raw_text"] == original_raw_text
        assert state.get("identified_parties") == original_parties
        assert state.get("document_type") == original_document_type
        
    @pytest.mark.asyncio
    async def test_extract_with_unexpected_exception(self, mock_runtime):
        """Test handling of unexpected exceptions."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.ASSET_PRESERVATION_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "ASSET_PRESERVATION"
        state["dashscope_api_key"] = "test_api_key"
        state["current_datetime"] = "2025-01-15T10:00:00+08:00"
        
        with patch('agent.nodes.extractors.asset_preservation.ChatTongyi', side_effect=Exception("Unexpected error")):
            # Act
            result = await extract_asset_preservation(state, mock_runtime)
            
            # Assert
            assert "validation_passed" in result
            assert "extracted_events" in result
            assert result["validation_passed"] is False
            assert len(result["extracted_events"]) == 0