"""Initialize agent state with frontend-provided context."""

from datetime import datetime, timezone, timedelta
from typing import Any, Dict
from langgraph.runtime import Runtime
from ..utils.state import AgentState


class Context:
    """Context parameters for the agent."""
    pass


def validate_frontend_input(state: AgentState) -> None:
    """Validate input parameters from the frontend API call.
    
    Raises:
        ValueError: If required fields are missing or invalid.
    """
    # Validate source_type
    source_type = state.get("source_type")
    if not source_type:
        raise ValueError("source_type is required")
    if source_type not in ["ocr", "asr"]:
        raise ValueError(f"source_type must be 'ocr' or 'asr', got '{source_type}'")

    # Validate source_file_urls
    source_file_urls = state.get("source_file_urls")
    if not source_file_urls:
        raise ValueError("source_file_urls is required and cannot be empty")
    if not isinstance(source_file_urls, list):
        raise ValueError("source_file_urls must be a list")
    if not all(isinstance(url, str) and url.strip() for url in source_file_urls):
        raise ValueError("All source_file_urls must be non-empty strings")

    # Validate client_list (optional but if provided, must be valid)
    client_list = state.get("client_list")
    if client_list is not None:
        if not isinstance(client_list, list):
            raise ValueError("client_list must be a list")
        for i, client in enumerate(client_list):
            if not isinstance(client, dict):
                raise ValueError(f"client_list[{i}] must be a dictionary")
            if "client_name" not in client:
                raise ValueError(f"client_list[{i}] must have a 'client_name' field")


def format_client_list_for_prompt(client_list: list) -> str:
    """Format client list for inclusion in prompts.

    Args:
        client_list: List of client dictionaries

    Returns:
        Formatted string representation of client list
    """
    if not client_list:
        return "No existing clients"

    formatted_clients = []
    for client in client_list:
        client_id = client.get("id", "N/A")
        client_name = client.get("client_name", "N/A")
        formatted_clients.append(f"- ID: {client_id}, Name: {client_name}")

    return "\n".join(formatted_clients)


async def initialize_agent_state(
    state: AgentState, runtime: Runtime[Context]
) -> Dict[str, Any]:
    """Initialize the agent state with frontend-provided context.

    Entry point that validates input parameters and sets up
    the workflow for either OCR or ASR processing.
    
    Args:
        state: Current agent state with frontend-provided inputs
        runtime: LangGraph runtime context
        
    Returns:
        Updated state with initialized workflow fields
        
    Raises:
        ValueError: If required input parameters are missing or invalid
    """
    # Validate input parameters from frontend
    validate_frontend_input(state)
    
    # Initialize workflow-specific fields based on state structure
    # These fields will be populated by subsequent nodes in the workflow
    
    # Generate current datetime in GMT+8 timezone for ASR time conversion
    gmt8_timezone = timezone(timedelta(hours=8))
    current_datetime = datetime.now(gmt8_timezone).isoformat()
    
    # Pre-format client list for prompt optimization (format once, use many times)
    client_list = state.get("client_list", [])
    if client_list is None:
        client_list = []
    client_list_formatted = format_client_list_for_prompt(client_list)
    
    initialized_fields = {
        "current_datetime": current_datetime,  # Required for ASR time conversion
        "client_list": client_list,  # Raw data for potential logic operations
        "client_list_formatted": client_list_formatted,  # Pre-formatted for prompts
        "raw_text": "",  # Will be populated by extract_text_from_docs or transcribe_audio
        "extracted_events": [],  # Will be populated by specialist extractor nodes
        "proposed_tasks": [],  # Will be populated by aggregate_and_format

        # OCR path specific fields (only used for document processing)
        "identified_parties": None,  # Will be populated by resolve_parties
        "document_type": None,  # Will be populated by classify_document_type  
        "validation_passed": None,  # Will be set by specialist extractor nodes
    }
    
    return initialized_fields