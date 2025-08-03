"""Handle uncategorized or misclassified documents (fallback)."""

from typing import Any, Dict

from langgraph.runtime import Runtime

from ...utils.state import AgentState


class Context:
    """Context parameters for the agent."""
    pass


async def extract_general_task(
    state: AgentState, runtime: Runtime[Context]
) -> Dict[str, Any]:
    """Handle uncategorized or misclassified documents (fallback)."""
    # TODO: Execute broad prompt to find any general task

    # Placeholder implementation - always succeeds as fallback
    extracted_events = [
        {
            "title": "General Legal Task",
            "client_name": "Placeholder Client",
            "event_time": "2024-03-30T09:00:00",
            "location": "Office",
            "notes": "General task extracted from document",
        }
    ]

    return {
        "validation_passed": True,  # General extraction always passes
        "extracted_events": extracted_events,
    }