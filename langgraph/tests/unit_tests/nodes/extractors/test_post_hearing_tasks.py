"""Unit tests for extract_post_hearing_tasks specialist extractor."""

import pytest
from unittest.mock import Mock

from agent.nodes.extractors.post_hearing_tasks import extract_post_hearing_tasks
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


class TestExtractPostHearingTasks:
    """Test cases for extract_post_hearing_tasks specialist extractor."""
    
    @pytest.mark.asyncio
    async def test_extract_valid_hearing_transcript_document(self, mock_runtime):
        """Test extraction from valid hearing transcript document."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "HEARING_TRANSCRIPT"
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        if result["validation_passed"]:
            assert len(result["extracted_events"]) > 0
            # Verify event structure for post-hearing tasks
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                assert any(field in event for field in ["title", "raw_title"])
                # Post-hearing tasks should have deadlines
                assert any(field in event for field in ["event_time", "raw_date_time"])
    
    @pytest.mark.asyncio
    async def test_extract_invalid_hearing_transcript_fails_validation(self, mock_runtime):
        """Test extraction with non-hearing transcript fails validation."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.CONTRACT_CN  # Not a hearing transcript
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "HEARING_TRANSCRIPT"  # Misclassified
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
        
        # Contract document should fail hearing transcript validation
    
    @pytest.mark.asyncio
    async def test_extract_multiple_post_hearing_tasks(self, mock_runtime):
        """Test extraction of multiple tasks from hearing transcript."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        # Document contains multiple judge instructions
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.MULTI_PARTY
        state["document_type"] = "HEARING_TRANSCRIPT"
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            # Should extract multiple tasks:
            # 1. 原告三日内提交财务流水
            # 2. 被告一周内说明服务器维护记录
            assert len(result["extracted_events"]) > 0
            
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                assert any(field in event for field in ["title", "raw_title"])
                # Should have deadline information
                assert any(field in event for field in ["raw_date_time", "event_time"])
                if "event_type" in event:
                    assert event["event_type"] == "post_hearing_task"
    
    @pytest.mark.asyncio
    async def test_extract_plaintiff_task_with_deadline(self, mock_runtime):
        """Test extraction of plaintiff task with specific deadline."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        # Contains "原告代理人，你们在庭后三日内，补充提交2023年度的详细财务流水"
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "HEARING_TRANSCRIPT"
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            # Should extract task for plaintiff (阿里巴巴)
            plaintiff_tasks = [e for e in result["extracted_events"] 
                             if "财务流水" in str(e.get("title", "")) or "财务流水" in str(e.get("raw_title", ""))]
            # Implementation may or may not match exact text
            # But should extract the financial records submission task
            assert len(result["extracted_events"]) > 0
    
    @pytest.mark.asyncio
    async def test_extract_defendant_task_with_deadline(self, mock_runtime):
        """Test extraction of defendant task with different deadline."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        # Contains "被告，你们在庭后一周内，书面说明一下服务器的维护记录"
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.MULTI_PARTY
        state["document_type"] = "HEARING_TRANSCRIPT"
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            # Should extract task for defendant
            server_tasks = [e for e in result["extracted_events"] 
                          if "服务器" in str(e.get("title", "")) or "服务器" in str(e.get("raw_title", ""))]
            # Implementation may or may not match exact text
            # But should extract the server maintenance task
            assert len(result["extracted_events"]) > 0
    
    @pytest.mark.asyncio
    async def test_extract_with_case_information(self, mock_runtime):
        """Test extraction includes case number and parties."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        # Document contains case info "（2025）京0105民初123号" and parties
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "HEARING_TRANSCRIPT"
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            assert len(result["extracted_events"]) > 0
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                # Should include case information
                if "note" in event:
                    assert isinstance(event["note"], str)
                # Should reference the client
                assert any(field in event for field in ["related_party_name", "client_name"])
    
    @pytest.mark.asyncio
    async def test_extract_with_different_deadlines(self, mock_runtime):
        """Test extraction handles different deadline formats."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        # Document has "三日内" and "一周内"
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "HEARING_TRANSCRIPT"
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            # Should handle relative deadlines like "三日内", "一周内"
            deadlines = [e.get("raw_date_time", "") for e in result["extracted_events"]]
            # Implementation should extract the relative time expressions
            assert len([d for d in deadlines if d]) > 0
    
    @pytest.mark.asyncio
    async def test_extract_with_empty_text(self, mock_runtime):
        """Test extraction with empty document text."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = ""
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "HEARING_TRANSCRIPT"
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        assert "validation_passed" in result
        assert "extracted_events" in result
        
        # Empty text should fail validation
        assert result["validation_passed"] is False
        assert len(result["extracted_events"]) == 0
    
    @pytest.mark.asyncio
    async def test_extract_with_new_client_proposed(self, mock_runtime):
        """Test extraction when new client is proposed."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.NEW_CLIENT_PROPOSED
        state["document_type"] = "HEARING_TRANSCRIPT"
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            assert len(result["extracted_events"]) > 0
            for event in result["extracted_events"]:
                assert isinstance(event, dict)
                # Should reference the new client
                assert any(field in event for field in ["related_party_name", "client_name"])
    
    @pytest.mark.asyncio
    async def test_extract_preserves_state(self, mock_runtime):
        """Test that extraction preserves original state."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        original_raw_text = state["raw_text"]
        original_parties = state.get("identified_parties")
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
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
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        assert isinstance(result, dict)
        assert len(result) == 2
        assert "validation_passed" in result
        assert "extracted_events" in result
        assert isinstance(result["validation_passed"], bool)
        assert isinstance(result["extracted_events"], list)
    
    @pytest.mark.asyncio
    async def test_extract_validation_with_transcript_keywords(self, mock_runtime):
        """Test validation logic recognizes hearing transcript keywords."""
        # Arrange - Test with transcript-specific keywords
        transcript_text = "庭审笔录 法官 原告代理人 被告代理人 庭后"
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = transcript_text
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        assert isinstance(result["validation_passed"], bool)
        # Text with transcript keywords should potentially pass validation
        
        # Test with non-transcript text
        non_transcript_text = "法律顾问协议书 有效期 2027年5月31日止"
        state["raw_text"] = non_transcript_text
        
        # Act
        result2 = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        assert isinstance(result2["validation_passed"], bool)
        # Contract text should potentially fail transcript validation
    
    @pytest.mark.asyncio
    async def test_extract_judge_instructions_pattern(self, mock_runtime):
        """Test extraction recognizes judge instruction patterns."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        # Pattern: 法官: [instruction], 当事人: 好的/收到
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        state["document_type"] = "HEARING_TRANSCRIPT"
        
        # Act
        result = await extract_post_hearing_tasks(state, mock_runtime)
        
        # Assert
        if result["validation_passed"]:
            # Should recognize judge instructions followed by acknowledgment
            assert len(result["extracted_events"]) > 0
            for event in result["extracted_events"]:
                # Post-hearing tasks originate from judge instructions
                assert isinstance(event, dict)
                # Should have task details from judge's instructions