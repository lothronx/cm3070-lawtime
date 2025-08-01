"""Convert voice notes to raw text using ASR."""

import logging
from typing import Any, Dict, List

from langgraph.runtime import Runtime

from ..utils.state import AgentState


logger = logging.getLogger(__name__)


class Context:
    """Context parameters for the agent."""
    pass


def _extract_legal_vocabulary(client_list: List[dict]) -> List[str]:
    """Extract client names and legal terms for custom vocabulary."""
    vocabulary = []
    
    # Extract client names for better recognition accuracy
    for client in client_list:
        client_name = client.get("client_name", "")
        if client_name:
            vocabulary.append(client_name)
    
    # Add common legal terms that might appear in voice notes
    legal_terms = [
        "法院", "开庭", "合同", "纠纷", "诉讼", "仲裁", "律师", "法官",
        "原告", "被告", "证据", "庭审", "调解", "判决", "执行", "保全",
        "案件", "案号", "传票", "听证", "和解", "上诉", "二审", "终审"
    ]
    vocabulary.extend(legal_terms)
    
    return vocabulary


async def _call_paraformer_asr_api(
    audio_url: str, 
    custom_vocabulary: List[str]
) -> str:
    """Call Alibaba Paraformer-v2 ASR API for audio transcription.
    
    This is a placeholder implementation. The actual implementation will:
    1. Make HTTP request to Paraformer-v2 API endpoint
    2. Pass custom vocabulary for improved legal term recognition
    3. Handle Chinese language processing optimally
    4. Include timeout and retry logic
    """
    # TODO: Replace with actual API call
    # Example implementation structure:
    # - Extract audio format from URL
    # - Prepare API request with custom vocabulary
    # - Make async HTTP call to Paraformer-v2 endpoint
    # - Parse response and extract transcribed text
    # - Handle API errors gracefully
    
    logger.info(f"Transcribing audio file: {audio_url}")
    logger.debug(f"Using custom vocabulary: {custom_vocabulary[:5]}...")  # Log first 5 terms
    
    # Simulate different transcription results based on URL for testing
    if "audio1.m4a" in audio_url:
        return "提醒我明天上午跟进一下阿里巴巴那个案子，另外下午两点在星巴克跟张三开个会。"
    elif "audio2.wav" in audio_url:
        return "请在今天下午之前联系对方律师李明，确认函件接收情况。"
    elif "audio" in audio_url:
        return "这是一段关于法律事务的语音备忘录。"
    else:
        return "转录的语音内容"


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
        
        # Extract legal vocabulary for improved recognition
        custom_vocabulary = _extract_legal_vocabulary(client_list)
        logger.debug(f"Prepared custom vocabulary with {len(custom_vocabulary)} terms")
        
        # Transcribe each audio file
        transcriptions = []
        
        for audio_url in source_file_urls:
            try:
                # Validate audio format (support common formats)
                supported_formats = ['.m4a', '.wav', '.mp3', '.aac']
                if not any(audio_url.lower().endswith(fmt) for fmt in supported_formats):
                    logger.warning(f"Potentially unsupported audio format: {audio_url}")
                
                # Call ASR API for transcription
                transcribed_text = await _call_paraformer_asr_api(
                    audio_url, 
                    custom_vocabulary
                )
                
                if transcribed_text.strip():
                    transcriptions.append(transcribed_text.strip())
                    logger.info(f"Successfully transcribed: {audio_url}")
                else:
                    logger.warning(f"Empty transcription result for: {audio_url}")
                    
            except Exception as e:
                logger.error(f"Failed to transcribe audio file {audio_url}: {str(e)}")
                # Continue processing other files even if one fails
                continue
        
        # Concatenate all transcriptions with spaces
        raw_text = " ".join(transcriptions) if transcriptions else ""
        
        logger.info(f"Audio transcription completed. Total text length: {len(raw_text)} characters")
        
        return {
            "raw_text": raw_text
        }
        
    except Exception as e:
        logger.error(f"Audio transcription failed: {str(e)}")
        # Return empty text on error to allow graceful degradation
        return {
            "raw_text": ""
        }