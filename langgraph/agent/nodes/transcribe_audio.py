"""Convert voice notes to raw text using ASR."""

from typing import Any, Dict

from langgraph.runtime import Runtime

from ..utils.state import AgentState


class Context:
    """Context parameters for the agent."""
    pass


async def transcribe_audio(
    state: AgentState, runtime: Runtime[Context]
) -> Dict[str, Any]:
    """Convert voice note to raw text using legal-specific vocabulary."""
    # TODO: Call Alibaba Paraformer-v2 ASR model
    # TODO: Use client_list and legal terms as custom vocabulary

    # Placeholder implementation
    return {
        "raw_text": "Placeholder transcribed text from voice note",
    }