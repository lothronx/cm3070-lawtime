"""Unit tests for route_by_document_type routing function."""

import pytest
from tests.fixtures.mock_data import get_mock_initial_state
from agent.routing.route_by_document_type import route_by_document_type


class TestRouteByDocumentType:
    """Test cases for route_by_document_type routing function."""

    def test_route_contract_type(self):
        """Test routing to contract renewal extractor."""
        state = get_mock_initial_state("ocr")
        state["document_type"] = "CONTRACT"
        
        result = route_by_document_type(state)
        
        assert result == "extract_contract_renewal"

    def test_route_asset_preservation_type(self):
        """Test routing to asset preservation extractor."""
        state = get_mock_initial_state("ocr")
        state["document_type"] = "ASSET_PRESERVATION"
        
        result = route_by_document_type(state)
        
        assert result == "extract_asset_preservation"

    def test_route_court_hearing_type(self):
        """Test routing to hearing details extractor."""
        state = get_mock_initial_state("ocr")
        state["document_type"] = "COURT_HEARING"
        
        result = route_by_document_type(state)
        
        assert result == "extract_hearing_details"

    def test_route_hearing_transcript_type(self):
        """Test routing to post hearing tasks extractor."""
        state = get_mock_initial_state("ocr")
        state["document_type"] = "HEARING_TRANSCRIPT"
        
        result = route_by_document_type(state)
        
        assert result == "extract_post_hearing_tasks"

    def test_route_general_type(self):
        """Test routing to general task extractor for GENERAL type."""
        state = get_mock_initial_state("ocr")
        state["document_type"] = "GENERAL"
        
        result = route_by_document_type(state)
        
        assert result == "extract_general_task"

    def test_route_unknown_type_defaults_to_general(self):
        """Test that unknown document types default to general extractor."""
        state = get_mock_initial_state("ocr")
        state["document_type"] = "UNKNOWN_TYPE"
        
        result = route_by_document_type(state)
        
        assert result == "extract_general_task"

    def test_route_none_type_defaults_to_general(self):
        """Test that None document type defaults to general extractor."""
        state = get_mock_initial_state("ocr")
        state["document_type"] = None
        
        result = route_by_document_type(state)
        
        assert result == "extract_general_task"

    def test_route_empty_string_defaults_to_general(self):
        """Test that empty string document type defaults to general extractor."""
        state = get_mock_initial_state("ocr")
        state["document_type"] = ""
        
        result = route_by_document_type(state)
        
        assert result == "extract_general_task"