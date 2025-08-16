"""Unit tests for extract_hearing_details specialist extractor."""

import pytest
from unittest.mock import Mock, patch

from agent.nodes.extractors.hearing_details import (
    extract_hearing_details,
    HearingDetailsOutput,
    ExtractedEvent,
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
def sample_hearing_event():
    """Sample court hearing event with all required fields."""
    return ExtractedEvent(
        event_type="court_hearing",
        raw_title="阿里巴巴开庭",
        raw_date_time="2025-08-26T13:40:00+08:00",
        raw_location="威海市文登区人民法院开发区第一审判庭",
        related_party_name="阿里巴巴（中国）有限公司",
        note="(2025)鲁1003民初0001号建设工程施工合同纠纷",
        confidence=0.95
    )


@pytest.fixture
def sample_valid_hearing_output(sample_hearing_event):
    """Sample valid hearing details extraction output."""
    return HearingDetailsOutput(
        validation_passed=True,
        extracted_events=[sample_hearing_event],
        processing_notes=ProcessingNotes(
            validation_keywords_found=["开庭传票", "传唤事由", "应到时间", "应到处所"],
            extraction_completeness="high",
            potential_issues=[]
        )
    )


@pytest.fixture
def sample_invalid_hearing_output():
    """Sample invalid hearing details extraction output."""
    return HearingDetailsOutput(
        validation_passed=False,
        extracted_events=[],
        processing_notes=ProcessingNotes(
            validation_keywords_found=[],
            extraction_completeness="none",
            potential_issues=["缺少庭审通知的关键特征"],
            error="NOT_HEARING_DOCUMENT"
        )
    )


@pytest.fixture
def mock_state_with_hearing_document():
    """Mock state with court hearing document and identified parties."""
    state = get_mock_initial_state("ocr")
    state["raw_text"] = MockDocuments.COURT_HEARING_CN
    state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
    state["document_type"] = "COURT_HEARING"
    state["dashscope_api_key"] = "test_api_key"
    return state


class TestExtractHearingDetails:
    """Test cases for extract_hearing_details specialist extractor."""
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.hearing_details.ChatTongyi')
    @patch('agent.nodes.extractors.hearing_details.PydanticOutputParser')
    async def test_extract_valid_court_hearing_document(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_valid_hearing_output, mock_state_with_hearing_document
    ):
        """Test successful extraction from valid court hearing document."""
        # Arrange
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_valid_hearing_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_hearing_details(mock_state_with_hearing_document, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        # Should pass validation for valid court hearing document
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 1
        
        # Verify event structure matches expected court hearing format
        event = result["extracted_events"][0]
        assert event["event_type"] == "court_hearing"
        assert event["raw_title"] == "阿里巴巴开庭"
        assert event["raw_date_time"] == "2025-08-26T13:40:00+08:00"
        assert event["raw_location"] == "威海市文登区人民法院开发区第一审判庭"
        assert event["related_party_name"] == "阿里巴巴（中国）有限公司"
        assert event["note"] == "(2025)鲁1003民初0001号建设工程施工合同纠纷"
        assert event["confidence"] == 0.95
        
        # Verify LLM was called with correct parameters
        mock_llm_class.assert_called_once()
        call_kwargs = mock_llm_class.call_args.kwargs
        assert call_kwargs["model"] == "qwen3-30b-a3b-instruct-2507"
        assert call_kwargs["api_key"] == "test_api_key"
        assert call_kwargs["temperature"] == 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.hearing_details.ChatTongyi')
    @patch('agent.nodes.extractors.hearing_details.PydanticOutputParser')
    async def test_extract_invalid_document_fails_validation(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_invalid_hearing_output
    ):
        """Test extraction with invalid document fails validation."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.INVALID_COURT_HEARING
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "COURT_HEARING"
        state["dashscope_api_key"] = "test_api_key"
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": false, "extracted_events": []}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_invalid_hearing_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_hearing_details(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        # Invalid document should fail validation
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.hearing_details.ChatTongyi')
    @patch('agent.nodes.extractors.hearing_details.PydanticOutputParser')
    async def test_extract_contract_document_fails_validation(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_invalid_hearing_output
    ):
        """Test extraction with contract document (wrong type) fails validation."""
        # Arrange - Contract misclassified as court hearing
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.CONTRACT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "COURT_HEARING"  # Misclassified
        state["dashscope_api_key"] = "test_api_key"
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": false, "extracted_events": []}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_invalid_hearing_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_hearing_details(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Contract document should fail hearing validation
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.hearing_details.ChatTongyi')
    @patch('agent.nodes.extractors.hearing_details.PydanticOutputParser')
    async def test_extract_with_multiple_parties(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_valid_hearing_output
    ):
        """Test extraction with multiple identified parties."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        state["identified_parties"] = MockExtractedParties.MULTI_PARTY
        state["document_type"] = "COURT_HEARING"
        state["dashscope_api_key"] = "test_api_key"
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_valid_hearing_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_hearing_details(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Should extract hearing details for identified client
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 1
        
        event = result["extracted_events"][0]
        # Should reference the identified Alibaba client (from MULTI_PARTY)
        assert event["related_party_name"] == "阿里巴巴（中国）有限公司"
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.hearing_details.ChatTongyi')
    @patch('agent.nodes.extractors.hearing_details.PydanticOutputParser')
    async def test_extract_with_new_client_proposed(
        self, mock_parser_class, mock_llm_class, mock_runtime
    ):
        """Test extraction when new client is proposed."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        state["identified_parties"] = MockExtractedParties.NEW_CLIENT_PROPOSED
        state["document_type"] = "COURT_HEARING"
        state["dashscope_api_key"] = "test_api_key"
        
        # Create hearing event with new client
        new_client_event = ExtractedEvent(
            event_type="court_hearing",
            raw_title="Global Industries Inc开庭",
            raw_date_time="2025-08-26T13:40:00+08:00",
            raw_location="威海市文登区人民法院开发区第一审判庭",
            related_party_name="Global Industries Inc",
            note="(2025)鲁1003民初0001号建设工程施工合同纠纷",
            confidence=0.90
        )
        
        new_client_output = HearingDetailsOutput(
            validation_passed=True,
            extracted_events=[new_client_event],
            processing_notes=ProcessingNotes(
                validation_keywords_found=["开庭传票", "传唤事由"],
                extraction_completeness="high",
                potential_issues=[]
            )
        )
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=new_client_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_hearing_details(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 1
        
        # Should handle new client scenario
        event = result["extracted_events"][0]
        assert event["related_party_name"] == "Global Industries Inc"
        assert "Global Industries Inc" in event["raw_title"]
    
    @pytest.mark.asyncio
    async def test_extract_with_empty_text(self, mock_runtime):
        """Test extraction with empty document text."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = ""
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "COURT_HEARING"
        state["dashscope_api_key"] = "test_api_key"
        
        # Act
        result = await extract_hearing_details(state, mock_runtime)
        
        # Assert - Should return early without calling LLM
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Empty text should fail validation
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    async def test_extract_with_whitespace_only_text(self, mock_runtime):
        """Test extraction with whitespace-only text."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = "   \n\t   "
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "COURT_HEARING"
        state["dashscope_api_key"] = "test_api_key"
        
        # Act
        result = await extract_hearing_details(state, mock_runtime)
        
        # Assert - Should return early without calling LLM
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Whitespace-only text should fail validation
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.hearing_details.ChatTongyi')
    @patch('agent.nodes.extractors.hearing_details.PydanticOutputParser')
    async def test_extract_preserves_state(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_valid_hearing_output, mock_state_with_hearing_document
    ):
        """Test that extraction preserves original state."""
        # Arrange
        original_raw_text = mock_state_with_hearing_document["raw_text"]
        original_parties = mock_state_with_hearing_document.get("identified_parties")
        original_document_type = mock_state_with_hearing_document.get("document_type")
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_valid_hearing_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_hearing_details(mock_state_with_hearing_document, mock_runtime)
        
        # Assert - Only validation_passed and extracted_events should be returned
        assert len(result.keys()) == 2
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Original state should remain unchanged
        assert mock_state_with_hearing_document["raw_text"] == original_raw_text
        assert mock_state_with_hearing_document.get("identified_parties") == original_parties
        assert mock_state_with_hearing_document.get("document_type") == original_document_type
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.hearing_details.ChatTongyi')
    @patch('agent.nodes.extractors.hearing_details.PydanticOutputParser')
    async def test_extract_return_type_structure(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_valid_hearing_output, mock_state_with_hearing_document
    ):
        """Test extraction returns proper dictionary structure with all required fields."""
        # Mock LLM and parser
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_valid_hearing_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_hearing_details(mock_state_with_hearing_document, mock_runtime)
        
        # Assert return structure
        assert isinstance(result, dict)
        assert len(result) == 2
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        # Verify complete hearing event structure
        if result["extracted_events"]:
            event = result["extracted_events"][0]
            required_fields = [
                "event_type", "raw_title", "raw_date_time", "raw_location",
                "related_party_name", "note", "confidence"
            ]
            for field in required_fields:
                assert field in event
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.hearing_details.ChatTongyi')
    @patch('agent.nodes.extractors.hearing_details.PydanticOutputParser')
    async def test_extract_hearing_event_structure(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_valid_hearing_output, mock_state_with_hearing_document
    ):
        """Test that extracted hearing events have proper structure with court-specific fields."""
        # Mock LLM and parser
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_valid_hearing_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_hearing_details(mock_state_with_hearing_document, mock_runtime)
        
        # Assert
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 1
        
        event = result["extracted_events"][0]
        assert isinstance(event, dict)
        
        # Hearing events should have court-specific structure
        assert event["event_type"] == "court_hearing"
        assert "开庭" in event["raw_title"]
        assert "2025-08-26T13:40:00+08:00" == event["raw_date_time"]
        assert "威海市文登区人民法院" in event["raw_location"]
        assert "审判庭" in event["raw_location"]
        assert "(2025)鲁1003民初0001号" in event["note"]
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.hearing_details.ChatTongyi')
    @patch('agent.nodes.extractors.hearing_details.PydanticOutputParser')
    async def test_extract_validation_logic(
        self, mock_parser_class, mock_llm_class, mock_runtime,
        sample_valid_hearing_output, sample_invalid_hearing_output
    ):
        """Test that validation logic works correctly for different document types."""
        # Test 1: Valid hearing document should pass validation
        valid_state = get_mock_initial_state("ocr")
        valid_state["raw_text"] = MockDocuments.COURT_HEARING_CN
        valid_state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        valid_state["dashscope_api_key"] = "test_api_key"
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=sample_valid_hearing_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        valid_result = await extract_hearing_details(valid_state, mock_runtime)
        
        # Assert
        assert isinstance(valid_result["validation_passed"], bool)
        assert valid_result["validation_passed"] is True
        assert len(valid_result["extracted_events"]) == 1
        
        # Test 2: Invalid document should fail validation
        invalid_state = get_mock_initial_state("ocr")
        invalid_state["raw_text"] = MockDocuments.INVALID_COURT_HEARING
        invalid_state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        invalid_state["dashscope_api_key"] = "test_api_key"
        
        # Reset mocks for second test
        mock_llm.reset_mock()
        mock_parser.reset_mock()
        mock_response.content = '{"validation_passed": false, "extracted_events": []}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_parser.parse = Mock(return_value=sample_invalid_hearing_output)
        
        # Act
        invalid_result = await extract_hearing_details(invalid_state, mock_runtime)
        
        # Assert
        assert isinstance(invalid_result["validation_passed"], bool)
        assert invalid_result["validation_passed"] is False
        assert len(invalid_result["extracted_events"]) == 0
    
    # === COMPREHENSIVE ERROR HANDLING TESTS ===
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.hearing_details.ChatTongyi')
    async def test_llm_call_failure_with_retry(
        self, mock_llm_class, mock_runtime, mock_state_with_hearing_document
    ):
        """Test LLM call failure triggers retry mechanism."""
        # Arrange - Mock LLM to fail twice, succeed on third attempt
        mock_llm = Mock()
        mock_llm.invoke.side_effect = [
            Exception("Connection timeout"),
            Exception("Rate limit exceeded"),
            Mock(content='{"validation_passed": false, "extracted_events": []}')
        ]
        mock_llm_class.return_value = mock_llm
        
        with patch('agent.nodes.extractors.hearing_details.PydanticOutputParser') as mock_parser_class:
            mock_parser = Mock()
            mock_parser.parse = Mock(return_value=HearingDetailsOutput(
                validation_passed=False,
                extracted_events=[],
                processing_notes=ProcessingNotes(
                    validation_keywords_found=[],
                    extraction_completeness="none",
                    potential_issues=["Retry after failures"]
                )
            ))
            mock_parser.get_format_instructions = Mock(return_value="format instructions")
            mock_parser_class.return_value = mock_parser
            
            # Act
            result = await extract_hearing_details(mock_state_with_hearing_document, mock_runtime)
            
            # Assert
            assert result["validation_passed"] is False
            assert result["extracted_events"] == []
            # Should have called invoke 3 times (2 failures + 1 success)
            assert mock_llm.invoke.call_count == 3
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.hearing_details.ChatTongyi')
    async def test_llm_call_exhausts_all_retries(
        self, mock_llm_class, mock_runtime, mock_state_with_hearing_document
    ):
        """Test LLM call failure exhausts all retries and returns empty."""
        # Arrange - Mock LLM to always fail
        mock_llm = Mock()
        mock_llm.invoke.side_effect = Exception("Persistent failure")
        mock_llm_class.return_value = mock_llm
        
        # Act
        result = await extract_hearing_details(mock_state_with_hearing_document, mock_runtime)
        
        # Assert graceful degradation
        assert result["validation_passed"] is False
        assert result["extracted_events"] == []
        # Should have attempted max_retries + 1 = 3 times
        assert mock_llm.invoke.call_count == 3
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.hearing_details.ChatTongyi')
    @patch('agent.nodes.extractors.hearing_details.PydanticOutputParser')
    async def test_json_parsing_failure(
        self, mock_parser_class, mock_llm_class, mock_runtime, mock_state_with_hearing_document
    ):
        """Test JSON parsing failure is handled gracefully."""
        # Arrange - Mock LLM returns valid response, but parser fails
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = "Invalid JSON response"
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse.side_effect = ValueError("Invalid JSON format")
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_hearing_details(mock_state_with_hearing_document, mock_runtime)
        
        # Assert graceful degradation
        assert result["validation_passed"] is False
        assert result["extracted_events"] == []
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.hearing_details.ChatTongyi')
    @patch('agent.nodes.extractors.hearing_details.PydanticOutputParser')
    async def test_pydantic_validation_failure(
        self, mock_parser_class, mock_llm_class, mock_runtime, mock_state_with_hearing_document
    ):
        """Test Pydantic validation failure is handled gracefully."""
        # Arrange - Mock parser to raise validation error
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        from pydantic import ValidationError
        # Create a proper ValidationError with the right structure
        validation_error = ValidationError.from_exception_data(
            "HearingDetailsOutput",
            [{"type": "missing", "loc": ("validation_passed",), "msg": "field required", "input": {}}]
        )
        mock_parser.parse.side_effect = validation_error
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_hearing_details(mock_state_with_hearing_document, mock_runtime)
        
        # Assert graceful degradation
        assert result["validation_passed"] is False
        assert result["extracted_events"] == []
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.hearing_details.ChatTongyi')
    async def test_missing_required_state_fields(self, mock_llm_class, mock_runtime):
        """Test handling of missing required state fields."""
        # Arrange - Minimal state missing some fields
        minimal_state = {
            "source_type": "ocr",
            "raw_text": MockDocuments.COURT_HEARING_CN
            # Missing: identified_parties, dashscope_api_key
        }
        
        # Mock LLM to fail due to missing API key (realistic behavior)
        mock_llm = Mock()
        mock_llm.invoke.side_effect = Exception("Missing or invalid API key")
        mock_llm_class.return_value = mock_llm
        
        # Act & Assert - Should handle gracefully
        result = await extract_hearing_details(minimal_state, mock_runtime)
        
        # Should return empty result rather than crash
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        assert result["validation_passed"] is False  # Should fail due to missing data
        
        # Verify LLM was attempted to be created with None API key
        mock_llm_class.assert_called_once()
        call_kwargs = mock_llm_class.call_args.kwargs
        assert call_kwargs["api_key"] is None
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.hearing_details.ChatTongyi')
    @patch('agent.nodes.extractors.hearing_details.PydanticOutputParser')
    @patch('agent.nodes.extractors.hearing_details.asyncio.to_thread')
    async def test_async_behavior_with_asyncio_to_thread(
        self, mock_to_thread, mock_parser_class, mock_llm_class, mock_runtime,
        sample_valid_hearing_output, mock_state_with_hearing_document
    ):
        """Test async behavior using asyncio.to_thread for LLM calls."""
        # Arrange
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        
        # Mock asyncio.to_thread to return our expected values directly
        mock_to_thread.side_effect = [
            mock_response,  # First call returns LLM response
            sample_valid_hearing_output  # Second call returns parsed result
        ]
        
        mock_llm_class.return_value = mock_llm
        mock_parser = Mock()
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_hearing_details(mock_state_with_hearing_document, mock_runtime)
        
        # Assert async calls were made
        assert mock_to_thread.call_count == 2  # One for invoke, one for parse
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 1
    
    @pytest.mark.asyncio
    async def test_unexpected_exception_handling(self, mock_runtime, mock_state_with_hearing_document):
        """Test handling of unexpected exceptions throughout the function."""
        # Arrange - Trigger unexpected exception during initialization
        with patch('agent.nodes.extractors.hearing_details.ChatTongyi') as mock_llm_class:
            mock_llm_class.side_effect = RuntimeError("Unexpected initialization error")
            
            # Act
            result = await extract_hearing_details(mock_state_with_hearing_document, mock_runtime)
            
            # Assert graceful degradation
            assert "validation_passed" in result
            assert "extracted_events" in result
            assert result["validation_passed"] is False
            assert result["extracted_events"] == []
    
    # === EDGE CASES AND SCENARIOS ===
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extractors.hearing_details.ChatTongyi')
    @patch('agent.nodes.extractors.hearing_details.PydanticOutputParser')
    async def test_extract_with_complex_case_details(
        self, mock_parser_class, mock_llm_class, mock_runtime
    ):
        """Test extraction handles complex legal case details."""
        # Arrange - Complex hearing document with multiple legal elements
        state = get_mock_initial_state("ocr")
        state["raw_text"] = """北京市朝阳区人民法院 开庭传票
        案 号 (2025)京0105民初0123号
        案 由 建设工程施工合同纠纷、违约责任纠纷
        被传唤人 阿里巴巴（中国）有限公司
        传唤事由 开庭审理、质证、法庭辩论
        应到时间 2025年09月15日 上午9:30
        应到处所 第三审判庭（五层501室）
        注意事项：请携带身份证明及相关证据材料
        """
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "COURT_HEARING"
        state["dashscope_api_key"] = "test_api_key"
        
        # Create complex hearing event
        complex_event = ExtractedEvent(
            event_type="court_hearing",
            raw_title="阿里巴巴开庭审理、质证、法庭辩论",
            raw_date_time="2025-09-15T09:30:00+08:00",
            raw_location="北京市朝阳区人民法院第三审判庭（五层501室）",
            related_party_name="阿里巴巴（中国）有限公司",
            note="(2025)京0105民初0123号建设工程施工合同纠纷、违约责任纠纷",
            confidence=0.93
        )
        
        complex_output = HearingDetailsOutput(
            validation_passed=True,
            extracted_events=[complex_event],
            processing_notes=ProcessingNotes(
                validation_keywords_found=["开庭传票", "传唤事由", "开庭审理", "质证", "应到时间", "应到处所"],
                extraction_completeness="high",
                potential_issues=[]
            )
        )
        
        mock_llm = Mock()
        mock_response = Mock()
        mock_response.content = '{"validation_passed": true, "extracted_events": [...]}'
        mock_llm.invoke = Mock(return_value=mock_response)
        mock_llm_class.return_value = mock_llm
        
        mock_parser = Mock()
        mock_parser.parse = Mock(return_value=complex_output)
        mock_parser.get_format_instructions = Mock(return_value="format instructions")
        mock_parser_class.return_value = mock_parser
        
        # Act
        result = await extract_hearing_details(state, mock_runtime)
        
        # Assert complex details were extracted correctly
        assert result["validation_passed"] is True
        assert len(result["extracted_events"]) == 1
        
        event = result["extracted_events"][0]
        assert "质证" in event["raw_title"]
        assert "法庭辩论" in event["raw_title"]
        assert "第三审判庭" in event["raw_location"]
        assert "五层501室" in event["raw_location"]
        assert "违约责任纠纷" in event["note"]
        assert event["raw_date_time"] == "2025-09-15T09:30:00+08:00"
    
    # === PYDANTIC MODEL VALIDATION TESTS ===
    
    def test_extracted_event_pydantic_model_structure(self):
        """Test ExtractedEvent Pydantic model validates required fields correctly."""
        # Test valid event creation
        valid_event = ExtractedEvent(
            event_type="court_hearing",
            raw_title="阿里巴巴开庭",
            raw_date_time="2025-08-26T13:40:00+08:00",
            raw_location="威海市文登区人民法院开发区第一审判庭",
            related_party_name="阿里巴巴（中国）有限公司",
            note="(2025)鲁1003民初0001号建设工程施工合同纠纷",
            confidence=0.95
        )
        
        assert valid_event.event_type == "court_hearing"
        assert valid_event.raw_title == "阿里巴巴开庭"
        assert valid_event.confidence == 0.95
        assert valid_event.raw_date_time == "2025-08-26T13:40:00+08:00"
        assert "威海市文登区人民法院" in valid_event.raw_location
    
    def test_extracted_event_model_with_optional_fields_none(self):
        """Test ExtractedEvent model handles optional None fields correctly."""
        minimal_event = ExtractedEvent(
            raw_title="简单开庭",
            raw_date_time=None,
            raw_location=None,
            related_party_name=None,
            note="简单案件",
            confidence=0.5
        )
        
        assert minimal_event.event_type == "court_hearing"  # Should default
        assert minimal_event.raw_date_time is None
        assert minimal_event.raw_location is None
        assert minimal_event.related_party_name is None
    
    def test_hearing_details_output_model_with_empty_events(self):
        """Test HearingDetailsOutput model handles empty event list."""
        empty_output = HearingDetailsOutput(
            validation_passed=False,
            extracted_events=[],
            processing_notes=ProcessingNotes(
                validation_keywords_found=[],
                extraction_completeness="none",
                potential_issues=["No valid hearing document found"]
            )
        )
        assert empty_output.validation_passed is False
        assert empty_output.extracted_events == []
        assert isinstance(empty_output.extracted_events, list)
    
    def test_processing_notes_model_structure(self):
        """Test ProcessingNotes model validates extraction metadata correctly."""
        processing_notes = ProcessingNotes(
            validation_keywords_found=["开庭传票", "传唤事由", "应到时间"],
            extraction_completeness="high",
            potential_issues=["Minor formatting inconsistencies"]
        )
        
        assert len(processing_notes.validation_keywords_found) == 3
        assert processing_notes.extraction_completeness == "high"
        assert "开庭传票" in processing_notes.validation_keywords_found
        assert len(processing_notes.potential_issues) == 1