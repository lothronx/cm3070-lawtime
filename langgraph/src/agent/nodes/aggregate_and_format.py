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
    identified_parties = state.get("identified_parties", [])
    
    for event in state.get("extracted_events", []):
        # Find matching client resolution for this event
        client_resolution = {"status": "OTHER_PARTY", "client_id": None, "client_name": "Unknown Client"}
        
        # Look for matching party by name
        related_party_name = event.get("related_party_name")
        if related_party_name and identified_parties:
            for party in identified_parties:
                if party.get("name") == related_party_name and "client_resolution" in party:
                    client_resolution = party["client_resolution"]
                    break
        
        # If no match by specific party name, or if there are parties available, use the first party's resolution
        if client_resolution["status"] == "OTHER_PARTY" and identified_parties:
            first_party = identified_parties[0]
            if "client_resolution" in first_party:
                client_resolution = first_party["client_resolution"]
        
        # Simple format conversion - in real implementation this would be more sophisticated
        task = {
            "title": event.get("raw_title", event.get("title", "Untitled Task")),
            "client_name": client_resolution.get("client_name", "Unknown Client"),
            "event_time": event.get("raw_date_time", event.get("event_time", "09:00")),
            "location": event.get("raw_location", event.get("location", "")),
            "note": event.get("note", event.get("notes", "")),
            "client_resolution": client_resolution,
        }
        proposed_tasks.append(task)

    return {
        "proposed_tasks": proposed_tasks,
    }