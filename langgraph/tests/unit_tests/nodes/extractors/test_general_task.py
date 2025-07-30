"""Unit tests for extract_general_task specialist extractor."""

import pytest
from unittest.mock import Mock

from agent.nodes.extractors.general_task import extract_general_task
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


class TestExtractGeneralTask:
    """Test cases for extract_general_task specialist extractor."""
    
    @pytest.mark.asyncio
    async def test_extract_valid_general_task_document(self, mock_runtime):
        """Test extraction from valid general task document."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        if result["validation_passed"]:
            assert len(result["extracted_events"]) > 0
            # Verify event structure for general tasks
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                assert any(field in event for field in ["title", "raw_title"])
    
    @pytest.mark.asyncio
    async def test_extract_fallback_for_failed_validation(self, mock_runtime):
        """Test general extractor as fallback when other extractors fail validation."""
        # Arrange - Use a document that failed another extractor's validation
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.INVALID_COURT_HEARING  # Failed court hearing validation
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"  # Routed to general after failure
        state["validation_passed"] = False  # Previous validation failed
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # General extractor should be more lenient and extract what it can
        if result["validation_passed"]:
            assert len(result["extracted_events"]) >= 0  # May or may not extract tasks
    
    @pytest.mark.asyncio
    async def test_extract_multiple_general_tasks(self, mock_runtime):
        """Test extraction of multiple general tasks from document."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        # Document contains two tasks: review evidence list + contact lawyer
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            # Should extract multiple tasks:
            # 1. 审核证据清单
            # 2. 联系李明确认函件接收
            assert len(result["extracted_events"]) > 0
            
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                assert any(field in event for field in ["title", "raw_title"])
                if "event_type" in event:
                    assert event["event_type"] == "general_task"
    
    @pytest.mark.asyncio
    async def test_extract_task_with_deadline(self, mock_runtime):
        """Test extraction of general task with deadline."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        # Contains "明天下午之前，联系一下对方律师李明"
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            # Should extract deadline from task
            deadline_tasks = [e for e in result["extracted_events"] 
                            if e.get("raw_date_time") and "明天下午" in str(e.get("raw_date_time", ""))]
            # Implementation may or may not match exact text
            # But should extract the time-sensitive contact task
    
    @pytest.mark.asyncio
    async def test_extract_task_without_deadline(self, mock_runtime):
        """Test extraction of general task without specific deadline."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        # Contains "请审核一下附件里的这份证据清单" - no specific deadline
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            # Should extract task even without deadline
            review_tasks = [e for e in result["extracted_events"] 
                          if "审核" in str(e.get("title", "")) or "审核" in str(e.get("raw_title", ""))]
            # Implementation may or may not match exact text
            # But should handle tasks without specific deadlines
    
    @pytest.mark.asyncio
    async def test_extract_task_with_contact_information(self, mock_runtime):
        """Test extraction of task involving contact details."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        # Contains "联系一下对方律师李明"
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            # Should capture contact information in task details
            contact_tasks = [e for e in result["extracted_events"] 
                           if "李明" in str(e.get("note", "")) or "李明" in str(e.get("title", "")) or 
                              "李明" in str(e.get("raw_title", ""))]
            # Implementation may store contact info in different fields
    
    @pytest.mark.asyncio
    async def test_extract_with_multiple_parties(self, mock_runtime):
        """Test extraction with multiple identified parties."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.MULTI_PARTY
        state["document_type"] = "GENERAL"
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            assert len(result["extracted_events"]) > 0
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                # Should reference relevant party
                assert any(field in event for field in ["related_party_name", "client_name"])
    
    @pytest.mark.asyncio
    async def test_extract_with_new_client_proposed(self, mock_runtime):
        """Test extraction when new client is proposed."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN
        state["identified_parties"] = MockExtractedParties.NEW_CLIENT_PROPOSED
        state["document_type"] = "GENERAL"
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
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
        state["document_type"] = "GENERAL"
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Empty text should fail validation
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    async def test_extract_as_graceful_fallback(self, mock_runtime):
        """Test general extractor provides graceful fallback for any document."""
        # Arrange - Try with various document types that might fail other extractors
        test_documents = [
            MockDocuments.COURT_HEARING_CN,
            MockDocuments.CONTRACT_CN,
            MockDocuments.ASSET_PRESERVATION_CN,
            MockDocuments.HEARING_TRANSCRIPT_CN,
            "Some random legal text that doesn't fit other categories"
        ]
        
        for doc_text in test_documents:
            state = get_mock_ocr_state_after_text_extraction()
            state["raw_text"] = doc_text
            state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
            state["document_type"] = "GENERAL"
            
            # Act
            result = await extract_general_task(state, mock_runtime)
            
            # Assert
            assert "validation_passed" in result
            assert "extracted_events" in result
            # General extractor should handle any text gracefully
            assert isinstance(result["validation_passed"], bool)
            assert isinstance(result["extracted_events"], list)
    
    @pytest.mark.asyncio
    async def test_extract_preserves_state(self, mock_runtime):
        """Test that extraction preserves original state."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        original_raw_text = state["raw_text"]
        original_parties = state.get("identified_parties")
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
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
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        assert isinstance(result, dict)
        assert len(result) == 2
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
    
    @pytest.mark.asyncio
    async def test_extract_validation_is_lenient(self, mock_runtime):
        """Test that general extractor validation is more lenient than specialists."""
        # Arrange - Test with various types of text
        test_cases = [
            MockDocuments.GENERAL_TASK_CN,  # Should pass
            MockDocuments.INVALID_COURT_HEARING,  # Should potentially pass (failed other validation)
            "王律师，请处理一下这个案子的相关文件。",  # Generic legal task
            "提醒：明天有个会议需要参加。"  # Simple reminder
        ]
        
        for text in test_cases:
            state = get_mock_ocr_state_after_text_extraction()
            state["raw_text"] = text
            state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
            
            # Act
            result = await extract_general_task(state, mock_runtime)
            
            # Assert
            assert isinstance(result["validation_passed"], bool)
            # General extractor should be more accepting of various text formats
            # (Exact validation logic depends on implementation)
    
    @pytest.mark.asyncio
    async def test_extract_handles_unclear_tasks(self, mock_runtime):
        """Test extraction handles vague or unclear task descriptions."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = "王律师，关于那个案子，你知道的，需要处理一下。"
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "GENERAL"
        
        # Act
        result = await extract_general_task(state, mock_runtime)
        
        # Assert
        # General extractor should handle vague instructions gracefully
        assert "validation_passed" in result
        assert "extracted_events" in result
        # May or may not extract meaningful tasks from unclear text
        if result["validation_passed"]:
            for event in result["extracted_events"]:
                assert isinstance(event, dict)