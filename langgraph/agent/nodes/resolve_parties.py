"""Identify parties and their roles in legal documents."""

from typing import Any, Dict

from langgraph.runtime import Runtime

from ..utils.state import AgentState


class Context:
    """Context parameters for the agent."""
    pass


async def resolve_parties(
    state: AgentState, runtime: Runtime[Context]
) -> Dict[str, Any]:
    """Identify all relevant parties in the document and their roles."""
    # TODO: Make LLM call with raw_text and client_list
    # TODO: Identify entities and assign roles, match to 'Our Client'

    # Placeholder implementation
    identified_parties = [
        {"name": "Placeholder Client", "role": "Our Client"},
        {"name": "Placeholder Opposing Party", "role": "Opposing Party"},
    ]

    return {
        "identified_parties": identified_parties,
    }