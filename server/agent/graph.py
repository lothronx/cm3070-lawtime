"""LangGraph workflow for LawTime AI agent.

Implements a classify-validate-route pattern for processing legal documents (OCR)
and voice notes (ASR) into structured calendar tasks.
"""

from __future__ import annotations

from typing import TypedDict

from langgraph.graph import StateGraph

from agent.utils.state import AgentState

# Import all nodes
from agent.nodes import (
    initialize_agent_state,
    extract_text_from_docs,
    resolve_parties,
    classify_document_type,
    transcribe_audio,
    extract_task_from_note,
    aggregate_and_format,
)

# Import specialist extractors
from agent.nodes.extractors import (
    extract_contract_renewal,
    extract_asset_preservation,
    extract_hearing_details,
    extract_post_hearing_tasks,
    extract_general_task,
)

# Import routing functions
from agent.routing import (
    route_by_source_type,
    route_by_document_type,
    check_extraction_success,
)


class Context(TypedDict):
    """Context parameters for the agent.

    Set these when creating assistants OR when invoking the graph.
    See: https://langchain-ai.github.io/langgraph/cloud/how-tos/configuration_cloud/
    """

    # Add any configuration parameters needed for the workflow
    # For now, keeping it minimal as per requirements
    pass


# Define the graph with all nodes and edges
graph = (
    StateGraph(AgentState, context_schema=Context)
    # Add all nodes
    .add_node("initialize_agent_state", initialize_agent_state)
    .add_node("extract_text_from_docs", extract_text_from_docs)
    .add_node("resolve_parties", resolve_parties)
    .add_node("classify_document_type", classify_document_type)
    .add_node("extract_contract_renewal", extract_contract_renewal)
    .add_node("extract_asset_preservation", extract_asset_preservation)
    .add_node("extract_hearing_details", extract_hearing_details)
    .add_node("extract_post_hearing_tasks", extract_post_hearing_tasks)
    .add_node("extract_general_task", extract_general_task)
    .add_node("transcribe_audio", transcribe_audio)
    .add_node("extract_task_from_note", extract_task_from_note)
    .add_node("aggregate_and_format", aggregate_and_format)
    # Entry point
    .add_edge("__start__", "initialize_agent_state")
    # Route by source type (OCR vs ASR)
    .add_conditional_edges(
        "initialize_agent_state",
        route_by_source_type,
        {
            "extract_text_from_docs": "extract_text_from_docs",  # OCR path
            "transcribe_audio": "transcribe_audio",  # ASR path
        },
    )
    # OCR path sequence
    .add_edge("extract_text_from_docs", "resolve_parties")
    .add_edge("resolve_parties", "classify_document_type")
    # Route by document type to specialists
    .add_conditional_edges(
        "classify_document_type",
        route_by_document_type,
        {
            "extract_contract_renewal": "extract_contract_renewal",
            "extract_asset_preservation": "extract_asset_preservation",
            "extract_hearing_details": "extract_hearing_details",
            "extract_post_hearing_tasks": "extract_post_hearing_tasks",
            "extract_general_task": "extract_general_task",
        },
    )
    # Validation check with self-correcting loop
    .add_conditional_edges(
        "extract_contract_renewal",
        check_extraction_success,
        {
            "aggregate_and_format": "aggregate_and_format",
            "extract_general_task": "extract_general_task",
        },
    )
    .add_conditional_edges(
        "extract_asset_preservation",
        check_extraction_success,
        {
            "aggregate_and_format": "aggregate_and_format",
            "extract_general_task": "extract_general_task",
        },
    )
    .add_conditional_edges(
        "extract_hearing_details",
        check_extraction_success,
        {
            "aggregate_and_format": "aggregate_and_format",
            "extract_general_task": "extract_general_task",
        },
    )
    .add_conditional_edges(
        "extract_post_hearing_tasks",
        check_extraction_success,
        {
            "aggregate_and_format": "aggregate_and_format",
            "extract_general_task": "extract_general_task",
        },
    )
    # General task always proceeds to final formatting
    .add_edge("extract_general_task", "aggregate_and_format")
    # ASR path sequence
    .add_edge("transcribe_audio", "extract_task_from_note")
    .add_edge("extract_task_from_note", "aggregate_and_format")
    # Compile the graph
    .compile(name="LawTime Agent")
)
