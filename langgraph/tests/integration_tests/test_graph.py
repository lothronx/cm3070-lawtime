import pytest

from agent.graph import graph

pytestmark = pytest.mark.anyio


@pytest.mark.langsmith
async def test_agent_ocr_path() -> None:
    """Test the OCR path with CONTRACT document type."""
    inputs = {
        "source_type": "ocr",
        "source_file_urls": ["https://example.com/contract.pdf"],
        "client_list": [{"name": "Test Client", "id": 1}],
        "raw_text": "",
        "extracted_events": [],
        "proposed_tasks": [],
        "identified_parties": None,
        "document_type": None,
        "validation_passed": None,
    }
    config = {"context": {}}
    res = await graph.ainvoke(inputs, config)

    assert res is not None
    assert "proposed_tasks" in res
    assert len(res["proposed_tasks"]) > 0
    # Should have contract renewal task from placeholder
    assert res["proposed_tasks"][0]["title"] == "Contract Renewal Due"


@pytest.mark.langsmith
async def test_agent_asr_path() -> None:
    """Test the ASR path for voice notes."""
    inputs = {
        "source_type": "asr",
        "source_file_urls": ["https://example.com/voice_note.wav"],
        "client_list": [{"name": "Test Client", "id": 1}],
        "raw_text": "",
        "extracted_events": [],
        "proposed_tasks": [],
        "identified_parties": None,
        "document_type": None,
        "validation_passed": None,
    }
    config = {"context": {}}
    res = await graph.ainvoke(inputs, config)

    assert res is not None
    assert "proposed_tasks" in res
    assert len(res["proposed_tasks"]) > 0
    # Should have meeting task from placeholder
    assert res["proposed_tasks"][0]["title"] == "Meeting with Client"


@pytest.mark.langsmith
async def test_graph_workflow_validation() -> None:
    """Test that the graph follows the correct workflow paths and validation logic."""
    # This test validates the structure works without testing implementation details
    inputs = {
        "source_type": "ocr",
        "source_file_urls": ["https://example.com/document.pdf"],
        "client_list": [{"name": "Test Client", "id": 1}],
        "raw_text": "",
        "extracted_events": [],
        "proposed_tasks": [],
        "identified_parties": None,
        "document_type": None,
        "validation_passed": None,
    }
    config = {"context": {}}
    res = await graph.ainvoke(inputs, config)

    # Validate final state structure
    assert res is not None
    assert "proposed_tasks" in res
    assert "raw_text" in res
    assert "extracted_events" in res

    # Validate data transformation
    assert isinstance(res["proposed_tasks"], list)
    assert isinstance(res["extracted_events"], list)

    # Validate that workflow completed successfully
    if res["proposed_tasks"]:
        task = res["proposed_tasks"][0]
        required_fields = ["title", "client_name", "event_time", "location", "notes"]
        for field in required_fields:
            assert field in task
