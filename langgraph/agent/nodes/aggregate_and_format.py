"""Final formatting and standardization of extracted data."""

from typing import Any, Dict

from langgraph.runtime import Runtime

from ..utils.state import AgentState


class Context:
    """Context parameters for the agent."""
    pass


async def aggregate_and_format(
    state: AgentState, runtime: Runtime[Context]
) -> Dict[str, Any]:
    """Perform final cleaning, standardization, and formatting of extracted data.

    This node is the convergence point for both OCR and ASR paths.
    """
    # TODO: Implement standardization logic
    # TODO: Apply business logic (e.g., defaulting event time to 09:00 AM)

    # Placeholder: Convert extracted_events to proposed_tasks format
    proposed_tasks = []
    for event in state.get("extracted_events", []):
        # Simple format conversion - in real implementation this would be more sophisticated
        task = {
            "title": event.get("title", "Untitled Task"),
            "client_name": event.get("client_name", "Unknown Client"),
            "event_time": event.get("event_time", "09:00"),
            "location": event.get("location", ""),
            "notes": event.get("notes", ""),
        }
        proposed_tasks.append(task)

    return {
        "proposed_tasks": proposed_tasks,
    }