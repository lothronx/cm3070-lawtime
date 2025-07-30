"""Unit tests for check_extraction_success routing function."""

import pytest
from tests.fixtures.mock_data import get_mock_initial_state
from agent.routing.check_extraction_success import check_extraction_success


class TestCheckExtractionSuccess:
    """Test quality gate routing based on validation results."""

    def test_route_successful_validation(self):
        """Test routing when validation passed is True."""
        state = get_mock_initial_state("ocr")
        state["validation_passed"] = True
        result = check_extraction_success(state)
        assert result == "aggregate_and_format"

    def test_route_failed_validation(self):
        """Test routing when validation passed is False."""
        state = get_mock_initial_state("ocr")
        state["validation_passed"] = False
        result = check_extraction_success(state)
        assert result == "extract_general_task"

    def test_route_none_validation(self):
        """Test routing when validation passed is None defaults to fallback."""
        state = get_mock_initial_state("ocr")
        state["validation_passed"] = None
        result = check_extraction_success(state)
        assert result == "extract_general_task"

    def test_route_missing_validation_key(self):
        """Test routing when validation_passed key is missing defaults to fallback."""
        state = get_mock_initial_state("ocr")
        # Remove validation_passed key entirely
        if "validation_passed" in state:
            del state["validation_passed"]
        result = check_extraction_success(state)
        assert result == "extract_general_task"

    def test_route_truthy_validation_values(self):
        """Test routing with various truthy values for validation_passed."""
        state = get_mock_initial_state("ocr")
        
        # Test with string "true"
        state["validation_passed"] = "true"
        result = check_extraction_success(state)
        assert result == "aggregate_and_format"
        
        # Test with integer 1
        state["validation_passed"] = 1
        result = check_extraction_success(state)
        assert result == "aggregate_and_format"
        
        # Test with non-empty list
        state["validation_passed"] = ["data"]
        result = check_extraction_success(state)
        assert result == "aggregate_and_format"

    def test_route_falsy_validation_values(self):
        """Test routing with various falsy values for validation_passed."""
        state = get_mock_initial_state("ocr")
        
        # Test with empty string
        state["validation_passed"] = ""
        result = check_extraction_success(state)
        assert result == "extract_general_task"
        
        # Test with integer 0
        state["validation_passed"] = 0
        result = check_extraction_success(state)
        assert result == "extract_general_task"
        
        # Test with empty list
        state["validation_passed"] = []
        result = check_extraction_success(state)
        assert result == "extract_general_task"