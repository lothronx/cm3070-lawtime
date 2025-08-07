"""Extract text from images using Alibaba Qwen-VL-OCR model.

This module handles OCR text extraction from image files only.
Supported formats: BMP, JPEG, PNG, TIFF, WEBP, HEIC.
"""

import asyncio
import logging
from typing import Any, Dict, List
import dashscope
from langgraph.runtime import Runtime
from agent.utils.state import AgentState


logger = logging.getLogger(__name__)


class Context:
    """Context parameters for the agent."""

    pass


def _extract_text_with_qwen_ocr(image_url: str) -> str:
    """Extract text from image using direct Dashscope Qwen-VL-OCR API.

    Uses the native Dashscope API with explicit stream=False to avoid streaming issues.

    Args:
        image_url: URL of the image to process

    Returns:
        Extracted text string, empty if extraction fails
    """
    try:
        # Validate image format
        supported_formats = [
            ".bmp",
            ".jpe",
            ".jpeg",
            ".jpg",
            ".png",
            ".tif",
            ".tiff",
            ".webp",
            ".heic",
        ]
        url_lower = image_url.lower()
        if not any(url_lower.endswith(fmt) for fmt in supported_formats):
            logger.error(f"Unsupported image format for OCR: {image_url}")
            return ""

        # Call Dashscope API directly with stream explicitly disabled
        response = dashscope.MultiModalConversation.call(
            model="qwen-vl-ocr",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "text": "Please output only the text content from the image without any additional descriptions or formatting."
                        },
                        {"image": image_url},
                    ],
                }
            ],
            stream=False,  # Explicitly disable streaming
            temperature=0,
        )

        # Handle response
        if response.status_code == 200:
            content = response.output.choices[0].message.content
            if isinstance(content, list) and len(content) > 0:
                if isinstance(content[0], dict) and "text" in content[0]:
                    extracted_text = content[0]["text"].strip()
                else:
                    extracted_text = str(content[0]).strip()
            elif isinstance(content, str):
                extracted_text = content.strip()
            else:
                logger.warning(f"Unexpected content format: {type(content)}")
                extracted_text = ""

            if extracted_text:
                logger.info(
                    f"Successfully extracted {len(extracted_text)} characters from: {image_url}"
                )
            return extracted_text
        else:
            logger.error(f"OCR API error: {response.code} - {response.message}")
            return ""

    except Exception as e:
        logger.error(f"Failed to extract text from image {image_url}: {str(e)}")
        return ""


async def _extract_text_from_single_image(image_url: str) -> str:
    """Async wrapper for OCR extraction that runs the blocking call in a separate thread.

    This prevents blocking the event loop when running under LangGraph dev's ASGI server.
    """
    return await asyncio.to_thread(_extract_text_with_qwen_ocr, image_url)


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

        logger.info(
            f"Starting OCR text extraction for {len(source_file_urls)} image files"
        )

        # Handle empty file list gracefully
        if not source_file_urls:
            logger.warning("No image files provided for OCR extraction")
            return {"raw_text": ""}

        # Initialize Dashscope API
        dashscope.api_key = state.get("dashscope_api_key")
        if not dashscope.api_key:
            logger.error("dashscope_api_key not found in state")
            return {"raw_text": ""}
        logger.debug("Initialized Dashscope API for OCR")

        # Process each image file
        extracted_texts: List[str] = []

        for i, image_url in enumerate(source_file_urls, 1):
            logger.info(f"Processing image {i}/{len(source_file_urls)}: {image_url}")

            extracted_text = await _extract_text_from_single_image(image_url)

            if extracted_text:
                extracted_texts.append(extracted_text)
            # Continue processing even if one image fails

        # Concatenate all extracted text with clear separators
        if extracted_texts:
            raw_text = "\n\n=== DOCUMENT SEPARATOR ===\n\n".join(extracted_texts)
            logger.info(
                f"OCR extraction completed. Total text length: {len(raw_text)} characters from {len(extracted_texts)} successful extractions"
            )
        else:
            raw_text = ""
            logger.warning("No text was successfully extracted from any images")

        return {"raw_text": raw_text}

    except Exception as e:
        logger.error(f"OCR text extraction failed: {str(e)}")
        # Return empty text on error to allow graceful degradation
        return {"raw_text": ""}
