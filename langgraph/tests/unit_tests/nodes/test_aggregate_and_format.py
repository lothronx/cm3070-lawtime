"""Unit tests for aggregate_and_format node."""

import pytest
from unittest.mock import Mock

from agent.nodes.aggregate_and_format import (
    aggregate_and_format,
    _resolve_client_relationship,
    _standardize_extracted_event
)
from tests.fixtures.mock_data import (
    MockExtractedEvents, 
    get_mock_initial_state,
    MOCK_CLIENT_LIST
)


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


class TestResolveClientRelationship:
    """Test cases for _resolve_client_relationship function."""
    
    def test_exact_match_found(self):
        """Test exact client name match."""
        result = _resolve_client_relationship("阿里巴巴（中国）有限公司", MOCK_CLIENT_LIST)
        
        assert result["status"] == "MATCH_FOUND"
        assert result["client_id"] == 102
        assert result["client_name"] == "阿里巴巴（中国）有限公司"
    
    def test_partial_match_found(self):
        """Test partial client name match."""
        result = _resolve_client_relationship("ACME", MOCK_CLIENT_LIST)
        
        assert result["status"] == "MATCH_FOUND"
        assert result["client_id"] == 101
        assert result["client_name"] == "ACME Corporation"
    
    def test_new_client_proposed(self):
        """Test new client proposal for unknown name."""
        result = _resolve_client_relationship("Global Industries Inc", MOCK_CLIENT_LIST)
        
        assert result["status"] == "NEW_CLIENT_PROPOSED"
        assert result["client_id"] is None
        assert result["client_name"] == "Global Industries Inc"
    
    def test_no_client_identified_empty_name(self):
        """Test no client identified for empty/None name."""
        result = _resolve_client_relationship("", MOCK_CLIENT_LIST)
        
        assert result["status"] == "NO_CLIENT_IDENTIFIED"
        assert result["client_id"] is None
        assert result["client_name"] is None
    
    def test_no_client_identified_none_name(self):
        """Test no client identified for None name."""
        result = _resolve_client_relationship(None, MOCK_CLIENT_LIST)
        
        assert result["status"] == "NO_CLIENT_IDENTIFIED"
        assert result["client_id"] is None
        assert result["client_name"] is None
    
    def test_no_client_identified_whitespace_name(self):
        """Test no client identified for whitespace-only name."""
        result = _resolve_client_relationship("   ", MOCK_CLIENT_LIST)
        
        assert result["status"] == "NO_CLIENT_IDENTIFIED"
        assert result["client_id"] is None
        assert result["client_name"] is None
    
    def test_empty_client_list(self):
        """Test behavior with empty client list."""
        result = _resolve_client_relationship("Some Client", [])
        
        assert result["status"] == "NEW_CLIENT_PROPOSED"
        assert result["client_id"] is None
        assert result["client_name"] == "Some Client"


class TestStandardizeExtractedEvent:
    """Test cases for _standardize_extracted_event function."""
    
    def test_standardize_complete_event(self):
        """Test standardizing event with all fields present."""
        event = {
            "raw_title": "开庭",
            "raw_date_time": "2025-08-26T13:40:00+08:00",
            "raw_location": "威海市文登区人民法院开发区第一审判庭",
            "note": "(2025)鲁1003民初0001号建设工程施工合同纠纷",
            "related_party_name": "阿里巴巴（中国）有限公司"
        }
        
        result = _standardize_extracted_event(event, MOCK_CLIENT_LIST)
        
        assert result["title"] == "开庭"
        assert result["event_time"] == "2025-08-26T13:40:00+08:00"
        assert result["location"] == "威海市文登区人民法院开发区第一审判庭"
        assert result["note"] == "(2025)鲁1003民初0001号建设工程施工合同纠纷"
        assert result["client_resolution"]["status"] == "MATCH_FOUND"
        assert result["client_resolution"]["client_id"] == 102
    
    def test_standardize_minimal_event(self):
        """Test standardizing event with minimal fields."""
        event = {"event_type": "general_task"}
        
        result = _standardize_extracted_event(event, MOCK_CLIENT_LIST)
        
        assert result["title"] == "Untitled Task"
        assert result["event_time"] is None
        assert result["location"] is None
        assert result["note"] == ""
        assert result["client_resolution"]["status"] == "NO_CLIENT_IDENTIFIED"
    
    def test_standardize_with_new_client(self):
        """Test standardizing event with unknown client."""
        event = {
            "raw_title": "Meeting",
            "related_party_name": "New Client Corp"
        }
        
        result = _standardize_extracted_event(event, MOCK_CLIENT_LIST)
        
        assert result["title"] == "Meeting"
        assert result["client_resolution"]["status"] == "NEW_CLIENT_PROPOSED"
        assert result["client_resolution"]["client_name"] == "New Client Corp"


class TestAggregateAndFormat:
    """Test cases for aggregate_and_format node."""
    
    @pytest.mark.asyncio
    async def test_format_court_hearing_with_matched_client(self, mock_runtime):
        """Test formatting court hearing event with matched client."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = MockExtractedEvents.COURT_HEARING
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        assert "proposed_tasks" in result
        assert len(result["proposed_tasks"]) == 1
        
        task = result["proposed_tasks"][0]
        assert task["title"] == "开庭"
        assert task["event_time"] == "2025年08月26日 13:40"
        assert task["location"] == "威海市文登区人民法院开发区第一审判庭"
        assert task["note"] == "(2025)鲁1003民初0001号建设工程施工合同纠纷"
        
        # Verify client resolution based on related_party_name in event
        assert task["client_resolution"]["status"] == "MATCH_FOUND"
        assert task["client_resolution"]["client_id"] == 102
        assert task["client_resolution"]["client_name"] == "阿里巴巴（中国）有限公司"
    
    @pytest.mark.asyncio
    async def test_format_contract_renewal_with_matched_client(self, mock_runtime):
        """Test formatting contract renewal event."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = MockExtractedEvents.CONTRACT_RENEWAL
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        assert len(result["proposed_tasks"]) == 1
        
        task = result["proposed_tasks"][0]
        assert task["title"] == "法律顾问合同到期"
        assert task["event_time"] == "2027年5月31日"
        assert task["location"] is None  # raw_location is None in mock data
        assert "北京朝阳律师事务所" in task["note"]
        assert task["client_resolution"]["status"] == "MATCH_FOUND"
    
    @pytest.mark.asyncio
    async def test_format_asset_preservation_multiple_events(self, mock_runtime):
        """Test formatting multiple asset preservation events."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = MockExtractedEvents.ASSET_PRESERVATION
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        assert len(result["proposed_tasks"]) == 2
        
        # Check first task (property preservation)
        task1 = result["proposed_tasks"][0]
        assert "不动产查封冻结到期" in task1["title"]
        assert task1["event_time"] == "2028年7月7日"
        assert task1["client_resolution"]["status"] == "MATCH_FOUND"
        
        # Check second task (bank account preservation)
        task2 = result["proposed_tasks"][1]
        assert "网络账户及银行存款" in task2["title"]
        assert task2["event_time"] == "2026年7月7日"
        assert task2["client_resolution"]["status"] == "MATCH_FOUND"
    
    @pytest.mark.asyncio
    async def test_format_voice_note_tasks(self, mock_runtime):
        """Test formatting tasks from voice notes."""
        # Arrange
        state = get_mock_initial_state("asr")
        state["extracted_events"] = MockExtractedEvents.VOICE_NOTE_TASKS
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        assert len(result["proposed_tasks"]) == 2
        
        # Check first task - should match Alibaba client
        task1 = result["proposed_tasks"][0]
        assert task1["title"] == "跟进阿里巴巴案子"
        assert task1["event_time"] == "明天上午"
        assert task1["client_resolution"]["status"] == "MATCH_FOUND"
        assert task1["client_resolution"]["client_id"] == 102
        
        # Check second task - Zhang San is not in client list, so NEW_CLIENT_PROPOSED
        task2 = result["proposed_tasks"][1]
        assert task2["title"] == "与张三开会"
        assert task2["location"] == "星巴克"
        assert task2["client_resolution"]["status"] == "NEW_CLIENT_PROPOSED"
        assert task2["client_resolution"]["client_name"] == "张三"
    
    @pytest.mark.asyncio
    async def test_format_with_new_client_proposed(self, mock_runtime):
        """Test formatting with new client proposed resolution."""
        # Arrange - create event with unknown client name
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = [{
            "event_type": "court_hearing",
            "raw_title": "Court Hearing",
            "raw_date_time": "2025-09-05T09:00:00+08:00",
            "raw_location": "Chaoyang Court Room 5",
            "related_party_name": "Global Industries Inc",
            "note": "Case number: (2025)J0105S0001"
        }]
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        task = result["proposed_tasks"][0]
        assert task["client_resolution"]["status"] == "NEW_CLIENT_PROPOSED"
        assert task["client_resolution"]["client_id"] is None
        assert task["client_resolution"]["client_name"] == "Global Industries Inc"
    
    @pytest.mark.asyncio
    async def test_format_with_multiple_parties(self, mock_runtime):
        """Test formatting when document contains multiple party names."""
        # Arrange - The event already contains the related_party_name from extraction
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = MockExtractedEvents.COURT_HEARING  # Contains 阿里巴巴
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        task = result["proposed_tasks"][0]
        # Should match the Alibaba client based on related_party_name in the event
        assert task["client_resolution"]["status"] == "MATCH_FOUND"
        assert task["client_resolution"]["client_name"] == "阿里巴巴（中国）有限公司"
    
    @pytest.mark.asyncio
    async def test_format_empty_extracted_events(self, mock_runtime):
        """Test formatting when no events are extracted."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = []
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        assert result["proposed_tasks"] == []
    
    @pytest.mark.asyncio
    async def test_format_no_client_identified(self, mock_runtime):
        """Test formatting when no client is identified in the event."""
        # Arrange - event without related_party_name
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = [{
            "event_type": "general_task",
            "raw_title": "Generic Task",
            "raw_date_time": "2025-09-01T10:00:00+08:00",
            "note": "Some task without client info"
            # No related_party_name field
        }]
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        task = result["proposed_tasks"][0]
        assert task["client_resolution"]["status"] == "NO_CLIENT_IDENTIFIED"
        assert task["client_resolution"]["client_id"] is None
        assert task["client_resolution"]["client_name"] is None
    
    @pytest.mark.asyncio
    async def test_format_handles_missing_fields(self, mock_runtime):
        """Test formatting handles events with missing fields gracefully."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = [{
            # Minimal event with some fields missing
            "event_type": "general_task"
        }]
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        task = result["proposed_tasks"][0]
        assert task["title"] == "Untitled Task"  # Default title from _standardize_extracted_event
        assert task["event_time"] is None  # No default time set
        assert task["location"] is None  # No default location set
        assert task["note"] == ""  # Default empty note
        assert task["client_resolution"]["status"] == "NO_CLIENT_IDENTIFIED"
    
    @pytest.mark.asyncio
    async def test_format_invalid_event_skipped(self, mock_runtime):
        """Test that invalid events are skipped gracefully."""
        # Arrange - mix of valid and invalid events
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = [
            MockExtractedEvents.COURT_HEARING[0],  # Valid event
            None,  # Invalid event that would cause error
            {"raw_title": "Valid Task", "related_party_name": "ACME"}  # Valid event
        ]
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert - should skip the None event but process others
        assert len(result["proposed_tasks"]) == 2
        assert result["proposed_tasks"][0]["title"] == "开庭"
        assert result["proposed_tasks"][1]["title"] == "Valid Task"
    
    @pytest.mark.asyncio
    async def test_format_unexpected_error_returns_empty_tasks(self, mock_runtime):
        """Test that unexpected errors result in empty task list."""
        # Arrange - state that could cause unexpected error
        invalid_state = {"invalid_key": "invalid_value"}
        
        # Act
        result = await aggregate_and_format(invalid_state, mock_runtime)
        
        # Assert - should return empty tasks on error
        assert result["proposed_tasks"] == []
    
    @pytest.mark.asyncio
    async def test_partial_client_name_match(self, mock_runtime):
        """Test client resolution with partial name match."""
        # Arrange - event with partial client name
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = [{
            "event_type": "general_task",
            "raw_title": "ACME Task",
            "related_party_name": "ACME"  # Partial match for "ACME Corporation"
        }]
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert - should find partial match
        task = result["proposed_tasks"][0]
        assert task["client_resolution"]["status"] == "MATCH_FOUND"
        assert task["client_resolution"]["client_id"] == 101
        assert task["client_resolution"]["client_name"] == "ACME Corporation"
    
    @pytest.mark.asyncio
    async def test_multiple_events_different_clients(self, mock_runtime):
        """Test formatting multiple events with different client resolutions."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = [
            {
                "raw_title": "Alibaba Task",
                "related_party_name": "阿里巴巴（中国）有限公司"
            },
            {
                "raw_title": "New Client Task", 
                "related_party_name": "Unknown Corp"
            },
            {
                "raw_title": "No Client Task"
                # No related_party_name
            }
        ]
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        assert len(result["proposed_tasks"]) == 3
        
        # Alibaba task - exact match
        assert result["proposed_tasks"][0]["client_resolution"]["status"] == "MATCH_FOUND"
        assert result["proposed_tasks"][0]["client_resolution"]["client_id"] == 102
        
        # Unknown corp - new client proposed
        assert result["proposed_tasks"][1]["client_resolution"]["status"] == "NEW_CLIENT_PROPOSED"
        assert result["proposed_tasks"][1]["client_resolution"]["client_name"] == "Unknown Corp"
        
        # No client - no client identified
        assert result["proposed_tasks"][2]["client_resolution"]["status"] == "NO_CLIENT_IDENTIFIED"
        assert result["proposed_tasks"][2]["client_resolution"]["client_name"] is None
    
    @pytest.mark.asyncio
    async def test_format_general_tasks_from_mock_data(self, mock_runtime):
        """Test formatting general tasks using mock data."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = MockExtractedEvents.GENERAL_TASKS
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        assert len(result["proposed_tasks"]) == 2
        
        # First task - review evidence list
        task1 = result["proposed_tasks"][0]
        assert task1["title"] == "审核证据清单"
        assert task1["event_time"] is None
        assert task1["client_resolution"]["status"] == "MATCH_FOUND"
        
        # Second task - contact lawyer
        task2 = result["proposed_tasks"][1]
        assert task2["title"] == "联系李明，确认函件接收情况"
        assert task2["event_time"] == "明天下午之前"
        assert task2["client_resolution"]["status"] == "MATCH_FOUND"
    
    @pytest.mark.asyncio
    async def test_format_post_hearing_tasks(self, mock_runtime):
        """Test formatting post-hearing tasks using mock data."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = MockExtractedEvents.POST_HEARING_TASKS
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        assert len(result["proposed_tasks"]) == 1
        
        task = result["proposed_tasks"][0]
        assert task["title"] == "提交2023年度的详细财务流水"
        assert task["event_time"] == "三日内"
        assert task["note"] == "（2025）京0105民初123号阿里巴巴与腾讯公司合同纠纷"
        assert task["client_resolution"]["status"] == "MATCH_FOUND"
        assert task["client_resolution"]["client_id"] == 102
    
    @pytest.mark.asyncio
    async def test_logging_behavior(self, mock_runtime, caplog):
        """Test that appropriate logging occurs during processing."""
        import logging
        
        # Arrange
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = MockExtractedEvents.COURT_HEARING
        
        # Act
        with caplog.at_level(logging.INFO):
            result = await aggregate_and_format(state, mock_runtime)
        
        # Assert logging behavior
        assert "Starting aggregate_and_format with 1 extracted events" in caplog.text
        assert "Successfully aggregated 1 proposed tasks from 1 extracted events" in caplog.text
        
        # Verify result
        assert len(result["proposed_tasks"]) == 1