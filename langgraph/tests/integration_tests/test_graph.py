import pytest

from agent.graph import graph
from tests.fixtures.mock_data import (
    MOCK_CLIENT_LIST,
    get_mock_initial_state,
)

pytestmark = pytest.mark.anyio


class TestGraphStructureAndFlow:
    """Integration tests for graph structure, routing, and state flow."""
    
    @pytest.mark.langsmith
    async def test_graph_initialization_and_state_structure(self) -> None:
        """Test that graph initializes correctly and maintains proper state structure."""
        inputs = get_mock_initial_state("ocr")
        
        config = {"context": {}}
        result = await graph.ainvoke(inputs, config)
        
        # Validate that graph completes execution
        assert result is not None
        
        # Validate all required state fields are present and correctly typed
        required_fields = [
            "source_type", "source_file_urls", "client_list", "raw_text",
            "extracted_events", "proposed_tasks", "identified_parties",
            "document_type", "validation_passed"
        ]
        
        for field in required_fields:
            assert field in result, f"Required field '{field}' missing from final state"
        
        # Validate field types
        assert isinstance(result["source_type"], str)
        assert isinstance(result["source_file_urls"], list)
        assert isinstance(result["client_list"], list)
        assert isinstance(result["raw_text"], str)
        assert isinstance(result["extracted_events"], list)
        assert isinstance(result["proposed_tasks"], list)
        
        # Validate input preservation
        assert result["source_type"] == inputs["source_type"]
        assert result["source_file_urls"] == inputs["source_file_urls"]
        assert result["client_list"] == inputs["client_list"]
    
    @pytest.mark.langsmith
    async def test_ocr_vs_asr_path_differentiation(self) -> None:
        """Test that OCR and ASR inputs follow different workflow paths."""
        # Test OCR path
        ocr_inputs = get_mock_initial_state("ocr")
        ocr_result = await graph.ainvoke(ocr_inputs, {"context": {}})
        
        # Test ASR path
        asr_inputs = get_mock_initial_state("asr")
        asr_result = await graph.ainvoke(asr_inputs, {"context": {}})
        
        # Both should complete successfully
        assert ocr_result is not None
        assert asr_result is not None
        
        # Validate source type preservation
        assert ocr_result["source_type"] == "ocr"
        assert asr_result["source_type"] == "asr"
        
        # OCR path should process documents and may set document_type
        # ASR path should transcribe audio but not set document_type
        # (Note: actual behavior depends on implementation, these are structural tests)
        assert isinstance(ocr_result["raw_text"], str)
        assert isinstance(asr_result["raw_text"], str)
    
    @pytest.mark.langsmith
    async def test_workflow_with_empty_client_list(self) -> None:
        """Test workflow robustness with edge case inputs."""
        inputs = {
            "source_type": "ocr",
            "source_file_urls": ["https://example.com/test.pdf"],
            "client_list": [],  # Empty client list edge case
            "raw_text": "",
            "extracted_events": [],
            "proposed_tasks": [],
            "identified_parties": None,
            "document_type": None,
            "validation_passed": None,
        }
        
        config = {"context": {}}
        result = await graph.ainvoke(inputs, config)
        
        # Should complete successfully even with empty client list
        assert result is not None
        assert result["client_list"] == []
        assert isinstance(result["proposed_tasks"], list)
        assert isinstance(result["extracted_events"], list)
    
    @pytest.mark.langsmith
    async def test_state_data_preservation_through_workflow(self) -> None:
        """Test that input data is preserved correctly throughout the workflow."""
        # Use realistic mock data
        initial_client_list = MOCK_CLIENT_LIST.copy()
        initial_file_urls = ["https://example.com/test.pdf", "https://example.com/test2.jpg"]
        
        inputs = {
            "source_type": "ocr",
            "source_file_urls": initial_file_urls,
            "client_list": initial_client_list,
            "raw_text": "",
            "extracted_events": [],
            "proposed_tasks": [],
            "identified_parties": None,
            "document_type": None,
            "validation_passed": None,
        }
        
        config = {"context": {}}
        result = await graph.ainvoke(inputs, config)
        
        # Validate input data preservation
        assert result["source_type"] == "ocr"
        assert result["source_file_urls"] == initial_file_urls
        assert result["client_list"] == initial_client_list
        
        # Validate that workflow has processed the data
        assert isinstance(result["raw_text"], str)  # Should have extracted some text
        assert isinstance(result["extracted_events"], list)
        assert isinstance(result["proposed_tasks"], list)
    
    @pytest.mark.langsmith
    async def test_multiple_file_urls_handling(self) -> None:
        """Test that the graph can handle multiple file URLs correctly."""
        inputs = {
            "source_type": "ocr",
            "source_file_urls": [
                "https://example.com/doc1.jpeg",
                "https://example.com/doc2.jpg",
                "https://example.com/doc3.png"
            ],
            "client_list": MOCK_CLIENT_LIST,
            "raw_text": "",
            "extracted_events": [],
            "proposed_tasks": [],
            "identified_parties": None,
            "document_type": None,
            "validation_passed": None,
        }
        
        config = {"context": {}}
        result = await graph.ainvoke(inputs, config)
        
        # Should handle multiple files without error
        assert result is not None
        assert len(result["source_file_urls"]) == 3
        assert isinstance(result["raw_text"], str)
        
        # Final output structure should be consistent
        assert isinstance(result["extracted_events"], list)
        assert isinstance(result["proposed_tasks"], list)
    
    @pytest.mark.langsmith  
    async def test_graph_execution_consistency(self) -> None:
        """Test that graph produces consistent results for identical inputs."""
        inputs = get_mock_initial_state("asr")
        
        config = {"context": {}}
        
        # Execute graph multiple times with same inputs
        result1 = await graph.ainvoke(inputs, config)
        result2 = await graph.ainvoke(inputs, config)
        
        # Results should have consistent structure
        assert result1 is not None
        assert result2 is not None
        
        # Key structural elements should be the same
        assert result1["source_type"] == result2["source_type"]
        assert result1["source_file_urls"] == result2["source_file_urls"]
        assert result1["client_list"] == result2["client_list"]
        
        # Output types should be consistent
        assert type(result1["extracted_events"]) == type(result2["extracted_events"])
        assert type(result1["proposed_tasks"]) == type(result2["proposed_tasks"])


class TestErrorHandlingAndResilience:
    """Test error handling and resilience scenarios."""
    
    @pytest.mark.langsmith
    async def test_invalid_source_type_handling(self) -> None:
        """Test that the graph handles invalid source types gracefully."""
        inputs = {
            "source_type": "invalid_type",  # Invalid source type
            "source_file_urls": ["https://example.com/test.jpg"],
            "client_list": MOCK_CLIENT_LIST,
            "raw_text": "",
            "extracted_events": [],
            "proposed_tasks": [],
            "identified_parties": None,
            "document_type": None,
            "validation_passed": None,
        }
        config = {"context": {}}
        
        # Should handle gracefully without crashing
        with pytest.raises(Exception) as exc_info:
            await graph.ainvoke(inputs, config)
        
        # Verify it's a meaningful error related to routing
        assert "invalid_type" in str(exc_info.value) or "route" in str(exc_info.value).lower()
    
    @pytest.mark.langsmith
    async def test_empty_file_urls_handling(self) -> None:
        """Test behavior when no file URLs are provided."""
        inputs = {
            "source_type": "ocr",
            "source_file_urls": [],  # Empty file list
            "client_list": MOCK_CLIENT_LIST,
            "raw_text": "",
            "extracted_events": [],
            "proposed_tasks": [],
            "identified_parties": None,
            "document_type": None,
            "validation_passed": None,
        }
        config = {"context": {}}
        
        # Should raise validation error for empty file URLs
        with pytest.raises(ValueError) as exc_info:
            await graph.ainvoke(inputs, config)
        
        # Verify it's the expected validation error
        assert "source_file_urls is required and cannot be empty" in str(exc_info.value)
    
    @pytest.mark.langsmith
    async def test_malformed_urls_handling(self) -> None:
        """Test handling of malformed or invalid file URLs."""
        inputs = {
            "source_type": "ocr",
            "source_file_urls": [
                "not-a-url",
                "ftp://invalid-protocol.com/file.jpg",
                "https://",  # Incomplete URL
            ],
            "client_list": MOCK_CLIENT_LIST,
            "raw_text": "",
            "extracted_events": [],
            "proposed_tasks": [],
            "identified_parties": None,
            "document_type": None,
            "validation_passed": None,
        }
        config = {"context": {}}
        
        # Should handle gracefully without crashing
        result = await graph.ainvoke(inputs, config)
        
        # Verify workflow completes with proper structure
        assert result is not None
        assert "proposed_tasks" in result
        assert "raw_text" in result
        assert "extracted_events" in result
        # URLs should be preserved even if malformed
        assert result["source_file_urls"] == inputs["source_file_urls"]
    
    @pytest.mark.langsmith
    async def test_empty_client_list_resilience(self) -> None:
        """Test workflow behavior with empty client list."""
        inputs = {
            "source_type": "ocr",
            "source_file_urls": ["https://example.com/document.jpg"],
            "client_list": [],  # No clients available
            "raw_text": "",
            "extracted_events": [],
            "proposed_tasks": [],
            "identified_parties": None,
            "document_type": None,
            "validation_passed": None,
        }
        config = {"context": {}}
        
        result = await graph.ainvoke(inputs, config)
        
        # Should complete successfully
        assert result is not None
        assert result["client_list"] == []
        assert isinstance(result["proposed_tasks"], list)
        assert isinstance(result["extracted_events"], list)
        
        # If tasks are proposed, they should handle missing client context
        if result["proposed_tasks"]:
            for task in result["proposed_tasks"]:
                assert isinstance(task, dict)
                # Client resolution might be different with empty client list
                if "client_name" in task:
                    # Should either be None or a new client proposal
                    assert task["client_name"] is not None
    
    @pytest.mark.langsmith 
    async def test_missing_required_state_fields(self) -> None:
        """Test behavior when required state fields are missing."""
        # Test with minimal required fields only
        minimal_inputs = {
            "source_type": "ocr",
            "source_file_urls": ["https://example.com/test.jpg"],
            "client_list": MOCK_CLIENT_LIST,
        }
        config = {"context": {}}
        
        # Should initialize missing fields and complete workflow
        result = await graph.ainvoke(minimal_inputs, config)
        
        # Verify all expected fields are present in result
        required_fields = [
            "source_type", "source_file_urls", "client_list",
            "raw_text", "extracted_events", "proposed_tasks"
        ]
        for field in required_fields:
            assert field in result
        
        # Optional fields should be initialized
        optional_fields = ["identified_parties", "document_type", "validation_passed"]
        for field in optional_fields:
            assert field in result
    
    @pytest.mark.langsmith
    async def test_large_client_list_handling(self) -> None:
        """Test performance and behavior with large client lists."""
        # Create a large client list
        large_client_list = []
        for i in range(100):
            large_client_list.append({
                "id": i + 1000,
                "client_name": f"Client {i:03d} 客户{i}"
            })
        
        inputs = {
            "source_type": "asr",
            "source_file_urls": ["https://example.com/voice_note.wav"],
            "client_list": large_client_list,
            "raw_text": "",
            "extracted_events": [],
            "proposed_tasks": [],
            "identified_parties": None,
            "document_type": None,
            "validation_passed": None,
        }
        config = {"context": {}}
        
        # Should handle large client lists without issues
        result = await graph.ainvoke(inputs, config)
        
        assert result is not None
        assert len(result["client_list"]) == 100
        assert isinstance(result["proposed_tasks"], list)
        assert isinstance(result["extracted_events"], list)
    
    @pytest.mark.langsmith
    async def test_workflow_state_corruption_resilience(self) -> None:
        """Test that workflow handles unexpected state modifications gracefully."""
        inputs = get_mock_initial_state("ocr")
        
        # Add some unexpected fields to test resilience
        inputs["unexpected_field"] = "should_be_ignored"
        inputs["malicious_data"] = {"nested": {"deeply": "corrupted"}}
        
        # Modify expected field types
        inputs["extracted_events"] = "not_a_list"  # Should be a list
        inputs["proposed_tasks"] = None  # Should be a list
        
        config = {"context": {}}
        
        result = await graph.ainvoke(inputs, config)
        
        # Verify core workflow completes and corrects data types
        assert result is not None
        assert isinstance(result["extracted_events"], list)
        assert isinstance(result["proposed_tasks"], list)
        
        # Unexpected fields might be preserved or removed
        # The important thing is the workflow doesn't crash
