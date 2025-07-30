"""Unit tests for aggregate_and_format node."""

import pytest
from unittest.mock import Mock

from agent.nodes.aggregate_and_format import aggregate_and_format
from agent.utils.state import AgentState
from tests.fixtures.mock_data import (
    MockExtractedEvents, 
    MockExtractedParties,
    get_mock_initial_state
)


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


class TestAggregateAndFormat:
    """Test cases for aggregate_and_format node."""
    
    @pytest.mark.asyncio
    async def test_format_court_hearing_with_matched_client(self, mock_runtime):
        """Test formatting court hearing event with matched client."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = MockExtractedEvents.COURT_HEARING
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        
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
        
        # Verify client resolution
        assert task["client_resolution"]["status"] == "MATCH_FOUND"
        assert task["client_resolution"]["client_id"] == 102
        assert task["client_resolution"]["client_name"] == "阿里巴巴（中国）有限公司"
    
    @pytest.mark.asyncio
    async def test_format_contract_renewal_with_matched_client(self, mock_runtime):
        """Test formatting contract renewal event."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = MockExtractedEvents.CONTRACT_RENEWAL
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        assert len(result["proposed_tasks"]) == 1
        
        task = result["proposed_tasks"][0]
        assert task["title"] == "法律顾问合同到期"
        assert task["event_time"] == "2027年5月31日"
        assert task["location"] is None  # raw_location is None in mock data
        assert "北京朝阳律师事务所" in task["note"]
    
    @pytest.mark.asyncio
    async def test_format_asset_preservation_multiple_events(self, mock_runtime):
        """Test formatting multiple asset preservation events."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = MockExtractedEvents.ASSET_PRESERVATION
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        assert len(result["proposed_tasks"]) == 2
        
        # Check first task (property preservation)
        task1 = result["proposed_tasks"][0]
        assert "不动产查封冻结到期" in task1["title"]
        assert task1["event_time"] == "2028年7月7日"
        
        # Check second task (bank account preservation)
        task2 = result["proposed_tasks"][1]
        assert "网络账户及银行存款" in task2["title"]
        assert task2["event_time"] == "2026年7月7日"
    
    @pytest.mark.asyncio
    async def test_format_voice_note_tasks(self, mock_runtime):
        """Test formatting tasks from voice notes."""
        # Arrange
        state = get_mock_initial_state("asr")
        state["extracted_events"] = MockExtractedEvents.VOICE_NOTE_TASKS
        # ASR path doesn't have identified_parties, so client resolution will default
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        assert len(result["proposed_tasks"]) == 2
        
        # Check first task
        task1 = result["proposed_tasks"][0]
        assert task1["title"] == "跟进阿里巴巴案子"
        assert task1["event_time"] == "明天上午"
        assert task1["client_resolution"]["status"] == "OTHER_PARTY"
        
        # Check second task
        task2 = result["proposed_tasks"][1]
        assert task2["title"] == "与张三开会"
        assert task2["location"] == "星巴克"
    
    @pytest.mark.asyncio
    async def test_format_with_new_client_proposed(self, mock_runtime):
        """Test formatting with new client proposed resolution."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = MockExtractedEvents.COURT_HEARING
        state["identified_parties"] = MockExtractedParties.NEW_CLIENT_PROPOSED
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        task = result["proposed_tasks"][0]
        assert task["client_resolution"]["status"] == "NEW_CLIENT_PROPOSED"
        assert task["client_resolution"]["client_id"] is None
        assert task["client_resolution"]["client_name"] == "Global Industries Inc"
    
    @pytest.mark.asyncio
    async def test_format_with_multiple_parties(self, mock_runtime):
        """Test formatting when multiple parties are identified."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = MockExtractedEvents.COURT_HEARING
        state["identified_parties"] = MockExtractedParties.MULTI_PARTY
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        task = result["proposed_tasks"][0]
        # Should match the specific party by name, which is 阿里巴巴
        assert task["client_resolution"]["status"] == "MATCH_FOUND"
        assert task["client_resolution"]["client_name"] == "阿里巴巴（中国）有限公司"
    
    @pytest.mark.asyncio
    async def test_format_empty_extracted_events(self, mock_runtime):
        """Test formatting when no events are extracted."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = []
        state["identified_parties"] = MockExtractedParties.ALIBABA_MATCH_FOUND
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        assert result["proposed_tasks"] == []
    
    @pytest.mark.asyncio
    async def test_format_no_identified_parties(self, mock_runtime):
        """Test formatting when no parties are identified."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = MockExtractedEvents.COURT_HEARING
        state["identified_parties"] = []
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        task = result["proposed_tasks"][0]
        assert task["client_resolution"]["status"] == "OTHER_PARTY"
        assert task["client_resolution"]["client_id"] is None
        assert task["client_name"] == "Unknown Client"
    
    @pytest.mark.asyncio
    async def test_format_handles_missing_fields(self, mock_runtime):
        """Test formatting handles events with missing fields gracefully."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["extracted_events"] = [{
            # Minimal event with some fields missing
            "event_type": "general_task"
        }]
        state["identified_parties"] = []
        
        # Act
        result = await aggregate_and_format(state, mock_runtime)
        
        # Assert
        task = result["proposed_tasks"][0]
        assert task["title"] == "Untitled Task"  # Default title
        assert task["event_time"] == "09:00"  # Default time
        assert task["location"] == ""  # Default location
        assert task["note"] == ""  # Default note