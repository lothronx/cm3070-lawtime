"""Unit tests for transcribe_audio node."""

import pytest
from unittest.mock import Mock, patch, AsyncMock, ANY
import json
import asyncio
from http import HTTPStatus

from agent.nodes.transcribe_audio import (
    transcribe_audio,
    _extract_legal_vocabulary,
    _create_custom_vocabulary,
    _delete_custom_vocabulary,
    _extract_transcribed_text,
    _transcribe_batch_with_paraformer,
    _transcribe_batch_audio_files,
)
from tests.fixtures.mock_data import (
    get_mock_initial_state, 
    MOCK_CLIENT_LIST,
    MockDocuments,
    get_mock_asr_state_after_transcription,
)


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


class TestTranscribeAudioHelpers:
    """Test cases for helper functions in transcribe_audio."""

    def test_extract_legal_vocabulary_with_client_names(self):
        """Test extraction of legal vocabulary includes client names."""
        vocabulary = _extract_legal_vocabulary(MOCK_CLIENT_LIST)
        
        # Check client names are included
        assert "ACME Corporation" in vocabulary
        assert "阿里巴巴（中国）有限公司" in vocabulary
        assert "New Horizons LLC" in vocabulary
        
        # Check legal terms are included
        assert "法院" in vocabulary
        assert "开庭" in vocabulary
        assert "合同" in vocabulary
        assert "律师" in vocabulary
        
        # Verify vocabulary has reasonable length
        assert len(vocabulary) > 20  # Client names + legal terms

    def test_extract_legal_vocabulary_empty_client_list(self):
        """Test vocabulary extraction with empty client list still includes legal terms."""
        vocabulary = _extract_legal_vocabulary([])
        
        # Should still have legal terms
        assert "法院" in vocabulary
        assert "开庭" in vocabulary
        assert len(vocabulary) > 0

    def test_extract_legal_vocabulary_filters_empty_names(self):
        """Test that empty or whitespace client names are filtered out."""
        clients_with_empty = [
            {"client_name": "Valid Client"},
            {"client_name": ""},
            {"client_name": "   "},
            {"client_name": None},
            {},  # No client_name key
        ]
        
        vocabulary = _extract_legal_vocabulary(clients_with_empty)
        assert "Valid Client" in vocabulary
        assert "" not in vocabulary
        assert "   " not in vocabulary

    @patch("agent.nodes.transcribe_audio.VocabularyService")
    def test_create_custom_vocabulary_success(self, mock_vocab_service):
        """Test successful creation of a custom vocabulary."""
        mock_service_instance = mock_vocab_service.return_value
        mock_service_instance.create_vocabulary.return_value = "vocab-123"
        
        vocab_id = _create_custom_vocabulary(["term1", "term2"])
        
        assert vocab_id == "vocab-123"
        mock_service_instance.create_vocabulary.assert_called_once()
        
        # Verify proper call parameters
        call_args = mock_service_instance.create_vocabulary.call_args
        assert call_args[1]["target_model"] == "paraformer-v2"
        assert call_args[1]["prefix"] == "lawtime"
        assert len(call_args[1]["vocabulary"]) == 2

    @patch("agent.nodes.transcribe_audio.VocabularyService")
    def test_create_custom_vocabulary_empty_terms(self, mock_vocab_service):
        """Test vocabulary creation with empty terms returns None."""
        vocab_id = _create_custom_vocabulary([])
        assert vocab_id is None
        mock_vocab_service.assert_not_called()

    @patch("agent.nodes.transcribe_audio.VocabularyService")
    def test_create_custom_vocabulary_limits_terms(self, mock_vocab_service):
        """Test vocabulary creation limits to 50 terms max."""
        mock_service_instance = mock_vocab_service.return_value
        mock_service_instance.create_vocabulary.return_value = "vocab-123"
        
        # Create 60 terms
        many_terms = [f"term{i}" for i in range(60)]
        vocab_id = _create_custom_vocabulary(many_terms)
        
        assert vocab_id == "vocab-123"
        call_args = mock_service_instance.create_vocabulary.call_args
        # Should be limited to 50 terms
        assert len(call_args[1]["vocabulary"]) == 50

    @patch("agent.nodes.transcribe_audio.VocabularyService")
    def test_create_custom_vocabulary_vocabulary_service_exception(self, mock_vocab_service):
        """Test vocabulary creation handles VocabularyServiceException."""
        from dashscope.audio.asr import VocabularyServiceException
        
        mock_service_instance = mock_vocab_service.return_value
        # VocabularyServiceException requires specific parameters
        mock_service_instance.create_vocabulary.side_effect = VocabularyServiceException(
            status_code=400, code="InvalidRequest", error_message="Service error", request_id="test"
        )
        
        vocab_id = _create_custom_vocabulary(["term1"])
        assert vocab_id is None

    @patch("agent.nodes.transcribe_audio.VocabularyService")
    def test_create_custom_vocabulary_general_exception(self, mock_vocab_service):
        """Test vocabulary creation handles general exceptions."""
        mock_service_instance = mock_vocab_service.return_value
        mock_service_instance.create_vocabulary.side_effect = Exception("API Error")
        
        vocab_id = _create_custom_vocabulary(["term1"])
        assert vocab_id is None

    @patch("agent.nodes.transcribe_audio.VocabularyService")
    def test_create_custom_vocabulary_returns_none(self, mock_vocab_service):
        """Test vocabulary creation when service returns None."""
        mock_service_instance = mock_vocab_service.return_value
        mock_service_instance.create_vocabulary.return_value = None
        
        vocab_id = _create_custom_vocabulary(["term1"])
        assert vocab_id is None

    @patch("agent.nodes.transcribe_audio.VocabularyService")
    def test_delete_custom_vocabulary_success(self, mock_vocab_service):
        """Test successful deletion of a custom vocabulary."""
        mock_service_instance = mock_vocab_service.return_value
        
        result = _delete_custom_vocabulary("vocab-123")
        
        assert result is True
        mock_service_instance.delete_vocabulary.assert_called_with("vocab-123")

    @patch("agent.nodes.transcribe_audio.VocabularyService")
    def test_delete_custom_vocabulary_empty_id(self, mock_vocab_service):
        """Test vocabulary deletion with empty ID returns False."""
        result = _delete_custom_vocabulary("")
        assert result is False
        mock_vocab_service.assert_not_called()
        
        result = _delete_custom_vocabulary(None)
        assert result is False

    @patch("agent.nodes.transcribe_audio.VocabularyService")
    def test_delete_custom_vocabulary_exception(self, mock_vocab_service):
        """Test vocabulary deletion handles exceptions."""
        mock_service_instance = mock_vocab_service.return_value
        mock_service_instance.delete_vocabulary.side_effect = Exception("Delete error")
        
        result = _delete_custom_vocabulary("vocab-123")
        assert result is False

    def test_extract_transcribed_text_multiple_files(self):
        """Test extraction of text from multiple transcription results."""
        mock_results = [
            {
                "transcripts": [
                    {"text": "Hello world."},
                    {"text": "This is a test."},
                ]
            },
            {"transcripts": [{"text": "Another sentence."}]},
        ]
        
        text = _extract_transcribed_text(mock_results)
        assert text == "Hello world. This is a test. Another sentence."

    def test_extract_transcribed_text_empty_results(self):
        """Test extraction with empty results."""
        assert _extract_transcribed_text([]) == ""
        assert _extract_transcribed_text([{}]) == ""
        assert _extract_transcribed_text([{"transcripts": []}]) == ""

    def test_extract_transcribed_text_filters_empty_text(self):
        """Test that empty text entries are filtered out."""
        mock_results = [
            {
                "transcripts": [
                    {"text": "Valid text"},
                    {"text": ""},
                    {"text": "   "},
                    {"text": "Another valid text"},
                ]
            }
        ]
        
        text = _extract_transcribed_text(mock_results)
        assert text == "Valid text Another valid text"

    def test_extract_transcribed_text_missing_fields(self):
        """Test extraction handles missing fields gracefully."""
        mock_results = [
            {"transcripts": [{"no_text_field": "value"}]},
            {"no_transcripts_field": "value"},
            {"transcripts": [{"text": "Valid text"}]},
        ]
        
        text = _extract_transcribed_text(mock_results)
        assert text == "Valid text"


class TestBatchTranscriptionFunctions:
    """Test cases for batch transcription functions."""

    @patch("agent.nodes.transcribe_audio._delete_custom_vocabulary")
    @patch("agent.nodes.transcribe_audio._create_custom_vocabulary")
    @patch("agent.nodes.transcribe_audio.request.urlopen")
    @patch("agent.nodes.transcribe_audio.Transcription.wait")
    @patch("agent.nodes.transcribe_audio.Transcription.async_call")
    @patch("agent.nodes.transcribe_audio.dashscope")
    def test_transcribe_batch_with_paraformer_success(
        self,
        mock_dashscope,
        mock_async_call,
        mock_wait,
        mock_urlopen,
        mock_create_vocab,
        mock_delete_vocab,
    ):
        """Test successful batch transcription with custom vocabulary."""
        # Arrange
        audio_urls = ["http://example.com/audio1.mp3", "http://example.com/audio2.wav"]
        custom_vocabulary = ["ACME Corporation", "法院"]
        
        mock_create_vocab.return_value = "vocab-123"
        mock_async_call.return_value = Mock(output=Mock(task_id="task-456"))
        mock_wait.return_value = Mock(
            status_code=HTTPStatus.OK,
            output={
                "results": [
                    {"transcription_url": "http://example.com/result1.json"},
                    {"transcription_url": "http://example.com/result2.json"}
                ]
            },
        )
        
        # Mock URL responses - urlopen().read().decode() pattern
        mock_responses = [
            json.dumps({"transcripts": [{"text": "First audio text"}]}),
            json.dumps({"transcripts": [{"text": "Second audio text"}]})
        ]
        
        # Mock urlopen to return objects with read() method
        mock_url_objects = []
        for response in mock_responses:
            mock_obj = Mock()
            mock_obj.read.return_value = response.encode("utf-8")
            mock_url_objects.append(mock_obj)
        
        mock_urlopen.side_effect = mock_url_objects

        # Act
        result = _transcribe_batch_with_paraformer(audio_urls, custom_vocabulary)

        # Assert
        assert result == "First audio text Second audio text"
        mock_create_vocab.assert_called_once_with(custom_vocabulary)
        mock_delete_vocab.assert_called_once_with("vocab-123")
        
        # Verify API call parameters
        call_args = mock_async_call.call_args[1]
        assert call_args["model"] == "paraformer-v2"
        assert call_args["file_urls"] == audio_urls
        assert call_args["language_hints"] == ["zh"]
        assert call_args["vocabulary_id"] == "vocab-123"

    @patch("agent.nodes.transcribe_audio._create_custom_vocabulary")
    @patch("agent.nodes.transcribe_audio.Transcription.async_call")
    def test_transcribe_batch_with_paraformer_no_vocabulary(
        self,
        mock_async_call,
        mock_create_vocab,
    ):
        """Test batch transcription without custom vocabulary."""
        # Arrange
        audio_urls = ["http://example.com/audio.mp3"]
        custom_vocabulary = []
        
        mock_create_vocab.return_value = None

        # Act
        with patch("agent.nodes.transcribe_audio.Transcription.wait") as mock_wait:
            mock_wait.return_value = Mock(
                status_code=HTTPStatus.OK,
                output={"results": []}
            )
            _transcribe_batch_with_paraformer(audio_urls, custom_vocabulary)

        # Verify vocabulary_id not included when None
        call_args = mock_async_call.call_args[1]
        assert "vocabulary_id" not in call_args

    @patch("agent.nodes.transcribe_audio._delete_custom_vocabulary")
    @patch("agent.nodes.transcribe_audio._create_custom_vocabulary")
    @patch("agent.nodes.transcribe_audio.Transcription.wait")
    @patch("agent.nodes.transcribe_audio.Transcription.async_call")
    def test_transcribe_batch_with_paraformer_api_error(
        self,
        mock_async_call,
        mock_wait,
        mock_create_vocab,
        mock_delete_vocab,
    ):
        """Test batch transcription API error handling."""
        # Arrange
        audio_urls = ["http://example.com/audio.mp3"]
        custom_vocabulary = ["term1"]
        
        mock_create_vocab.return_value = "vocab-123"
        mock_async_call.return_value = Mock(output=Mock(task_id="task-456"))
        mock_wait.return_value = Mock(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            output=Mock(message="API Error"),
        )

        # Act
        result = _transcribe_batch_with_paraformer(audio_urls, custom_vocabulary)

        # Assert
        assert result == ""
        mock_delete_vocab.assert_called_once_with("vocab-123")

    @patch("agent.nodes.transcribe_audio._delete_custom_vocabulary")
    @patch("agent.nodes.transcribe_audio._create_custom_vocabulary")
    @patch("agent.nodes.transcribe_audio.Transcription.async_call")
    def test_transcribe_batch_with_paraformer_exception(
        self,
        mock_async_call,
        mock_create_vocab,
        mock_delete_vocab,
    ):
        """Test batch transcription exception handling."""
        # Arrange
        audio_urls = ["http://example.com/audio.mp3"]
        custom_vocabulary = ["term1"]
        
        mock_create_vocab.return_value = "vocab-123"
        mock_async_call.side_effect = Exception("Network error")

        # Act
        result = _transcribe_batch_with_paraformer(audio_urls, custom_vocabulary)

        # Assert
        assert result == ""
        mock_delete_vocab.assert_called_once_with("vocab-123")

    @pytest.mark.asyncio
    @patch("agent.nodes.transcribe_audio._transcribe_batch_with_paraformer")
    @patch("asyncio.to_thread")
    async def test_transcribe_batch_audio_files_async_wrapper(
        self,
        mock_to_thread,
        mock_batch_transcribe,
    ):
        """Test async wrapper calls blocking function in thread."""
        # Arrange
        audio_urls = ["http://example.com/audio.mp3"]
        custom_vocabulary = ["term1"]
        mock_to_thread.return_value = "Transcribed text"

        # Act
        result = await _transcribe_batch_audio_files(audio_urls, custom_vocabulary)

        # Assert
        assert result == "Transcribed text"
        mock_to_thread.assert_called_once_with(
            mock_batch_transcribe, audio_urls, custom_vocabulary
        )


class TestTranscribeAudio:
    """Test cases for the main transcribe_audio node."""

    @pytest.mark.asyncio
    @patch("agent.nodes.transcribe_audio._transcribe_batch_audio_files")
    @patch("agent.nodes.transcribe_audio._extract_legal_vocabulary")
    @patch("agent.nodes.transcribe_audio.dashscope")
    async def test_transcribe_audio_success_single_file(
        self,
        mock_dashscope,
        mock_extract_vocab,
        mock_batch_transcribe,
        mock_runtime,
    ):
        """Test successful audio transcription with single file."""
        # Arrange
        state = get_mock_initial_state("asr")
        state["dashscope_api_key"] = "test-api-key"
        state["source_file_urls"] = ["http://example.com/audio.mp3"]
        state["client_list"] = MOCK_CLIENT_LIST
        
        mock_extract_vocab.return_value = ["ACME Corporation", "法院"]
        mock_batch_transcribe.return_value = MockDocuments.VOICE_NOTE_CN

        # Act
        result = await transcribe_audio(state, mock_runtime)

        # Assert
        assert result == {"raw_text": MockDocuments.VOICE_NOTE_CN}
        mock_dashscope.api_key = "test-api-key"
        mock_extract_vocab.assert_called_once_with(MOCK_CLIENT_LIST)
        mock_batch_transcribe.assert_called_once()

    @pytest.mark.asyncio
    @patch("agent.nodes.transcribe_audio._transcribe_batch_audio_files")
    @patch("agent.nodes.transcribe_audio._extract_legal_vocabulary")
    @patch("agent.nodes.transcribe_audio.dashscope")
    async def test_transcribe_audio_success_multiple_files(
        self,
        mock_dashscope,
        mock_extract_vocab,
        mock_batch_transcribe,
        mock_runtime,
    ):
        """Test successful audio transcription with multiple files."""
        # Arrange
        state = get_mock_initial_state("asr")
        state["dashscope_api_key"] = "test-api-key"
        state["source_file_urls"] = [
            "http://example.com/audio1.mp3",
            "http://example.com/audio2.wav",
            "http://example.com/audio3.m4a"
        ]
        state["client_list"] = MOCK_CLIENT_LIST
        
        mock_extract_vocab.return_value = ["ACME Corporation", "法院"]
        mock_batch_transcribe.return_value = "Combined transcribed text from all files"

        # Act
        result = await transcribe_audio(state, mock_runtime)

        # Assert
        assert result == {"raw_text": "Combined transcribed text from all files"}
        mock_batch_transcribe.assert_called_once_with(
            state["source_file_urls"], 
            ["ACME Corporation", "法院"]
        )

    @pytest.mark.asyncio
    async def test_transcribe_audio_no_files(self, mock_runtime):
        """Test that transcription returns empty string when no files are provided."""
        # Arrange
        state = get_mock_initial_state("asr")
        state["source_file_urls"] = []

        # Act
        result = await transcribe_audio(state, mock_runtime)

        # Assert
        assert result == {"raw_text": ""}

    @pytest.mark.asyncio
    async def test_transcribe_audio_missing_api_key(self, mock_runtime):
        """Test that transcription fails if dashscope_api_key is missing."""
        # Arrange
        state = get_mock_initial_state("asr")
        state["source_file_urls"] = ["http://example.com/audio.mp3"]
        # Remove API key
        state.pop("dashscope_api_key", None)

        # Act
        result = await transcribe_audio(state, mock_runtime)

        # Assert
        assert result == {"raw_text": ""}

    @pytest.mark.asyncio
    @patch("agent.nodes.transcribe_audio._transcribe_batch_audio_files")
    @patch("agent.nodes.transcribe_audio._extract_legal_vocabulary")
    @patch("agent.nodes.transcribe_audio.dashscope")
    async def test_transcribe_audio_empty_transcription(
        self,
        mock_dashscope,
        mock_extract_vocab,
        mock_batch_transcribe,
        mock_runtime,
    ):
        """Test handling of empty transcription result."""
        # Arrange
        state = get_mock_initial_state("asr")
        state["dashscope_api_key"] = "test-api-key"
        state["source_file_urls"] = ["http://example.com/audio.mp3"]
        
        mock_extract_vocab.return_value = ["term1"]
        mock_batch_transcribe.return_value = ""

        # Act
        result = await transcribe_audio(state, mock_runtime)

        # Assert
        assert result == {"raw_text": ""}

    @pytest.mark.asyncio
    @patch("agent.nodes.transcribe_audio._transcribe_batch_audio_files")
    @patch("agent.nodes.transcribe_audio._extract_legal_vocabulary")  
    @patch("agent.nodes.transcribe_audio.dashscope")
    async def test_transcribe_audio_whitespace_only_result(
        self,
        mock_dashscope,
        mock_extract_vocab,
        mock_batch_transcribe,
        mock_runtime,
    ):
        """Test handling of whitespace-only transcription result."""
        # Arrange
        state = get_mock_initial_state("asr")
        state["dashscope_api_key"] = "test-api-key"
        state["source_file_urls"] = ["http://example.com/audio.mp3"]
        
        mock_extract_vocab.return_value = ["term1"]
        mock_batch_transcribe.return_value = "   \n\t  "

        # Act
        result = await transcribe_audio(state, mock_runtime)

        # Assert
        assert result == {"raw_text": "   \n\t  "}  # Preserve original whitespace

    @pytest.mark.asyncio
    @patch("agent.nodes.transcribe_audio._transcribe_batch_audio_files")
    @patch("agent.nodes.transcribe_audio.dashscope")
    async def test_transcribe_audio_empty_client_list(
        self,
        mock_dashscope,
        mock_batch_transcribe,
        mock_runtime,
    ):
        """Test transcription with empty client list."""
        # Arrange
        state = get_mock_initial_state("asr")
        state["dashscope_api_key"] = "test-api-key"
        state["source_file_urls"] = ["http://example.com/audio.mp3"]
        state["client_list"] = []
        
        mock_batch_transcribe.return_value = "Test transcription"

        # Act
        result = await transcribe_audio(state, mock_runtime)

        # Assert
        assert result == {"raw_text": "Test transcription"}
        # Should still call batch transcribe with legal terms vocabulary
        mock_batch_transcribe.assert_called_once()

    @pytest.mark.asyncio
    @patch("agent.nodes.transcribe_audio._transcribe_batch_audio_files")
    @patch("agent.nodes.transcribe_audio.dashscope")
    async def test_transcribe_audio_supported_formats(
        self,
        mock_dashscope,
        mock_batch_transcribe,
        mock_runtime,
    ):
        """Test transcription with various supported audio formats."""
        # Arrange
        supported_urls = [
            "http://example.com/audio.mp3",
            "http://example.com/audio.wav", 
            "http://example.com/audio.m4a",
            "http://example.com/audio.flac",
            "http://example.com/audio.aac",
            "http://example.com/audio.ogg",
        ]
        state = get_mock_initial_state("asr")
        state["dashscope_api_key"] = "test-api-key"
        state["source_file_urls"] = supported_urls
        
        mock_batch_transcribe.return_value = "Multi-format transcription"

        # Act
        result = await transcribe_audio(state, mock_runtime)

        # Assert
        assert result == {"raw_text": "Multi-format transcription"}
        mock_batch_transcribe.assert_called_once_with(supported_urls, ANY)

    @pytest.mark.asyncio
    @patch("agent.nodes.transcribe_audio._transcribe_batch_audio_files")
    @patch("agent.nodes.transcribe_audio.dashscope")
    async def test_transcribe_audio_unsupported_format_warning(
        self,
        mock_dashscope,
        mock_batch_transcribe,
        mock_runtime,
    ):
        """Test that unsupported formats generate warnings but still process."""
        # Arrange
        state = get_mock_initial_state("asr")
        state["dashscope_api_key"] = "test-api-key"
        state["source_file_urls"] = ["http://example.com/document.pdf"]  # Unsupported
        
        mock_batch_transcribe.return_value = "Attempted transcription"

        # Act
        result = await transcribe_audio(state, mock_runtime)

        # Assert
        assert result == {"raw_text": "Attempted transcription"}
        mock_batch_transcribe.assert_called_once()

    @pytest.mark.asyncio
    @patch("agent.nodes.transcribe_audio._transcribe_batch_audio_files")
    @patch("agent.nodes.transcribe_audio.dashscope")
    async def test_transcribe_audio_exception_handling(
        self,
        mock_dashscope,
        mock_batch_transcribe,
        mock_runtime,
    ):
        """Test exception handling in main transcribe_audio function."""
        # Arrange
        state = get_mock_initial_state("asr")
        state["dashscope_api_key"] = "test-api-key"
        state["source_file_urls"] = ["http://example.com/audio.mp3"]
        
        mock_batch_transcribe.side_effect = Exception("Transcription failed")

        # Act
        result = await transcribe_audio(state, mock_runtime)

        # Assert
        assert result == {"raw_text": ""}

    @pytest.mark.asyncio
    @patch("agent.nodes.transcribe_audio._transcribe_batch_audio_files")
    @patch("agent.nodes.transcribe_audio.dashscope")
    async def test_transcribe_audio_with_realistic_mock_data(
        self,
        mock_dashscope,
        mock_batch_transcribe,
        mock_runtime,
    ):
        """Test transcription using realistic mock data from fixtures."""
        # Arrange
        state = get_mock_asr_state_after_transcription()
        state["dashscope_api_key"] = "test-api-key"
        
        # Use realistic voice note transcription
        mock_batch_transcribe.return_value = MockDocuments.VOICE_NOTE_CN

        # Act
        result = await transcribe_audio(state, mock_runtime)

        # Assert
        assert result == {"raw_text": MockDocuments.VOICE_NOTE_CN}
        assert "阿里巴巴" in result["raw_text"]
        assert "张三" in result["raw_text"]

    @pytest.mark.asyncio 
    async def test_transcribe_audio_missing_state_fields(self, mock_runtime):
        """Test graceful handling of missing state fields."""
        # Arrange - minimal state missing optional fields
        state = {
            "source_type": "asr",
            "dashscope_api_key": "test-api-key",
        }
        # source_file_urls and client_list are missing

        # Act
        result = await transcribe_audio(state, mock_runtime)

        # Assert
        assert result == {"raw_text": ""}  # Should handle gracefully
