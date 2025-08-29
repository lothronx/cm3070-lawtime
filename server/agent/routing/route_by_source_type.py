"""Route workflow based on input file type."""

from typing import Literal

from ..utils.state import AgentState


def route_by_source_type(
    state: AgentState,
) -> Literal["extract_text_from_docs", "transcribe_audio"]:
    """Route the workflow based on the input file type after agent state initialization.

    Routes to transcribe_audio (for ASR) or extract_text_from_docs (for OCR).
    """
    if state["source_type"] == "asr":
        return "transcribe_audio"
    else:  # 'ocr'
        return "extract_text_from_docs"