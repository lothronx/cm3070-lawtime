"""Final formatting and standardization of extracted data."""

import logging
from typing import Any, Dict, List, Optional

from langgraph.runtime import Runtime

from agent.utils.state import AgentState

logger = logging.getLogger(__name__)


class Context:
    """Context parameters for the agent."""

    pass


def _resolve_client_relationship(
    related_party_name: Optional[str], client_list: List[dict]
) -> Dict[str, Any]:
    """Resolve client relationship from extracted party name.

    Args:
        related_party_name: The party name extracted from the document/audio
        client_list: List of existing clients with id and client_name

    Returns:
        Dictionary with client resolution status and details
    """
    if not related_party_name or not related_party_name.strip():
        return {
            "status": "NO_CLIENT_IDENTIFIED",
            "client_id": None,
            "client_name": None,
        }

    # Clean and normalize the party name for comparison
    normalized_party_name = related_party_name.strip()

    # Try to find exact or partial matches in client list
    for client in client_list:
        client_name = client.get("client_name", "").strip()
        client_id = client.get("id")

        if not client_name:
            continue

        # Exact match
        if normalized_party_name == client_name:
            return {
                "status": "MATCH_FOUND",
                "client_id": client_id,
                "client_name": client_name,
            }

        # Partial match (party name contains client name or vice versa)
        if normalized_party_name in client_name or client_name in normalized_party_name:
            return {
                "status": "MATCH_FOUND",
                "client_id": client_id,
                "client_name": client_name,
            }

    # No match found, propose as new client
    return {
        "status": "NEW_CLIENT_PROPOSED",
        "client_id": None,
        "client_name": normalized_party_name,
    }


def _standardize_extracted_event(
    event: Dict[str, Any], client_list: List[dict]
) -> Dict[str, Any]:
    """Convert a single extracted event to the proposed task format.

    Args:
        event: Raw extracted event from specialist nodes
        client_list: List of existing clients for resolution

    Returns:
        Standardized proposed task matching API specification
    """
    # Extract core fields with defaults
    title = event.get("raw_title", "Untitled Task")
    event_time = event.get("raw_date_time")  # ISO format or None
    location = event.get("raw_location")
    note = event.get("note", "")
    related_party_name = event.get("related_party_name")

    # Resolve client relationship
    client_resolution = _resolve_client_relationship(related_party_name, client_list)

    # Build the proposed task according to API spec
    proposed_task = {
        "title": title,
        "event_time": event_time,  # Already in ISO format from extractors
        "location": location,
        "note": note,
        "client_resolution": client_resolution,
    }

    return proposed_task


async def aggregate_and_format(
    state: AgentState, runtime: Runtime[Context]
) -> Dict[str, Any]:
    """Perform final cleaning, standardization, and formatting of extracted data.

    This node is the convergence point for both OCR and ASR paths.
    Converts extracted_events to proposed_tasks format expected by the frontend.

    Args:
        state: AgentState containing extracted_events and client_list
        runtime: LangGraph runtime context (unused in this implementation)

    Returns:
        Dictionary with proposed_tasks list ready for API response
    """
    try:
        extracted_events = state.get("extracted_events", [])
        client_list = state.get("client_list", [])

        logger.info(
            "Starting aggregate_and_format with %d extracted events",
            len(extracted_events),
        )

        # Handle empty events case
        if not extracted_events:
            logger.info("No extracted events to process")
            return {"proposed_tasks": []}

        # Convert each extracted event to proposed task format
        proposed_tasks = []
        for i, event in enumerate(extracted_events):
            try:
                proposed_task = _standardize_extracted_event(event, client_list)
                proposed_tasks.append(proposed_task)

                logger.debug(
                    "Converted event %d: '%s' -> client_resolution: %s",
                    i + 1,
                    proposed_task.get("title", "Unknown"),
                    proposed_task.get("client_resolution", {}).get("status", "Unknown"),
                )

            except Exception as e:
                logger.warning(
                    "Failed to convert extracted event %d: %s. Skipping.", i + 1, str(e)
                )
                continue

        logger.info(
            "Successfully aggregated %d proposed tasks from %d extracted events",
            len(proposed_tasks),
            len(extracted_events),
        )

        return {"proposed_tasks": proposed_tasks}

    except Exception as e:
        logger.error("Unexpected error in aggregate_and_format: %s", str(e))
        # Return empty tasks to allow graceful degradation
        return {"proposed_tasks": []}
