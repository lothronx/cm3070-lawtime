"""Extract tasks from voice note transcriptions."""

from typing import Any, Dict

from langgraph.runtime import Runtime

from ..utils.state import AgentState


class Context:
    """Context parameters for the agent."""
    pass


async def extract_task_from_note(
    state: AgentState, runtime: Runtime[Context]
) -> Dict[str, Any]:
    """Lightweight all-in-one analysis of voice note.

    Simultaneously extracts event details and identifies relevant client.
    """
    # TODO: Call LLM with specialized prompt for voice notes
    # TODO: Extract task details and match client in single step

    # Placeholder implementation
    extracted_events = [
        {
            "title": "Meeting with Client",
            "client_name": "Voice Note Client",
            "event_time": "2024-03-18T14:00:00",
            "location": "Conference Room",
            "notes": "Task extracted from voice note",
        }
    ]

    return {
        "extracted_events": extracted_events,
    }