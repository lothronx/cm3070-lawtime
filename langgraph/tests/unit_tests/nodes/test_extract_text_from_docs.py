"""Unit tests for extract_text_from_docs node."""

import asyncio
import pytest
from unittest.mock import Mock, patch, AsyncMock

from agent.nodes.extract_text_from_docs import extract_text_from_docs, _extract_text_from_single_image, _extract_text_with_qwen_ocr
from agent.utils.state import AgentState
from tests.fixtures.mock_data import get_mock_initial_state, MockDocuments


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


@pytest.fixture
def mock_dashscope_response():
    """Create a mock Dashscope API response object."""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.output = Mock()
    mock_response.output.choices = [Mock()]
    mock_response.output.choices[0].message = Mock()
    mock_response.output.choices[0].message.content = [{'text': MockDocuments.COURT_HEARING_CN}]
    return mock_response


@pytest.fixture
def mock_dashscope_api():
    """Create a mock Dashscope MultiModalConversation API."""
    mock_api = Mock()
    return mock_api


class TestExtractTextFromDocs:
    """Test cases for extract_text_from_docs node."""
    
    @pytest.mark.asyncio
    @patch('os.getenv')
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_text_single_file_success(self, mock_dashscope, mock_getenv, mock_runtime, mock_dashscope_response):
        """Test successful OCR extraction with single file URL."""
        # Arrange
        mock_getenv.return_value = "test_api_key"
        mock_dashscope.MultiModalConversation.call.return_value = mock_dashscope_response
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://example.com/court_notice.jpg"]
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert result["raw_text"] == MockDocuments.COURT_HEARING_CN.strip()
        assert mock_dashscope.api_key == "test_api_key"
        mock_dashscope.MultiModalConversation.call.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('os.getenv')
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_text_multiple_files_with_separator(self, mock_dashscope, mock_getenv, mock_runtime):
        """Test OCR extraction with multiple files and document separator."""
        # Arrange
        mock_getenv.return_value = "test_api_key"
        
        # Mock different responses for different files
        mock_response1 = Mock()
        mock_response1.status_code = 200
        mock_response1.output = Mock()
        mock_response1.output.choices = [Mock()]
        mock_response1.output.choices[0].message = Mock()
        mock_response1.output.choices[0].message.content = [{'text': MockDocuments.COURT_HEARING_CN}]
        
        mock_response2 = Mock()
        mock_response2.status_code = 200
        mock_response2.output = Mock()
        mock_response2.output.choices = [Mock()]
        mock_response2.output.choices[0].message = Mock()
        mock_response2.output.choices[0].message.content = [{'text': MockDocuments.CONTRACT_CN}]
        
        mock_dashscope.MultiModalConversation.call.side_effect = [mock_response1, mock_response2]
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = [
            "https://example.com/page1.jpg",
            "https://example.com/page2.jpg"
        ]
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        expected_text = f"{MockDocuments.COURT_HEARING_CN.strip()}\n\n=== DOCUMENT SEPARATOR ===\n\n{MockDocuments.CONTRACT_CN.strip()}"
        assert result["raw_text"] == expected_text
        assert mock_dashscope.MultiModalConversation.call.call_count == 2
    
    @pytest.mark.asyncio
    @patch('os.getenv')
    async def test_extract_text_missing_api_key(self, mock_getenv, mock_runtime):
        """Test error handling when DASHSCOPE_API_KEY is missing."""
        # Arrange
        mock_getenv.return_value = None
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://example.com/court_notice.jpg"]
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert result["raw_text"] == ""
    
    @pytest.mark.asyncio
    @patch('os.getenv')
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_text_ocr_model_failure(self, mock_dashscope, mock_getenv, mock_runtime):
        """Test error handling when OCR API fails."""
        # Arrange
        mock_getenv.return_value = "test_api_key"
        mock_dashscope.MultiModalConversation.call.side_effect = Exception("OCR API error")
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://example.com/court_notice.jpg"]
        
        with patch('agent.nodes.extract_text_from_docs.logger') as mock_logger:
            # Act
            result = await extract_text_from_docs(state, mock_runtime)
            
            # Assert
            assert "raw_text" in result
            assert result["raw_text"] == ""
            # Should log error from helper function
            mock_logger.error.assert_called()
            error_calls = [str(call) for call in mock_logger.error.call_args_list]
            assert any("Failed to extract text from image" in call for call in error_calls)
    
    @pytest.mark.asyncio
    @patch('os.getenv')
    async def test_extract_text_empty_file_list(self, mock_getenv, mock_runtime):
        """Test OCR extraction with empty file list."""
        # Arrange
        mock_getenv.return_value = "test_api_key"
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = []
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert result["raw_text"] == ""
    
    @pytest.mark.asyncio
    @patch('os.getenv')
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_text_empty_response_handling(self, mock_dashscope, mock_getenv, mock_runtime):
        """Test handling of empty OCR responses."""
        # Arrange
        mock_getenv.return_value = "test_api_key"
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.output = Mock()
        mock_response.output.choices = [Mock()]
        mock_response.output.choices[0].message = Mock()
        mock_response.output.choices[0].message.content = [{'text': ''}]  # Empty text
        mock_dashscope.MultiModalConversation.call.return_value = mock_response
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://example.com/empty_image.jpg"]
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert result["raw_text"] == ""
    
    @pytest.mark.asyncio
    @patch('os.getenv')
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_text_partial_failure_continues_processing(self, mock_dashscope, mock_getenv, mock_runtime):
        """Test that processing continues even if some files fail."""
        # Arrange
        mock_getenv.return_value = "test_api_key"
        
        # First call fails, second succeeds
        mock_success_response = Mock()
        mock_success_response.status_code = 200
        mock_success_response.output = Mock()
        mock_success_response.output.choices = [Mock()]
        mock_success_response.output.choices[0].message = Mock()
        mock_success_response.output.choices[0].message.content = [{'text': MockDocuments.CONTRACT_CN}]
        
        mock_dashscope.MultiModalConversation.call.side_effect = [Exception("First file failed"), mock_success_response]
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = [
            "https://example.com/failed_image.jpg",
            "https://example.com/success_image.jpg"
        ]
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert result["raw_text"] == MockDocuments.CONTRACT_CN.strip()  # Only successful extraction
        assert mock_dashscope.MultiModalConversation.call.call_count == 2
    
    @pytest.mark.asyncio
    async def test_extract_text_preserves_state_structure(self, mock_runtime):
        """Test that the node returns only the expected state updates."""
        # Arrange
        with patch('os.getenv', return_value="test_api_key"), \
             patch('agent.nodes.extract_text_from_docs.ChatTongyi') as mock_tongyi_class:
            
            mock_tongyi_model = Mock()
            mock_response = Mock()
            mock_response.content = "test text"
            mock_tongyi_model.invoke.return_value = mock_response
            mock_tongyi_class.return_value = mock_tongyi_model
            
            state = get_mock_initial_state("ocr")
            state["source_file_urls"] = ["https://example.com/test.jpg"]
            
            # Act
            result = await extract_text_from_docs(state, mock_runtime)
            
            # Assert
            # Should only return raw_text update, not modify other state fields
            assert len(result) == 1
            assert "raw_text" in result
            assert "extracted_events" not in result
            assert "document_type" not in result
    
    @pytest.mark.asyncio
    @patch('os.getenv')
    @patch('agent.nodes.extract_text_from_docs.ChatTongyi')
    async def test_extract_text_unsupported_format_in_list(self, mock_tongyi_class, mock_getenv, mock_runtime, mock_tongyi_model):
        """Test handling of unsupported format in file list."""
        # Arrange
        mock_getenv.return_value = "test_api_key"
        mock_tongyi_class.return_value = mock_tongyi_model
        
        mock_response = Mock()
        mock_response.content = MockDocuments.COURT_HEARING_CN
        mock_tongyi_model.invoke.return_value = mock_response
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = [
            "https://example.com/document.pdf",  # Unsupported
            "https://example.com/image.jpg"      # Supported
        ]
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert result["raw_text"] == MockDocuments.COURT_HEARING_CN.strip()  # Only from supported file
        assert mock_tongyi_model.invoke.call_count == 1  # Only called for supported format
    
    @pytest.mark.asyncio
    @patch('os.getenv')
    @patch('agent.nodes.extract_text_from_docs.ChatTongyi')
    async def test_extract_text_case_insensitive_formats(self, mock_tongyi_class, mock_getenv, mock_runtime, mock_tongyi_model):
        """Test that format validation is case insensitive."""
        # Arrange
        mock_getenv.return_value = "test_api_key"
        mock_tongyi_class.return_value = mock_tongyi_model
        
        mock_response = Mock()
        mock_response.content = "uppercase extension text"
        mock_tongyi_model.invoke.return_value = mock_response
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://example.com/test.JPG"]  # Uppercase extension
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert result["raw_text"] == "uppercase extension text"
        mock_tongyi_model.invoke.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('os.getenv')
    @patch('agent.nodes.extract_text_from_docs.ChatTongyi')
    async def test_extract_text_initialization_failure(self, mock_tongyi_class, mock_getenv, mock_runtime):
        """Test error handling when ChatTongyi initialization fails."""
        # Arrange
        mock_getenv.return_value = "test_api_key"
        mock_tongyi_class.side_effect = Exception("Model initialization failed")
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://example.com/test.jpg"]
        
        with patch('agent.nodes.extract_text_from_docs.logger') as mock_logger:
            # Act
            result = await extract_text_from_docs(state, mock_runtime)
            
            # Assert
            assert "raw_text" in result
            assert result["raw_text"] == ""
            # Should log top-level error
            mock_logger.error.assert_called_once()
            assert "OCR text extraction failed" in str(mock_logger.error.call_args)


class TestExtractTextWithQwenOcr:
    """Test cases for _extract_text_with_qwen_ocr helper function."""
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_single_image_success(self, mock_dashscope, mock_dashscope_response):
        """Test successful extraction from single image."""
        # Arrange
        mock_dashscope.MultiModalConversation.call.return_value = mock_dashscope_response
        image_url = "https://example.com/test.jpg"
        
        # Act
        result = await asyncio.to_thread(_extract_text_with_qwen_ocr, image_url)
        
        # Assert
        assert result == MockDocuments.COURT_HEARING_CN.strip()
        mock_dashscope.MultiModalConversation.call.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_single_image_unsupported_format_error(self, mock_dashscope, mock_dashscope_response):
        """Test error handling for unsupported image format."""
        # Arrange
        image_url = "https://example.com/test.pdf"  # Unsupported format
        
        with patch('agent.nodes.extract_text_from_docs.logger') as mock_logger:
            # Act
            result = await asyncio.to_thread(_extract_text_with_qwen_ocr, image_url)
            
            # Assert
            assert result == ""
            mock_logger.error.assert_called_once()
            assert "Unsupported image format for OCR" in str(mock_logger.error.call_args)
            # Should not call OCR API for unsupported formats
            mock_dashscope.MultiModalConversation.call.assert_not_called()
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_single_image_api_failure(self, mock_dashscope):
        """Test error handling when API call fails."""
        # Arrange
        mock_dashscope.MultiModalConversation.call.side_effect = Exception("OCR API failed")
        image_url = "https://example.com/test.jpg"
        
        with patch('agent.nodes.extract_text_from_docs.logger') as mock_logger:
            # Act
            result = await asyncio.to_thread(_extract_text_with_qwen_ocr, image_url)
            
            # Assert
            assert result == ""
            mock_logger.error.assert_called_once()
            assert "Failed to extract text from image" in str(mock_logger.error.call_args)
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_single_image_api_error_response(self, mock_dashscope):
        """Test handling of API error response."""
        # Arrange
        mock_error_response = Mock()
        mock_error_response.status_code = 400
        mock_error_response.code = "InvalidParameter"
        mock_error_response.message = "Invalid image format"
        mock_dashscope.MultiModalConversation.call.return_value = mock_error_response
        image_url = "https://example.com/test.jpg"
        
        with patch('agent.nodes.extract_text_from_docs.logger') as mock_logger:
            # Act
            result = await asyncio.to_thread(_extract_text_with_qwen_ocr, image_url)
            
            # Assert
            assert result == ""
            mock_logger.error.assert_called_once()
            assert "OCR API error" in str(mock_logger.error.call_args)


class TestSupportedImageFormats:
    """Test cases for supported image format validation."""
    
    @pytest.mark.parametrize("image_url,should_succeed", [
        ("https://example.com/test.jpg", True),
        ("https://example.com/test.jpeg", True),
        ("https://example.com/test.jpe", True),
        ("https://example.com/test.png", True),
        ("https://example.com/test.bmp", True),
        ("https://example.com/test.tiff", True),
        ("https://example.com/test.tif", True),
        ("https://example.com/test.webp", True),
        ("https://example.com/test.heic", True),
        ("https://example.com/test.pdf", False),
        ("https://example.com/test.txt", False),
        ("https://example.com/test.doc", False),
        ("https://example.com/test.gif", False),
        ("https://example.com/test", False),  # No extension
    ])
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_format_validation(self, mock_dashscope, image_url, should_succeed):
        """Test that format validation correctly identifies supported/unsupported formats."""
        # Arrange
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.output = Mock()
        mock_response.output.choices = [Mock()]
        mock_response.output.choices[0].message = Mock()
        mock_response.output.choices[0].message.content = [{'text': 'extracted text'}]
        mock_dashscope.MultiModalConversation.call.return_value = mock_response
        
        # Act
        result = await asyncio.to_thread(_extract_text_with_qwen_ocr, image_url)
        
        # Assert
        if should_succeed:
            assert result == "extracted text"
            mock_dashscope.MultiModalConversation.call.assert_called_once()
        else:
            assert result == ""
            mock_dashscope.MultiModalConversation.call.assert_not_called()


class TestExtractTextLogging:
    """Test cases for logging behavior in extract_text_from_docs."""
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.logger')
    @patch('os.getenv')
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_logging_successful_processing(self, mock_dashscope, mock_getenv, mock_logger, mock_runtime, mock_dashscope_response):
        """Test that successful processing logs appropriate messages."""
        # Arrange
        mock_getenv.return_value = "test_api_key"
        mock_dashscope.MultiModalConversation.call.return_value = mock_dashscope_response
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://example.com/test.jpg"]
        
        # Act
        await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        mock_logger.info.assert_called()
        log_calls = [str(call) for call in mock_logger.info.call_args_list]
        assert any("Starting OCR text extraction for 1 image files" in call for call in log_calls)
        assert any("Processing image 1/1" in call for call in log_calls)
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.logger')
    @patch('os.getenv')
    async def test_logging_missing_api_key(self, mock_getenv, mock_logger, mock_runtime):
        """Test logging when API key is missing."""
        # Arrange
        mock_getenv.return_value = None
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://example.com/test.jpg"]
        
        # Act
        await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        mock_logger.error.assert_called_once()
        assert "DASHSCOPE_API_KEY not found" in str(mock_logger.error.call_args)
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.logger')
    @patch('os.getenv')
    async def test_logging_empty_file_list(self, mock_getenv, mock_logger, mock_runtime):
        """Test logging when file list is empty."""
        # Arrange
        mock_getenv.return_value = "test_api_key"
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = []
        
        # Act
        await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        mock_logger.warning.assert_called_once()
        assert "No image files provided for OCR extraction" in str(mock_logger.warning.call_args)