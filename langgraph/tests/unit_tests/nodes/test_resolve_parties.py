"""Unit tests for resolve_parties node."""

import pytest
from unittest.mock import Mock, patch

from agent.nodes.resolve_parties import resolve_parties
from agent.utils.state import AgentState
from tests.fixtures.mock_data import (
    get_mock_initial_state, 
    MockDocuments, 
    MockExtractedParties,
    MOCK_CLIENT_LIST
)


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


class TestResolveParties:
    """Test cases for resolve_parties node."""
    
    @pytest.mark.asyncio
    async def test_resolve_parties_placeholder_implementation(self, mock_runtime):
        """Test the current placeholder implementation."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        
        # Act
        result = await resolve_parties(state, mock_runtime)
        
        # Assert
        assert "identified_parties" in result
        assert len(result["identified_parties"]) == 2
        
        parties = result["identified_parties"]
        assert parties[0]["name"] == "Placeholder Client"
        assert parties[0]["role"] == "Our Client"
        assert parties[1]["name"] == "Placeholder Opposing Party"
        assert parties[1]["role"] == "Opposing Party"
    
    @pytest.mark.asyncio
    async def test_resolve_parties_preserves_state_structure(self, mock_runtime):
        """Test that the node returns only the expected state updates."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.CONTRACT_CN
        
        # Act
        result = await resolve_parties(state, mock_runtime)
        
        # Assert
        # Should only return identified_parties update
        assert len(result) == 1
        assert "identified_parties" in result
        assert "document_type" not in result
        assert "extracted_events" not in result
    
    @pytest.mark.asyncio
    async def test_resolve_parties_with_empty_text(self, mock_runtime):
        """Test party resolution with empty raw text."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = ""
        
        # Act
        result = await resolve_parties(state, mock_runtime)
        
        # Assert
        assert "identified_parties" in result
        assert isinstance(result["identified_parties"], list)
    
    @pytest.mark.asyncio
    async def test_resolve_parties_with_client_list(self, mock_runtime):
        """Test party resolution includes client list context."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        state["client_list"] = MOCK_CLIENT_LIST
        
        # Act
        result = await resolve_parties(state, mock_runtime)
        
        # Assert
        assert "identified_parties" in result
        assert isinstance(result["identified_parties"], list)
        # In future implementation, this would match against client_list
    
    @pytest.mark.asyncio
    @patch('agent.nodes.resolve_parties.resolve_parties')
    async def test_resolve_parties_future_implementation_match_found(self, mock_resolve, mock_runtime):
        """Test future implementation with matched client."""
        # Arrange - Mock the future LLM implementation
        mock_resolve.return_value = {"identified_parties": MockExtractedParties.ALIBABA_MATCH_FOUND}
        
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        state["client_list"] = MOCK_CLIENT_LIST
        
        # Act
        result = await mock_resolve(state, mock_runtime)
        
        # Assert
        parties = result["identified_parties"]
        assert len(parties) == 1
        
        party = parties[0]
        assert party["name"] == "阿里巴巴（中国）有限公司"
        assert party["role"] == "被传唤人"
        assert party["client_resolution"]["status"] == "MATCH_FOUND"
        assert party["client_resolution"]["client_id"] == 102
        assert party["client_resolution"]["client_name"] == "阿里巴巴（中国）有限公司"
    
    @pytest.mark.asyncio
    @patch('agent.nodes.resolve_parties.resolve_parties')
    async def test_resolve_parties_future_implementation_new_client(self, mock_resolve, mock_runtime):
        """Test future implementation with new client proposed."""
        # Arrange - Mock the future LLM implementation
        mock_resolve.return_value = {"identified_parties": MockExtractedParties.NEW_CLIENT_PROPOSED}
        
        state = get_mock_initial_state("ocr")
        state["raw_text"] = "Court notice for Global Industries Inc vs. Other Party"
        state["client_list"] = MOCK_CLIENT_LIST
        
        # Act
        result = await mock_resolve(state, mock_runtime)
        
        # Assert
        parties = result["identified_parties"]
        assert len(parties) == 1
        
        party = parties[0]
        assert party["name"] == "Global Industries Inc"
        assert party["role"] == "被告"
        assert party["client_resolution"]["status"] == "NEW_CLIENT_PROPOSED"
        assert party["client_resolution"]["client_id"] is None
        assert party["client_resolution"]["client_name"] == "Global Industries Inc"
    
    @pytest.mark.asyncio
    @patch('agent.nodes.resolve_parties.resolve_parties')
    async def test_resolve_parties_future_implementation_multi_party(self, mock_resolve, mock_runtime):
        """Test future implementation with multiple parties."""
        # Arrange - Mock the future LLM implementation
        mock_resolve.return_value = {"identified_parties": MockExtractedParties.MULTI_PARTY}
        
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.ASSET_PRESERVATION_CN
        state["client_list"] = MOCK_CLIENT_LIST
        
        # Act
        result = await mock_resolve(state, mock_runtime)
        
        # Assert
        parties = result["identified_parties"]
        assert len(parties) == 2
        
        # First party - our client (matched)
        party1 = parties[0]
        assert party1["name"] == "阿里巴巴（中国）有限公司"
        assert party1["role"] == "原告"
        assert party1["client_resolution"]["status"] == "MATCH_FOUND"
        
        # Second party - opposing party
        party2 = parties[1]
        assert party2["name"] == "深圳市腾讯计算机系统有限公司"
        assert party2["role"] == "被告"
        assert party2["client_resolution"]["status"] == "OTHER_PARTY"
    
    @pytest.mark.asyncio
    @patch('agent.nodes.resolve_parties.resolve_parties')
    async def test_resolve_parties_future_implementation_contract_parties(self, mock_resolve, mock_runtime):
        """Test future implementation with contract parties."""
        # Arrange - Mock future implementation for contract document
        contract_parties = [
            {
                "name": "阿里巴巴（中国）有限公司",
                "role": "甲方",
                "client_resolution": {
                    "status": "MATCH_FOUND",
                    "client_id": 102,
                    "client_name": "阿里巴巴（中国）有限公司"
                }
            },
            {
                "name": "北京朝阳律师事务所",
                "role": "乙方",
                "client_resolution": {
                    "status": "OTHER_PARTY",
                    "client_id": None,
                    "client_name": None
                }
            }
        ]
        mock_resolve.return_value = {"identified_parties": contract_parties}
        
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.CONTRACT_CN
        state["client_list"] = MOCK_CLIENT_LIST
        
        # Act
        result = await mock_resolve(state, mock_runtime)
        
        # Assert
        parties = result["identified_parties"]
        assert len(parties) == 2
        assert parties[0]["role"] == "甲方"  # Party A in contract
        assert parties[1]["role"] == "乙方"  # Party B in contract
    
    @pytest.mark.asyncio
    async def test_resolve_parties_handles_no_client_list(self, mock_runtime):
        """Test party resolution when no client list is provided."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        state["client_list"] = []
        
        # Act
        result = await resolve_parties(state, mock_runtime)
        
        # Assert
        assert "identified_parties" in result
        assert isinstance(result["identified_parties"], list)
        # Placeholder implementation should still work without client list