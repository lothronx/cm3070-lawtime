"""Unit tests for classify_document_type node."""

import pytest
from unittest.mock import Mock, patch

from agent.nodes.classify_document_type import (
    classify_document_type,
    DocumentClassification,
)
from tests.fixtures.mock_data import (
    get_mock_ocr_state_after_text_extraction,
    MockDocuments,
)


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


class TestClassifyDocumentType:
    """Test cases for classify_document_type node."""

    @pytest.mark.asyncio
    async def test_classify_court_hearing_document(self, mock_runtime):
        """Test classification of court hearing document returns correct type."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.COURT_HEARING_CN

        mock_classification = DocumentClassification(
            classification="COURT_HEARING",
            confidence=0.95,
            key_indicators=["开庭传票", "传唤事由", "应到时间"],
            reasoning="包含传票标题、传唤事由和明确的开庭时间，典型的庭审日程安排文档",
        )

        # Mock the LLM call chain
        with patch(
            "agent.nodes.classify_document_type.ChatTongyi"
        ) as mock_chat_tongyi, patch(
            "agent.nodes.classify_document_type.PydanticOutputParser"
        ) as mock_parser:

            # Setup mocks
            mock_llm_instance = Mock()
            mock_chat_tongyi.return_value = mock_llm_instance

            mock_response = Mock()
            mock_response.content = '{"classification": "COURT_HEARING", "confidence": 0.95, "key_indicators": ["开庭传票", "传唤事由", "应到时间"], "reasoning": "包含传票标题、传唤事由和明确的开庭时间，典型的庭审日程安排文档"}'

            # Mock asyncio.to_thread calls using AsyncMock
            with patch("asyncio.to_thread") as mock_to_thread:
                mock_to_thread.side_effect = [
                    mock_response,  # LLM invoke
                    mock_classification,  # Parser parse
                ]

                # Mock parser instance
                mock_parser_instance = Mock()
                mock_parser_instance.get_format_instructions.return_value = (
                    "JSON format instructions"
                )
                mock_parser.return_value = mock_parser_instance

                # Act
                result = await classify_document_type(state)

        # Assert
        assert result == {"document_type": "COURT_HEARING"}
        mock_chat_tongyi.assert_called_once()
        mock_parser.assert_called_once_with(pydantic_object=DocumentClassification)

    @pytest.mark.asyncio
    async def test_classify_contract_document(self, mock_runtime):
        """Test classification of contract document returns correct type."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.CONTRACT_CN

        mock_classification = DocumentClassification(
            classification="CONTRACT",
            confidence=0.92,
            key_indicators=["协议书", "甲方", "乙方", "协议有效期"],
            reasoning="明确的协议标题，包含甲乙方和有效期条款，典型的合同协议文档",
        )

        # Mock the LLM call chain
        with patch(
            "agent.nodes.classify_document_type.ChatTongyi"
        ) as mock_chat_tongyi, patch(
            "agent.nodes.classify_document_type.PydanticOutputParser"
        ) as mock_parser:

            # Setup mocks
            mock_llm_instance = Mock()
            mock_chat_tongyi.return_value = mock_llm_instance

            mock_response = Mock()
            mock_response.content = '{"classification": "CONTRACT", "confidence": 0.92, "key_indicators": ["协议书", "甲方", "乙方", "协议有效期"], "reasoning": "明确的协议标题，包含甲乙方和有效期条款，典型的合同协议文档"}'

            # Mock asyncio.to_thread calls
            with patch("asyncio.to_thread") as mock_to_thread:
                mock_to_thread.side_effect = [
                    mock_response,  # LLM invoke
                    mock_classification,  # Parser parse
                ]

                # Mock parser instance
                mock_parser_instance = Mock()
                mock_parser_instance.get_format_instructions.return_value = (
                    "JSON format instructions"
                )
                mock_parser.return_value = mock_parser_instance

                # Act
                result = await classify_document_type(state)

        # Assert
        assert result == {"document_type": "CONTRACT"}

    @pytest.mark.asyncio
    async def test_classify_asset_preservation_document(self, mock_runtime):
        """Test classification of asset preservation document returns correct type."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.ASSET_PRESERVATION_CN

        mock_classification = DocumentClassification(
            classification="ASSET_PRESERVATION",
            confidence=0.98,
            key_indicators=["保全告知书", "查封", "不动产", "查封起止日期"],
            reasoning="保全告知书标题，包含具体的查封措施和期限，典型的财产保全文档",
        )

        # Mock the LLM call chain
        with patch(
            "agent.nodes.classify_document_type.ChatTongyi"
        ) as mock_chat_tongyi, patch(
            "agent.nodes.classify_document_type.PydanticOutputParser"
        ) as mock_parser:

            # Setup mocks
            mock_llm_instance = Mock()
            mock_chat_tongyi.return_value = mock_llm_instance

            mock_response = Mock()
            mock_response.content = '{"classification": "ASSET_PRESERVATION", "confidence": 0.98, "key_indicators": ["保全告知书", "查封", "不动产", "查封起止日期"], "reasoning": "保全告知书标题，包含具体的查封措施和期限，典型的财产保全文档"}'

            # Mock asyncio.to_thread calls
            with patch("asyncio.to_thread") as mock_to_thread:
                mock_to_thread.side_effect = [
                    mock_response,  # LLM invoke
                    mock_classification,  # Parser parse
                ]

                # Mock parser instance
                mock_parser_instance = Mock()
                mock_parser_instance.get_format_instructions.return_value = (
                    "JSON format instructions"
                )
                mock_parser.return_value = mock_parser_instance

                # Act
                result = await classify_document_type(state)

        # Assert
        assert result == {"document_type": "ASSET_PRESERVATION"}

    @pytest.mark.asyncio
    async def test_classify_hearing_transcript_document(self, mock_runtime):
        """Test classification of hearing transcript document returns correct type."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.HEARING_TRANSCRIPT_CN

        mock_classification = DocumentClassification(
            classification="HEARING_TRANSCRIPT",
            confidence=0.88,
            key_indicators=["庭审笔录", "法官", "原告代理人", "被告代理人"],
            reasoning="包含对话格式和发言人标识，典型的庭审记录文档",
        )

        # Mock the LLM call chain
        with patch(
            "agent.nodes.classify_document_type.ChatTongyi"
        ) as mock_chat_tongyi, patch(
            "agent.nodes.classify_document_type.PydanticOutputParser"
        ) as mock_parser:

            # Setup mocks
            mock_llm_instance = Mock()
            mock_chat_tongyi.return_value = mock_llm_instance

            mock_response = Mock()
            mock_response.content = '{"classification": "HEARING_TRANSCRIPT", "confidence": 0.88, "key_indicators": ["庭审笔录", "法官", "原告代理人", "被告代理人"], "reasoning": "包含对话格式和发言人标识，典型的庭审记录文档"}'

            # Mock asyncio.to_thread calls
            with patch("asyncio.to_thread") as mock_to_thread:
                mock_to_thread.side_effect = [
                    mock_response,  # LLM invoke
                    mock_classification,  # Parser parse
                ]

                # Mock parser instance
                mock_parser_instance = Mock()
                mock_parser_instance.get_format_instructions.return_value = (
                    "JSON format instructions"
                )
                mock_parser.return_value = mock_parser_instance

                # Act
                result = await classify_document_type(state)

        # Assert
        assert result == {"document_type": "HEARING_TRANSCRIPT"}

    @pytest.mark.asyncio
    async def test_classify_general_task_document(self, mock_runtime):
        """Test classification of general task document returns correct type."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.GENERAL_TASK_CN

        mock_classification = DocumentClassification(
            classification="GENERAL",
            confidence=0.75,
            key_indicators=["审核", "联系", "确认"],
            reasoning="通用法律工作任务，不属于专门的文档类型",
        )

        # Mock the LLM call chain
        with patch(
            "agent.nodes.classify_document_type.ChatTongyi"
        ) as mock_chat_tongyi, patch(
            "agent.nodes.classify_document_type.PydanticOutputParser"
        ) as mock_parser:

            # Setup mocks
            mock_llm_instance = Mock()
            mock_chat_tongyi.return_value = mock_llm_instance

            mock_response = Mock()
            mock_response.content = '{"classification": "GENERAL", "confidence": 0.75, "key_indicators": ["审核", "联系", "确认"], "reasoning": "通用法律工作任务，不属于专门的文档类型"}'

            # Mock asyncio.to_thread calls
            with patch("asyncio.to_thread") as mock_to_thread:
                mock_to_thread.side_effect = [
                    mock_response,  # LLM invoke
                    mock_classification,  # Parser parse
                ]

                # Mock parser instance
                mock_parser_instance = Mock()
                mock_parser_instance.get_format_instructions.return_value = (
                    "JSON format instructions"
                )
                mock_parser.return_value = mock_parser_instance

                # Act
                result = await classify_document_type(state)

        # Assert
        assert result == {"document_type": "GENERAL"}

    @pytest.mark.asyncio
    async def test_classify_document_with_empty_text(self, mock_runtime):
        """Test classification gracefully handles empty raw text."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = ""

        # Act
        result = await classify_document_type(state)

        # Assert - Should return GENERAL fallback without calling LLM
        assert result == {"document_type": "GENERAL"}

    @pytest.mark.asyncio
    async def test_classify_document_with_whitespace_only_text(self, mock_runtime):
        """Test classification gracefully handles whitespace-only text."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = "   \n\t  "

        # Act
        result = await classify_document_type(state)

        # Assert - Should return GENERAL fallback without calling LLM
        assert result == {"document_type": "GENERAL"}

    @pytest.mark.asyncio
    async def test_classify_document_with_none_text(self, mock_runtime):
        """Test classification handles missing raw_text field."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        del state["raw_text"]  # Remove raw_text field entirely

        # Act
        result = await classify_document_type(state)

        # Assert - Should return GENERAL fallback
        assert result == {"document_type": "GENERAL"}

    @pytest.mark.asyncio
    async def test_llm_call_failure_returns_general_fallback(self, mock_runtime):
        """Test that LLM failures fall back to GENERAL classification."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.COURT_HEARING_CN

        # Mock LLM to raise exception
        with patch(
            "agent.nodes.classify_document_type.ChatTongyi"
        ) as mock_chat_tongyi, patch(
            "agent.nodes.classify_document_type.PydanticOutputParser"
        ) as mock_parser:

            # Setup mocks
            mock_llm_instance = Mock()
            mock_chat_tongyi.return_value = mock_llm_instance

            # Mock asyncio.to_thread to raise exception
            with patch(
                "asyncio.to_thread", side_effect=Exception("LLM service unavailable")
            ):
                # Mock parser instance
                mock_parser_instance = Mock()
                mock_parser_instance.get_format_instructions.return_value = (
                    "JSON format instructions"
                )
                mock_parser.return_value = mock_parser_instance

                # Act
                result = await classify_document_type(state)

        # Assert - Should return GENERAL fallback after retry attempts
        assert result == {"document_type": "GENERAL"}

    @pytest.mark.asyncio
    async def test_json_parsing_failure_returns_general_fallback(self, mock_runtime):
        """Test that JSON parsing failures fall back to GENERAL classification."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.COURT_HEARING_CN

        # Mock the LLM call chain
        with patch(
            "agent.nodes.classify_document_type.ChatTongyi"
        ) as mock_chat_tongyi, patch(
            "agent.nodes.classify_document_type.PydanticOutputParser"
        ) as mock_parser:

            # Setup mocks
            mock_llm_instance = Mock()
            mock_chat_tongyi.return_value = mock_llm_instance

            mock_response = Mock()
            mock_response.content = "Invalid JSON response"

            # Mock asyncio.to_thread - LLM succeeds, parsing fails
            with patch("asyncio.to_thread") as mock_to_thread:
                mock_to_thread.side_effect = [
                    mock_response,  # LLM invoke succeeds
                    Exception("JSON decode error"),  # Parser parse fails
                ]

                # Mock parser instance
                mock_parser_instance = Mock()
                mock_parser_instance.get_format_instructions.return_value = (
                    "JSON format instructions"
                )
                mock_parser.return_value = mock_parser_instance

                # Act
                result = await classify_document_type(state)

        # Assert - Should return GENERAL fallback
        assert result == {"document_type": "GENERAL"}

    @pytest.mark.asyncio
    async def test_retry_logic_eventually_succeeds(self, mock_runtime):
        """Test that retry logic works when first attempt fails but second succeeds."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.COURT_HEARING_CN

        mock_classification = DocumentClassification(
            classification="COURT_HEARING",
            confidence=0.95,
            key_indicators=["开庭传票"],
            reasoning="Court hearing document",
        )

        # Mock the LLM call chain
        with patch(
            "agent.nodes.classify_document_type.ChatTongyi"
        ) as mock_chat_tongyi, patch(
            "agent.nodes.classify_document_type.PydanticOutputParser"
        ) as mock_parser:

            # Setup mocks
            mock_llm_instance = Mock()
            mock_chat_tongyi.return_value = mock_llm_instance

            mock_response = Mock()
            mock_response.content = '{"classification": "COURT_HEARING", "confidence": 0.95, "key_indicators": ["开庭传票"], "reasoning": "Court hearing document"}'

            # Mock asyncio.to_thread - first call fails, second succeeds
            with patch("asyncio.to_thread") as mock_to_thread:
                mock_to_thread.side_effect = [
                    Exception("First attempt fails"),  # First LLM call fails
                    mock_response,  # Second LLM call succeeds
                    mock_classification,  # Parser parse succeeds
                ]

                # Mock parser instance
                mock_parser_instance = Mock()
                mock_parser_instance.get_format_instructions.return_value = (
                    "JSON format instructions"
                )
                mock_parser.return_value = mock_parser_instance

                # Act
                result = await classify_document_type(state)

        # Assert - Should succeed on retry
        assert result == {"document_type": "COURT_HEARING"}

    @pytest.mark.asyncio
    async def test_classify_document_preserves_original_state(self, mock_runtime):
        """Test that classification does not modify the original state."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        original_state = state.copy()

        mock_classification = DocumentClassification(
            classification="COURT_HEARING",
            confidence=0.95,
            key_indicators=["开庭传票"],
            reasoning="Court hearing document",
        )

        # Mock the LLM call chain
        with patch(
            "agent.nodes.classify_document_type.ChatTongyi"
        ) as mock_chat_tongyi, patch(
            "agent.nodes.classify_document_type.PydanticOutputParser"
        ) as mock_parser:

            # Setup mocks
            mock_llm_instance = Mock()
            mock_chat_tongyi.return_value = mock_llm_instance

            mock_response = Mock()
            mock_response.content = '{"classification": "COURT_HEARING", "confidence": 0.95, "key_indicators": ["开庭传票"], "reasoning": "Court hearing document"}'

            # Mock asyncio.to_thread calls
            with patch("asyncio.to_thread") as mock_to_thread:
                mock_to_thread.side_effect = [
                    mock_response,  # LLM invoke
                    mock_classification,  # Parser parse
                ]

                # Mock parser instance
                mock_parser_instance = Mock()
                mock_parser_instance.get_format_instructions.return_value = (
                    "JSON format instructions"
                )
                mock_parser.return_value = mock_parser_instance

                # Act
                result = await classify_document_type(state)

        # Assert - Original state should remain unchanged
        assert state == original_state
        assert result == {"document_type": "COURT_HEARING"}

    @pytest.mark.asyncio
    async def test_classify_document_return_structure(self, mock_runtime):
        """Test that classification returns exactly one key 'document_type'."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = ""  # Use empty text to avoid LLM call

        # Act
        result = await classify_document_type(state)

        # Assert
        assert isinstance(result, dict)
        assert len(result) == 1
        assert "document_type" in result
        assert isinstance(result["document_type"], str)
        assert len(result["document_type"]) > 0

    @pytest.mark.asyncio
    async def test_llm_configuration_parameters(self, mock_runtime):
        """Test that LLM is configured with correct parameters."""
        # Arrange
        state = get_mock_ocr_state_after_text_extraction()
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        state["dashscope_api_key"] = "test_api_key"

        # Mock the LLM call chain
        with patch(
            "agent.nodes.classify_document_type.ChatTongyi"
        ) as mock_chat_tongyi, patch(
            "agent.nodes.classify_document_type.PydanticOutputParser"
        ) as mock_parser:

            # Setup mocks to avoid actual LLM call
            mock_llm_instance = Mock()
            mock_chat_tongyi.return_value = mock_llm_instance

            # Mock asyncio.to_thread to raise exception (we only care about LLM configuration)
            with patch("asyncio.to_thread", side_effect=Exception("Skip LLM call")):
                # Mock parser instance
                mock_parser_instance = Mock()
                mock_parser_instance.get_format_instructions.return_value = (
                    "JSON format instructions"
                )
                mock_parser.return_value = mock_parser_instance

                # Act
                result = await classify_document_type(state)

        # Assert - Verify LLM was configured with correct parameters
        mock_chat_tongyi.assert_called_once_with(
            model="qwen3-30b-a3b-instruct-2507", api_key="test_api_key", temperature=0
        )
        # Should still return GENERAL as fallback due to exception
        assert result == {"document_type": "GENERAL"}
