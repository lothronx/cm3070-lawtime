"""Convert voice notes to raw text using ASR.

This module handles ASR (Automatic Speech Recognition) processing of audio files
using Alibaba's Paraformer-v2 model with legal domain optimization.
Supported formats: m4a, wav, mp3, aac, flac.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional
import dashscope
from dashscope.audio.asr import (
    Transcription,
    VocabularyService,
    VocabularyServiceException,
)
import json
from urllib import request
from http import HTTPStatus
from langgraph.runtime import Runtime
from agent.utils.state import AgentState


logger = logging.getLogger(__name__)


class Context:
    """Context parameters for the agent."""

    pass


def _extract_legal_vocabulary(client_list: List[dict]) -> List[str]:
    """Extract client names and legal terms for custom vocabulary.

    Creates a custom vocabulary list to improve ASR accuracy for legal terminology
    and client names that frequently appear in voice notes.

    Args:
        client_list: List of client dictionaries containing client_name keys

    Returns:
        List of vocabulary terms including client names and legal terminology
    """
    vocabulary: List[str] = []

    # Extract client names for better recognition accuracy
    for client in client_list:
        client_name = client.get("client_name", "")
        if client_name and client_name.strip():
            vocabulary.append(client_name.strip())

    # Add common legal terms that might appear in voice notes
    legal_terms = [
        "法院",
        "开庭",
        "合同",
        "纠纷",
        "诉讼",
        "仲裁",
        "律师",
        "法官",
        "原告",
        "被告",
        "证据",
        "庭审",
        "调解",
        "判决",
        "执行",
        "保全",
        "案件",
        "案号",
        "传票",
        "听证",
        "和解",
        "上诉",
        "二审",
        "终审",
    ]
    vocabulary.extend(legal_terms)

    return vocabulary


def _create_custom_vocabulary(vocabulary_terms: List[str]) -> Optional[str]:
    """Create a custom vocabulary for ASR using Dashscope VocabularyService.

    Creates a custom vocabulary list with legal terms and client names
    to improve speech recognition accuracy. Uses proper VocabularyService API.

    Args:
        vocabulary_terms: List of terms to include in custom vocabulary

    Returns:
        vocabulary_id string if successful, None if failed
    """
    if not vocabulary_terms:
        logger.warning(
            "No vocabulary terms provided, skipping custom vocabulary creation"
        )
        return None

    try:
        # Initialize VocabularyService
        service = VocabularyService()

        # Create vocabulary payload with proper format (limit to 50 terms)
        vocabulary_list = []
        for term in vocabulary_terms[:50]:  # API efficiency and limit compliance
            vocabulary_list.append(
                {
                    "text": term,
                    "weight": 4,  # High priority for legal terms
                    "lang": "zh",  # Chinese language
                }
            )

        # Call VocabularyService to create vocabulary
        vocabulary_id = service.create_vocabulary(
            target_model="paraformer-v2",  # Use paraformer-v2 for file transcription
            prefix="lawtime",  # Prefix to identify vocabularies
            vocabulary=vocabulary_list,
        )

        if vocabulary_id:
            logger.info(
                f"Custom vocabulary created successfully with ID: {vocabulary_id}"
            )
            return vocabulary_id
        else:
            logger.warning("Custom vocabulary creation returned None")
            return None

    except VocabularyServiceException as e:
        logger.warning(f"VocabularyService error: {str(e)}")
        return None
    except Exception as e:
        logger.warning(f"Failed to create custom vocabulary: {str(e)}")
        return None


def _delete_custom_vocabulary(vocabulary_id: str) -> bool:
    """Delete a custom vocabulary to free up quota (10 vocabulary limit per account).

    Args:
        vocabulary_id: The vocabulary ID to delete

    Returns:
        True if successfully deleted, False otherwise
    """
    if not vocabulary_id:
        return False

    try:
        service = VocabularyService()
        service.delete_vocabulary(vocabulary_id)
        logger.info(f"Successfully deleted custom vocabulary: {vocabulary_id}")
        return True
    except Exception as e:
        logger.warning(f"Failed to delete vocabulary {vocabulary_id}: {str(e)}")
        return False


def _extract_transcribed_text(transcription_results: List[Dict[str, Any]]) -> str:
    """
    Extract and concatenate all transcribed text from Dashscope ASR results.

    Args:
        transcription_results: List of ASR result dictionaries from Dashscope

    Returns:
        Concatenated transcribed text from all audio files
    """
    all_texts = []

    for result in transcription_results:
        if "transcripts" in result:
            for transcript in result["transcripts"]:
                if "text" in transcript:
                    text = transcript["text"].strip()
                    if text:  # Only add non-empty text
                        all_texts.append(text)

    # Join with space separator
    return " ".join(all_texts)


def _transcribe_batch_with_paraformer(
    audio_urls: List[str], custom_vocabulary: List[str]
) -> str:
    """Call Alibaba Paraformer ASR API for batch audio transcription.

    Processes multiple audio files in a single API call for better efficiency.
    Uses the native Dashscope Transcription async API for speech transcription with
    support for Chinese and English language recognition.

    Args:
        audio_urls: List of audio file URLs to transcribe
        custom_vocabulary: List of legal terms and client names (for future enhancement)

    Returns:
        Transcribed text string with separators between files, empty if transcription fails
    """
    try:
        logger.info(f"Batch transcribing {len(audio_urls)} audio files")

        # Create custom vocabulary if terms are provided
        vocabulary_id = None
        if custom_vocabulary:
            vocabulary_id = _create_custom_vocabulary(custom_vocabulary)
            if vocabulary_id:
                logger.info(
                    f"Using custom vocabulary with {len(custom_vocabulary)} terms"
                )

        # Prepare API call parameters
        api_params = {
            "model": "paraformer-v2",
            "file_urls": audio_urls,  # Pass all URLs at once
            "language_hints": ["zh"],
        }

        # Add vocabulary_id if available
        if vocabulary_id:
            api_params["vocabulary_id"] = vocabulary_id

        # Call async transcription API with all files at once
        task_response = Transcription.async_call(**api_params)

        # Wait for transcription to complete
        transcription_response = Transcription.wait(task=task_response.output.task_id)

        # Extract transcribed text from results
        if transcription_response.status_code == HTTPStatus.OK:
            transcription_results: List[Dict[str, Any]] = []

            # Fetch results from each transcription URL
            for transcription in transcription_response.output["results"]:
                url = transcription["transcription_url"]
                try:
                    result = json.loads(request.urlopen(url).read().decode("utf8"))
                    transcription_results.append(result)
                except Exception as e:
                    logger.error(f"Failed to fetch result from {url}: {str(e)}")
                    continue

            # Extract and combine all text
            combined_text = _extract_transcribed_text(transcription_results)

            # Clean up vocabulary after successful transcription
            if vocabulary_id:
                _delete_custom_vocabulary(vocabulary_id)

            if combined_text:
                logger.info(
                    f"Transcription successful: {len(combined_text)} characters"
                )
                return combined_text
            else:
                logger.warning("No text was transcribed from audio files")
                return ""
        else:
            logger.error(
                f"Batch transcription API error (status: {transcription_response.status_code}): {transcription_response.output.message}"
            )
            # Clean up vocabulary on error
            if vocabulary_id:
                _delete_custom_vocabulary(vocabulary_id)
            return ""

    except Exception as e:
        logger.error(
            f"Failed to batch transcribe {len(audio_urls)} audio files: {str(e)}"
        )
        # Clean up vocabulary on exception
        if "vocabulary_id" in locals() and vocabulary_id:
            _delete_custom_vocabulary(vocabulary_id)
        return ""


async def _transcribe_batch_audio_files(
    audio_urls: List[str], custom_vocabulary: List[str]
) -> str:
    """Async wrapper for batch audio transcription that runs the blocking call in a separate thread.

    This prevents blocking the event loop when running under LangGraph dev's ASGI server.
    """
    return await asyncio.to_thread(
        _transcribe_batch_with_paraformer, audio_urls, custom_vocabulary
    )


async def transcribe_audio(
    state: AgentState, runtime: Runtime[Context]
) -> Dict[str, Any]:
    """Convert voice note to raw text using legal-specific vocabulary.

    This function processes audio files using Alibaba Paraformer-v2 ASR model
    with custom vocabulary derived from client names and legal terminology.

    Args:
        state: AgentState containing source_file_urls and client_list
        runtime: LangGraph runtime context

    Returns:
        Dict containing only "raw_text" key with concatenated transcriptions
    """
    try:
        source_file_urls = state.get("source_file_urls", [])
        client_list = state.get("client_list", [])

        logger.info(f"Starting audio transcription for {len(source_file_urls)} files")

        # Handle empty file list gracefully
        if not source_file_urls:
            logger.warning("No audio files provided for transcription")
            return {"raw_text": ""}

        # Initialize Dashscope API
        dashscope_api_key = state.get("dashscope_api_key")
        if not dashscope_api_key:
            logger.error("dashscope_api_key not found in state")
            return {"raw_text": ""}

        # Set Dashscope API key
        dashscope.api_key = dashscope_api_key

        # Extract legal vocabulary for improved recognition
        custom_vocabulary = _extract_legal_vocabulary(client_list)

        # Validate audio formats (support common formats)
        supported_formats = [
            "aac",
            "amr",
            "avi",
            "flac",
            "flv",
            "m4a",
            "mkv",
            "mov",
            "mp3",
            "mp4",
            "mpeg",
            "ogg",
            "opus",
            "wav",
            "webm",
            "wma",
            "wmv",
        ]
        for audio_url in source_file_urls:
            if not any(audio_url.lower().endswith(fmt) for fmt in supported_formats):
                logger.warning(f"Potentially unsupported audio format: {audio_url}")

        # Call batch ASR API for all audio files at once
        raw_text = await _transcribe_batch_audio_files(
            source_file_urls, custom_vocabulary
        )

        if not raw_text.strip():
            logger.warning("No text was transcribed from audio files")

        return {"raw_text": raw_text}

    except Exception as e:
        logger.error(f"Audio transcription failed: {str(e)}")
        return {"raw_text": ""}
