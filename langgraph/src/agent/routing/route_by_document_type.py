"""Route workflow to specialist extractors based on document type."""

from typing import Literal

from ..utils.state import AgentState


def route_by_document_type(
    state: AgentState,
) -> Literal[
    "extract_contract_renewal",
    "extract_asset_preservation",
    "extract_hearing_details",
    "extract_post_hearing_tasks",
    "extract_general_task",
]:
    """Direct workflow to the correct specialist node based on document type."""
    document_type = state.get("document_type")

    if document_type == "CONTRACT":
        return "extract_contract_renewal"
    elif document_type == "ASSET_PRESERVATION":
        return "extract_asset_preservation"
    elif document_type == "COURT_HEARING":
        return "extract_hearing_details"
    elif document_type == "HEARING_TRANSCRIPT":
        return "extract_post_hearing_tasks"
    else:  # GENERAL or any unrecognized type
        return "extract_general_task"