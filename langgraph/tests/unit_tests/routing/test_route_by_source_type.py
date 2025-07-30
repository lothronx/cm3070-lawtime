"""Unit tests for route_by_source_type routing function."""

import pytest
from tests.fixtures.mock_data import get_mock_initial_state
from agent.routing.route_by_source_type import route_by_source_type


class TestRouteBySourceType:
    """Test cases for route_by_source_type routing function."""

    def test_route_ocr_path(self):
        """Test routing to OCR path when source_type is 'ocr'."""
        state = get_mock_initial_state("ocr")
        
        result = route_by_source_type(state)
        
        assert result == "extract_text_from_docs"

    def test_route_asr_path(self):
        """Test routing to ASR path when source_type is 'asr'."""
        state = get_mock_initial_state("asr")
        
        result = route_by_source_type(state)
        
        assert result == "transcribe_audio"

    def test_route_unknown_defaults_to_ocr(self):
        """Test that unknown source_type defaults to OCR path."""
        state = get_mock_initial_state("ocr")
        state["source_type"] = "unknown_type"
        
        result = route_by_source_type(state)
        
        assert result == "extract_text_from_docs"

    def test_route_empty_string_defaults_to_ocr(self):
        """Test that empty source_type defaults to OCR path."""
        state = get_mock_initial_state("ocr")
        state["source_type"] = ""
        
        result = route_by_source_type(state)
        
        assert result == "extract_text_from_docs"