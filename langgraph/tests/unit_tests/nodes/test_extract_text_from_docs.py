"""Unit tests for extract_text_from_docs node."""

import asyncio
import pytest
from unittest.mock import Mock, patch

from agent.nodes.extract_text_from_docs import extract_text_from_docs, _extract_text_from_single_image, _extract_text_with_qwen_ocr
from tests.fixtures.mock_data import get_mock_initial_state, MockDocuments


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


@pytest.fixture
def mock_court_hearing_response():
    """Create a mock Dashscope API response for court hearing document."""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.output = Mock()
    mock_response.output.choices = [Mock()]
    mock_response.output.choices[0].message = Mock()
    mock_response.output.choices[0].message.content = [{'text': MockDocuments.COURT_HEARING_CN}]
    return mock_response


@pytest.fixture
def mock_contract_response():
    """Create a mock Dashscope API response for contract document."""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.output = Mock()
    mock_response.output.choices = [Mock()]
    mock_response.output.choices[0].message = Mock()
    mock_response.output.choices[0].message.content = [{'text': MockDocuments.CONTRACT_CN}]
    return mock_response


@pytest.fixture
def mock_dashscope_api():
    """Create a mock Dashscope MultiModalConversation API."""
    mock_api = Mock()
    return mock_api


class TestExtractTextFromDocs:
    """Test cases for extract_text_from_docs node."""
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_text_single_file_success(self, mock_dashscope, mock_runtime, mock_court_hearing_response):
        """Test successful OCR extraction with single file URL using court hearing document."""
        # Arrange
        mock_dashscope.MultiModalConversation.call.return_value = mock_court_hearing_response
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/court_summon.jpg"]
        state["dashscope_api_key"] = "test_api_key"
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert result["raw_text"] == MockDocuments.COURT_HEARING_CN.strip()
        assert mock_dashscope.api_key == "test_api_key"
        mock_dashscope.MultiModalConversation.call.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_text_multiple_files_with_separator(self, mock_dashscope, mock_runtime, mock_court_hearing_response, mock_contract_response):
        """Test OCR extraction with multiple files and document separator using realistic legal documents."""
        # Arrange
        mock_dashscope.MultiModalConversation.call.side_effect = [mock_court_hearing_response, mock_contract_response]
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = [
            "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/court_summon.jpg",
            "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/contract.png"
        ]
        state["dashscope_api_key"] = "test_api_key"
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        expected_text = f"{MockDocuments.COURT_HEARING_CN.strip()}\n\n=== DOCUMENT SEPARATOR ===\n\n{MockDocuments.CONTRACT_CN.strip()}"
        assert result["raw_text"] == expected_text
        assert mock_dashscope.MultiModalConversation.call.call_count == 2
    
    @pytest.mark.asyncio
    async def test_extract_text_missing_api_key(self, mock_runtime):
        """Test error handling when dashscope_api_key is missing."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/court_summon.jpg"]
        # Don't set dashscope_api_key in state
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert result["raw_text"] == ""
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_text_ocr_model_failure(self, mock_dashscope, mock_runtime):
        """Test error handling when OCR API fails with realistic file URL."""
        # Arrange
        mock_dashscope.MultiModalConversation.call.side_effect = Exception("OCR API error")
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/court_summon.jpg"]
        state["dashscope_api_key"] = "test_api_key"
        
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
    async def test_extract_text_empty_file_list(self, mock_runtime):
        """Test OCR extraction with empty file list."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = []
        state["dashscope_api_key"] = "test_api_key"
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert result["raw_text"] == ""
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_text_empty_response_handling(self, mock_dashscope, mock_runtime):
        """Test handling of empty OCR responses from blank document."""
        # Arrange
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.output = Mock()
        mock_response.output.choices = [Mock()]
        mock_response.output.choices[0].message = Mock()
        mock_response.output.choices[0].message.content = [{'text': ''}]  # Empty text from blank document
        mock_dashscope.MultiModalConversation.call.return_value = mock_response
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/blank_document.jpg"]
        state["dashscope_api_key"] = "test_api_key"
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert result["raw_text"] == ""
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_text_partial_failure_continues_processing(self, mock_dashscope, mock_runtime, mock_contract_response):
        """Test that processing continues even if some files fail - corrupted then valid contract."""
        # Arrange
        # First call fails (corrupted file), second succeeds (valid contract)
        mock_dashscope.MultiModalConversation.call.side_effect = [Exception("Corrupted image file"), mock_contract_response]
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = [
            "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/corrupted_document.jpg",
            "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/contract.jpg"
        ]
        state["dashscope_api_key"] = "test_api_key"
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert result["raw_text"] == MockDocuments.CONTRACT_CN.strip()  # Only successful extraction
        assert mock_dashscope.MultiModalConversation.call.call_count == 2
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_text_preserves_state_structure(self, mock_dashscope, mock_runtime):
        """Test that the node returns only the expected state updates with simple document."""
        # Arrange
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.output = Mock()
        mock_response.output.choices = [Mock()]
        mock_response.output.choices[0].message = Mock()
        mock_response.output.choices[0].message.content = [{'text': MockDocuments.GENERAL_TASK_CN}]
        mock_dashscope.MultiModalConversation.call.return_value = mock_response
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/note.jpg"]
        state["dashscope_api_key"] = "test_api_key"
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        # Should only return raw_text update, not modify other state fields
        assert len(result) == 1
        assert "raw_text" in result
        assert result["raw_text"] == MockDocuments.GENERAL_TASK_CN.strip()
        assert "extracted_events" not in result
        assert "document_type" not in result
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_text_unsupported_format_in_list(self, mock_dashscope, mock_runtime, mock_court_hearing_response):
        """Test handling of unsupported format mixed with supported format in file list."""
        # Arrange
        mock_dashscope.MultiModalConversation.call.return_value = mock_court_hearing_response
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = [
            "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/document.pdf",  # Unsupported
            "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/court_summon.jpg"  # Supported
        ]
        state["dashscope_api_key"] = "test_api_key"
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert result["raw_text"] == MockDocuments.COURT_HEARING_CN.strip()  # Only from supported file
        assert mock_dashscope.MultiModalConversation.call.call_count == 1  # Only called for supported format
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_text_case_insensitive_formats(self, mock_dashscope, mock_runtime):
        """Test that format validation is case insensitive with uppercase extension."""
        # Arrange
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.output = Mock()
        mock_response.output.choices = [Mock()]
        mock_response.output.choices[0].message = Mock()
        mock_response.output.choices[0].message.content = [{'text': MockDocuments.ASSET_PRESERVATION_CN}]
        mock_dashscope.MultiModalConversation.call.return_value = mock_response
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/preservation_notice.JPG"]  # Uppercase extension
        state["dashscope_api_key"] = "test_api_key"
        
        # Act
        result = await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        assert "raw_text" in result
        assert result["raw_text"] == MockDocuments.ASSET_PRESERVATION_CN.strip()
        mock_dashscope.MultiModalConversation.call.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_text_dashscope_initialization_failure(self, mock_dashscope, mock_runtime):
        """Test error handling when dashscope model initialization fails."""
        # Arrange
        mock_dashscope.MultiModalConversation.call.side_effect = Exception("Qwen-VL-OCR model initialization failed")
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/hearing_transcript.jpg"]
        state["dashscope_api_key"] = "test_api_key"
        
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
    async def test_extract_text_with_string_content(self, mock_runtime):
        """Test handling of string content response format with voice note transcript."""
        # Arrange
        with patch('agent.nodes.extract_text_from_docs.dashscope') as mock_dashscope:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.output = Mock()
            mock_response.output.choices = [Mock()]
            mock_response.output.choices[0].message = Mock()
            mock_response.output.choices[0].message.content = MockDocuments.VOICE_NOTE_CN  # String format
            mock_dashscope.MultiModalConversation.call.return_value = mock_response
            
            state = get_mock_initial_state("ocr")
            state["source_file_urls"] = ["https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/voice_note_image.jpg"]
            state["dashscope_api_key"] = "test_api_key"
            
            # Act
            result = await extract_text_from_docs(state, mock_runtime)
            
            # Assert
            assert "raw_text" in result
            assert result["raw_text"] == MockDocuments.VOICE_NOTE_CN.strip()
    
    @pytest.mark.asyncio
    async def test_extract_text_with_unexpected_content_format(self, mock_runtime):
        """Test handling of unexpected content format from malformed API response."""
        # Arrange
        with patch('agent.nodes.extract_text_from_docs.dashscope') as mock_dashscope, \
             patch('agent.nodes.extract_text_from_docs.logger') as mock_logger:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.output = Mock()
            mock_response.output.choices = [Mock()]
            mock_response.output.choices[0].message = Mock()
            mock_response.output.choices[0].message.content = {"unexpected": "dict format"}  # Invalid dict format
            mock_dashscope.MultiModalConversation.call.return_value = mock_response
            
            state = get_mock_initial_state("ocr")
            state["source_file_urls"] = ["https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/malformed_response.jpg"]
            state["dashscope_api_key"] = "test_api_key"
            
            # Act
            result = await extract_text_from_docs(state, mock_runtime)
            
            # Assert
            assert "raw_text" in result
            assert result["raw_text"] == ""
            mock_logger.warning.assert_called()
            warning_calls = [str(call) for call in mock_logger.warning.call_args_list]
            assert any("Unexpected content format" in call for call in warning_calls)
    
    @pytest.mark.asyncio
    async def test_extract_text_with_list_content_no_text_key(self, mock_runtime):
        """Test handling of list content without text key - alternative API response format."""
        # Arrange
        with patch('agent.nodes.extract_text_from_docs.dashscope') as mock_dashscope:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.output = Mock()
            mock_response.output.choices = [Mock()]
            mock_response.output.choices[0].message = Mock()
            mock_response.output.choices[0].message.content = [MockDocuments.HEARING_TRANSCRIPT_CN]
            mock_dashscope.MultiModalConversation.call.return_value = mock_response
            
            state = get_mock_initial_state("ocr")
            state["source_file_urls"] = ["https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/transcript_simple.jpg"]
            state["dashscope_api_key"] = "test_api_key"
            
            # Act
            result = await extract_text_from_docs(state, mock_runtime)
            
            # Assert
            assert "raw_text" in result
            assert result["raw_text"] == MockDocuments.HEARING_TRANSCRIPT_CN.strip()


class TestExtractTextWithQwenOcr:
    """Test cases for _extract_text_with_qwen_ocr helper function."""
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_single_image_success(self, mock_dashscope, mock_court_hearing_response):
        """Test successful extraction from single court hearing image."""
        # Arrange
        mock_dashscope.MultiModalConversation.call.return_value = mock_court_hearing_response
        image_url = "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/court_summon.jpg"
        
        # Act
        result = await asyncio.to_thread(_extract_text_with_qwen_ocr, image_url)
        
        # Assert
        assert result == MockDocuments.COURT_HEARING_CN.strip()
        mock_dashscope.MultiModalConversation.call.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_single_image_unsupported_format_error(self, mock_dashscope):
        """Test error handling for unsupported PDF format when expecting image."""
        # Arrange
        image_url = "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/legal_document.pdf"  # Unsupported format
        
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
        """Test error handling when Qwen-VL-OCR API call fails."""
        # Arrange
        mock_dashscope.MultiModalConversation.call.side_effect = Exception("Qwen-VL-OCR API quota exceeded")
        image_url = "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/contract.jpg"
        
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
        """Test handling of API error response for corrupted image file."""
        # Arrange
        mock_error_response = Mock()
        mock_error_response.status_code = 400
        mock_error_response.code = "InvalidParameter"
        mock_error_response.message = "Image file corrupted or unreadable"
        mock_dashscope.MultiModalConversation.call.return_value = mock_error_response
        image_url = "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/corrupted_image.jpg"
        
        with patch('agent.nodes.extract_text_from_docs.logger') as mock_logger:
            # Act
            result = await asyncio.to_thread(_extract_text_with_qwen_ocr, image_url)
            
            # Assert
            assert result == ""
            mock_logger.error.assert_called_once()
            assert "OCR API error" in str(mock_logger.error.call_args)

    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_single_image_string_content_response(self, mock_dashscope):
        """Test handling of direct string content response from asset preservation document."""
        # Arrange
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.output = Mock()
        mock_response.output.choices = [Mock()]
        mock_response.output.choices[0].message = Mock()
        mock_response.output.choices[0].message.content = MockDocuments.ASSET_PRESERVATION_CN
        mock_dashscope.MultiModalConversation.call.return_value = mock_response
        image_url = "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/asset_preservation.jpg"
        
        # Act
        result = await asyncio.to_thread(_extract_text_with_qwen_ocr, image_url)
        
        # Assert
        assert result == MockDocuments.ASSET_PRESERVATION_CN.strip()
        mock_dashscope.MultiModalConversation.call.assert_called_once()

    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_single_image_list_content_no_text_key(self, mock_dashscope):
        """Test handling of list content without text key - alternative response format."""
        # Arrange
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.output = Mock()
        mock_response.output.choices = [Mock()]
        mock_response.output.choices[0].message = Mock()
        mock_response.output.choices[0].message.content = [MockDocuments.GENERAL_TASK_CN]
        mock_dashscope.MultiModalConversation.call.return_value = mock_response
        image_url = "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/task_note.jpg"
        
        # Act
        result = await asyncio.to_thread(_extract_text_with_qwen_ocr, image_url)
        
        # Assert
        assert result == MockDocuments.GENERAL_TASK_CN.strip()
        mock_dashscope.MultiModalConversation.call.assert_called_once()

    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_extract_single_image_unexpected_content_format(self, mock_dashscope):
        """Test handling of unexpected content format in helper function from malformed response."""
        # Arrange
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.output = Mock()
        mock_response.output.choices = [Mock()]
        mock_response.output.choices[0].message = Mock()
        mock_response.output.choices[0].message.content = {"unexpected": "malformed dict response"}
        mock_dashscope.MultiModalConversation.call.return_value = mock_response
        image_url = "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/malformed_api_test.jpg"
        
        with patch('agent.nodes.extract_text_from_docs.logger') as mock_logger:
            # Act
            result = await asyncio.to_thread(_extract_text_with_qwen_ocr, image_url)
            
            # Assert
            assert result == ""
            mock_logger.warning.assert_called_once()
            assert "Unexpected content format" in str(mock_logger.warning.call_args)


class TestSupportedImageFormats:
    """Test cases for supported image format validation."""
    
    @pytest.mark.parametrize("image_url,should_succeed", [
        ("https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/court_document.jpg", True),
        ("https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/contract.jpeg", True),
        ("https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/notice.jpe", True),
        ("https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/screenshot.png", True),
        ("https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/scanned_doc.bmp", True),
        ("https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/legal_form.tiff", True),
        ("https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/receipt.tif", True),
        ("https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/modern_doc.webp", True),
        ("https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/mobile_photo.heic", True),
        ("https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/UPPERCASE.JPG", True),  # Case insensitive
        ("https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/MIXED_CASE.PNG", True),  # Case insensitive
        ("https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/document.pdf", False),
        ("https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/plaintext.txt", False),
        ("https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/wordfile.doc", False),
        ("https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/animation.gif", False),
        ("https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/no_extension", False),  # No extension
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
        mock_response.output.choices[0].message.content = [{'text': MockDocuments.COURT_HEARING_CN}]
        mock_dashscope.MultiModalConversation.call.return_value = mock_response
        
        # Act
        result = await asyncio.to_thread(_extract_text_with_qwen_ocr, image_url)
        
        # Assert
        if should_succeed:
            assert result == MockDocuments.COURT_HEARING_CN.strip()
            mock_dashscope.MultiModalConversation.call.assert_called_once()
        else:
            assert result == ""
            mock_dashscope.MultiModalConversation.call.assert_not_called()


class TestExtractTextLogging:
    """Test cases for logging behavior in extract_text_from_docs."""
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.logger')
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_logging_successful_processing(self, mock_dashscope, mock_logger, mock_runtime, mock_court_hearing_response):
        """Test that successful processing logs appropriate messages for court hearing document."""
        # Arrange
        mock_dashscope.MultiModalConversation.call.return_value = mock_court_hearing_response
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/court_summon.jpg"]
        state["dashscope_api_key"] = "test_api_key"
        
        # Act
        await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        mock_logger.info.assert_called()
        log_calls = [str(call) for call in mock_logger.info.call_args_list]
        assert any("Starting OCR text extraction for 1 image files" in call for call in log_calls)
        assert any("Processing image 1/1" in call for call in log_calls)
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.logger')
    async def test_logging_missing_api_key(self, mock_logger, mock_runtime):
        """Test logging when API key is missing for court document processing."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/court_summon.jpg"]
        # Don't set dashscope_api_key in state
        
        # Act
        await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        mock_logger.error.assert_called_once()
        assert "dashscope_api_key not found in state" in str(mock_logger.error.call_args)
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.logger')
    async def test_logging_empty_file_list(self, mock_logger, mock_runtime):
        """Test logging when file list is empty."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = []
        state["dashscope_api_key"] = "test_api_key"
        
        # Act
        await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        mock_logger.warning.assert_called_once()
        assert "No image files provided for OCR extraction" in str(mock_logger.warning.call_args)
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.logger')
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_logging_ocr_completion_multiple_files(self, mock_dashscope, mock_logger, mock_runtime):
        """Test logging for successful completion with multiple legal documents."""
        # Arrange
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.output = Mock()
        mock_response.output.choices = [Mock()]
        mock_response.output.choices[0].message = Mock()
        mock_response.output.choices[0].message.content = [{'text': MockDocuments.COURT_HEARING_CN}]
        mock_dashscope.MultiModalConversation.call.return_value = mock_response
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = [
            "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/court_page1.jpg", 
            "https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/court_page2.jpg"
        ]
        state["dashscope_api_key"] = "test_api_key"
        
        # Act
        await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        mock_logger.info.assert_called()
        log_calls = [str(call) for call in mock_logger.info.call_args_list]
        assert any("Starting OCR text extraction for 2 image files" in call for call in log_calls)
        assert any("OCR extraction completed. Total text length:" in call for call in log_calls)
        assert any("from 2 successful extractions" in call for call in log_calls)

    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.logger')
    @patch('agent.nodes.extract_text_from_docs.dashscope')
    async def test_logging_no_successful_extractions(self, mock_dashscope, mock_logger, mock_runtime):
        """Test logging when no extractions are successful from corrupted legal document."""
        # Arrange
        mock_dashscope.MultiModalConversation.call.side_effect = Exception("OCR API failed - corrupted image")
        
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/damaged_document.jpg"]
        state["dashscope_api_key"] = "test_api_key"
        
        # Act
        await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        mock_logger.warning.assert_called()
        warning_calls = [str(call) for call in mock_logger.warning.call_args_list]
        assert any("No text was successfully extracted from any images" in call for call in warning_calls)

    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs.logger')
    async def test_logging_top_level_exception(self, mock_logger, mock_runtime):
        """Test logging when top-level exception occurs during state processing."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["source_file_urls"] = ["https://fekzslcjlovoavfgtjea.supabase.co/storage/v1/object/public/test/problematic_file.jpg"]
        state["dashscope_api_key"] = "test_api_key"
        
        with patch('agent.nodes.extract_text_from_docs.dashscope') as mock_dashscope:
            # Make state.get() raise an exception to simulate top-level failure
            def side_effect(*args, **kwargs):
                if args[0] == "source_file_urls":
                    raise Exception("Critical system error during file URL processing")
                return kwargs.get('default')
            
            state = Mock()
            state.get.side_effect = side_effect
            
            # Act
            await extract_text_from_docs(state, mock_runtime)
        
        # Assert
        mock_logger.error.assert_called_once()
        assert "OCR text extraction failed" in str(mock_logger.error.call_args)


class TestAsyncWrapperFunction:
    """Test cases for _extract_text_from_single_image async wrapper."""
    
    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs._extract_text_with_qwen_ocr')
    async def test_async_wrapper_calls_sync_function(self, mock_extract_sync):
        """Test that async wrapper properly calls sync function in thread."""
        # Arrange
        mock_extract_sync.return_value = "extracted text"
        image_url = "https://example.com/test.jpg"
        
        # Act
        result = await _extract_text_from_single_image(image_url)
        
        # Assert
        assert result == "extracted text"
        mock_extract_sync.assert_called_once_with(image_url)

    @pytest.mark.asyncio
    @patch('agent.nodes.extract_text_from_docs._extract_text_with_qwen_ocr')
    async def test_async_wrapper_handles_exception(self, mock_extract_sync):
        """Test that async wrapper properly handles exceptions from sync function."""
        # Arrange
        mock_extract_sync.side_effect = Exception("Sync function failed")
        image_url = "https://example.com/test.jpg"
        
        # Act & Assert
        with pytest.raises(Exception, match="Sync function failed"):
            await _extract_text_from_single_image(image_url)