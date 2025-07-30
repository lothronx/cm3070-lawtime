"""Extract text from images or PDF files using OCR."""

from typing import Any, Dict

from langgraph.runtime import Runtime

from ..utils.state import AgentState


class Context:
    """Context parameters for the agent."""
    pass


async def extract_text_from_docs(
    state: AgentState, runtime: Runtime[Context]
) -> Dict[str, Any]:
    """Extract all text from a set of images or PDF files."""
    # TODO: Call Alibaba Qwen-VL-OCR model for each file
    # TODO: Concatenate results

    # Placeholder implementation
    return {
        "raw_text": "Placeholder extracted text from documents",
    }