"""Agent state definition for the LawTime agentic workflow.

This module defines the state structure that flows through the LangGraph workflow,
handling both OCR (document processing) and ASR (voice note processing) paths.
"""

from typing import List, Optional, TypedDict


class AgentState(TypedDict):
    """State structure for the LawTime agent workflow.
    
    This state maintains all data throughout the graph execution,
    supporting both OCR and ASR processing paths with shared
    initialization and final formatting nodes.
    """
    
    # Core Inputs
    source_type: str  # 'ocr' or 'asr' - determines workflow path
    source_file_urls: List[str]  # File URLs for processing (images/audio)
    client_list: List[dict]  # Client context provided by frontend
    
    # Processed Data (populated during workflow)
    raw_text: str  # Extracted text from OCR or ASR processing
    
    # OCR Path Specific Data (only populated for document processing)
    identified_parties: Optional[List[dict]]  # Parties identified in documents
    document_type: Optional[str]  # Classification: CONTRACT, COURT_HEARING, etc.
    validation_passed: Optional[bool]  # Quality gate for specialist extraction
    
    # Final Output (terminal state for both paths)
    extracted_events: List[dict]  # Raw extracted events from specialist nodes
    proposed_tasks: List[dict]  # Final formatted tasks for frontend consumption