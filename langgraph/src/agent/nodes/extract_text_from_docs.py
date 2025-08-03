"""Extract text from images using Alibaba Qwen-VL-OCR model.

This module handles OCR text extraction from image files only.
Supported formats: BMP, JPEG, PNG, TIFF, WEBP, HEIC.
"""

import logging
import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from langchain_community.chat_models.tongyi import ChatTongyi
from langchain_core.messages import HumanMessage
from langgraph.runtime import Runtime

from agent.utils.state import AgentState

# Load environment variables
load_dotenv(".env")

logger = logging.getLogger(__name__)


class Context:
    """Context parameters for the agent."""
    pass


async def _extract_text_from_single_image(image_url: str, ocr_model: ChatTongyi) -> str:
    """Extract text from a single image using Qwen-VL-OCR.
    
    Qwen-VL-OCR model limitations:
    - Images only (no PDFs), max 10MB file size
    - Min dimensions: 10x10 pixels, aspect ratio max 200:1 or 1:200
    - Recommended max pixels: 15.68M (can go up to 23.52M with max_pixels adjustment)
    
    Args:
        image_url: URL of the image to process
        ocr_model: Initialized ChatTongyi OCR model
        
    Returns:
        Extracted text string, empty if extraction fails
    """
    try:
        # Validate image format - only supported formats by Qwen-VL-OCR
        supported_formats = [
            '.bmp',           # BMP
            '.jpe', '.jpeg', '.jpg',  # JPEG
            '.png',           # PNG  
            '.tif', '.tiff',  # TIFF
            '.webp',          # WEBP
            '.heic'           # HEIC
        ]
        
        url_lower = image_url.lower()
        if not any(url_lower.endswith(fmt) for fmt in supported_formats):
            logger.error(f"Unsupported image format for OCR: {image_url}. Supported: {supported_formats}")
            return ""
        
        # Prepare OCR request
        image_message = {"image": image_url}
        text_message = {
            "text": "Please output only the text content from the image without any additional descriptions or formatting."
        }
        
        message = HumanMessage(content=[text_message, image_message])
        
        # Call OCR model
        response = ocr_model.invoke([message])
        
        extracted_text = response.content.strip() if response.content else ""
        
        if extracted_text:
            logger.info(f"Successfully extracted {len(extracted_text)} characters from: {image_url}")
        else:
            logger.warning(f"No text extracted from: {image_url}")
            
        return extracted_text
        
    except Exception as e:
        logger.error(f"Failed to extract text from image {image_url}: {str(e)}")
        return ""


async def extract_text_from_docs(
    state: AgentState, runtime: Runtime[Context]
) -> Dict[str, Any]:
    """Extract all text from a set of images using Qwen-VL-OCR.
    
    This function processes each image URL from state.source_file_urls using
    Alibaba's Qwen-VL-OCR model and concatenates all extracted text.
    
    Note: Only supports images (BMP, JPEG, PNG, TIFF, WEBP, HEIC), not PDFs.
    
    Args:
        state: AgentState containing source_file_urls list of image URLs
        runtime: LangGraph runtime context
        
    Returns:
        Dict containing "raw_text" key with concatenated extracted text
    """
    try:
        source_file_urls = state.get("source_file_urls", [])
        
        logger.info(f"Starting OCR text extraction for {len(source_file_urls)} image files")
        
        # Handle empty file list gracefully
        if not source_file_urls:
            logger.warning("No image files provided for OCR extraction")
            return {"raw_text": ""}
        
        # Initialize OCR model
        dashscope_api_key = os.getenv("DASHSCOPE_API_KEY")
        if not dashscope_api_key:
            logger.error("DASHSCOPE_API_KEY not found in environment variables")
            return {"raw_text": ""}
            
        ocr_model = ChatTongyi(model_name="qwen-vl-ocr", api_key=dashscope_api_key)
        logger.debug("Initialized Qwen-VL-OCR model")
        
        # Process each image file
        extracted_texts: List[str] = []
        
        for i, image_url in enumerate(source_file_urls, 1):
            logger.info(f"Processing image {i}/{len(source_file_urls)}: {image_url}")
            
            extracted_text = await _extract_text_from_single_image(image_url, ocr_model)
            
            if extracted_text:
                extracted_texts.append(extracted_text)
            # Continue processing even if one image fails
        
        # Concatenate all extracted text with clear separators
        if extracted_texts:
            raw_text = "\n\n=== DOCUMENT SEPARATOR ===\n\n".join(extracted_texts)
            logger.info(f"OCR extraction completed. Total text length: {len(raw_text)} characters from {len(extracted_texts)} successful extractions")
        else:
            raw_text = ""
            logger.warning("No text was successfully extracted from any images")
        
        return {
            "raw_text": raw_text
        }
        
    except Exception as e:
        logger.error(f"OCR text extraction failed: {str(e)}")
        # Return empty text on error to allow graceful degradation
        return {
            "raw_text": ""
        }