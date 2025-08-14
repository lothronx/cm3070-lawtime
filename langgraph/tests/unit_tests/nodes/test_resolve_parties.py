"""Unit tests for resolve_parties node."""

import json
from unittest.mock import Mock, patch

import pytest

from agent.nodes.resolve_parties import resolve_parties
from tests.fixtures.mock_data import (
    get_mock_initial_state,
    MockDocuments,
    MOCK_CLIENT_LIST,
)


@pytest.fixture
def mock_runtime():
    """Create a mock runtime for testing."""
    return Mock()


class TestResolveParties:
    """Test cases for resolve_parties node."""

    def _async_passthrough(
        self, func, *args, **kwargs
    ):  # pylint: disable=unused-argument
        """Helper to pass through async calls synchronously for testing."""
        return func(*args, **kwargs)

    def _create_mock_party(
        self, name, role, status, client_id=None, client_name=None, confidence=1.0
    ):
        """Helper to create a mock party object."""
        # Create mocks that act like proper objects with attributes
        client_resolution_mock = Mock()
        client_resolution_mock.status = status
        client_resolution_mock.client_id = client_id
        client_resolution_mock.client_name = client_name
        client_resolution_mock.confidence = confidence

        party_mock = Mock()
        party_mock.name = name
        party_mock.role = role
        party_mock.client_resolution = client_resolution_mock

        return party_mock

    def _setup_mocks(self, mock_parties):
        """Helper to setup all mocks for resolve_parties tests."""
        mock_parsed_result = Mock()
        mock_parsed_result.identified_parties = mock_parties

        mock_llm_response = Mock()
        mock_llm_response.content = "mock response content"

        return (
            patch("agent.nodes.resolve_parties.ChatTongyi"),
            patch("agent.nodes.resolve_parties.PydanticOutputParser"),
            patch("agent.nodes.resolve_parties.PromptTemplate"),
            patch(
                "agent.nodes.resolve_parties.asyncio.to_thread",
                side_effect=self._async_passthrough,
            ),
            mock_parsed_result,
            mock_llm_response,
        )

    @pytest.mark.asyncio
    async def test_resolve_parties_with_valid_text_and_client_list(self, mock_runtime):
        """Test party resolution with valid document text and client list."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        state["client_list_formatted"] = json.dumps(
            MOCK_CLIENT_LIST, ensure_ascii=False
        )
        state["dashscope_api_key"] = "test-api-key"

        mock_parties = [
            self._create_mock_party(
                "阿里巴巴（中国）有限公司",
                "被传唤人",
                "MATCH_FOUND",
                102,
                "阿里巴巴（中国）有限公司",
                1.0,
            )
        ]

        (
            mock_tongyi_class,
            mock_parser_class,
            mock_template_class,
            mock_asyncio_patch,
            mock_parsed_result,
            mock_llm_response,
        ) = self._setup_mocks(mock_parties)

        with mock_tongyi_class as tongyi, mock_parser_class as parser_cls, mock_template_class as template_cls, (
            mock_asyncio_patch
        ):
            # Configure the mocks
            mock_llm = Mock()
            mock_llm.invoke.return_value = mock_llm_response
            tongyi.return_value = mock_llm

            mock_parser = Mock()
            mock_parser.parse.return_value = mock_parsed_result
            mock_parser.get_format_instructions.return_value = "format instructions"
            parser_cls.return_value = mock_parser

            mock_template = Mock()
            mock_template.format.return_value = "formatted prompt"
            template_cls.return_value = mock_template

            # Act
            result = await resolve_parties(state, mock_runtime)

            # Assert
            assert "identified_parties" in result
            parties_json = result["identified_parties"]
            parties = json.loads(parties_json)

            assert len(parties) == 1
            party = parties[0]
            assert party["name"] == "阿里巴巴（中国）有限公司"
            assert party["role"] == "被传唤人"
            assert party["client_resolution"]["status"] == "MATCH_FOUND"
            assert party["client_resolution"]["client_id"] == 102

    @pytest.mark.asyncio
    async def test_resolve_parties_with_empty_text(self, mock_runtime):
        """Test party resolution with empty raw text."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = ""
        state["client_list_formatted"] = json.dumps(
            MOCK_CLIENT_LIST, ensure_ascii=False
        )

        # Act
        result = await resolve_parties(state, mock_runtime)

        # Assert
        assert "identified_parties" in result
        assert result["identified_parties"] == "[]"

    @pytest.mark.asyncio
    async def test_resolve_parties_with_missing_text(self, mock_runtime):
        """Test party resolution when raw_text is missing from state."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state.pop("raw_text", None)  # Remove raw_text from state
        state["client_list_formatted"] = json.dumps(
            MOCK_CLIENT_LIST, ensure_ascii=False
        )

        # Act
        result = await resolve_parties(state, mock_runtime)

        # Assert
        assert "identified_parties" in result
        assert result["identified_parties"] == "[]"

    @pytest.mark.asyncio
    async def test_resolve_parties_with_whitespace_only_text(self, mock_runtime):
        """Test party resolution with whitespace-only text."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = "   \n\t  "
        state["client_list_formatted"] = json.dumps(
            MOCK_CLIENT_LIST, ensure_ascii=False
        )

        # Act
        result = await resolve_parties(state, mock_runtime)

        # Assert
        assert "identified_parties" in result
        assert result["identified_parties"] == "[]"

    @pytest.mark.asyncio
    async def test_resolve_parties_llm_failure_with_retries(self, mock_runtime):
        """Test party resolution when LLM fails after retries."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        state["client_list_formatted"] = json.dumps(
            MOCK_CLIENT_LIST, ensure_ascii=False
        )
        state["dashscope_api_key"] = "test-api-key"

        with patch("agent.nodes.resolve_parties.ChatTongyi") as mock_tongyi, patch(
            "agent.nodes.resolve_parties.asyncio.to_thread",
            side_effect=Exception("LLM API Error"),
        ):

            mock_llm = Mock()
            mock_tongyi.return_value = mock_llm

            # Act
            result = await resolve_parties(state, mock_runtime)

            # Assert
            assert "identified_parties" in result
            assert result["identified_parties"] == "[]"

    @pytest.mark.asyncio
    async def test_resolve_parties_successful_after_retry(self, mock_runtime):
        """Test party resolution succeeds after initial failure."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        state["client_list_formatted"] = json.dumps(
            MOCK_CLIENT_LIST, ensure_ascii=False
        )
        state["dashscope_api_key"] = "test-api-key"

        # Mock the parsed result for successful retry
        mock_parties = [
            self._create_mock_party(
                "阿里巴巴（中国）有限公司",
                "被传唤人",
                "MATCH_FOUND",
                102,
                "阿里巴巴（中国）有限公司",
                1.0,
            )
        ]

        mock_parsed_result = Mock()
        mock_parsed_result.identified_parties = mock_parties

        mock_llm_response = Mock()
        mock_llm_response.content = "mock response content"

        # Mock first invoke call to fail, second to succeed
        call_count = 0

        def mock_invoke(*args, **kwargs):  # pylint: disable=unused-argument
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise Exception("Network error")
            return mock_llm_response

        with patch(
            "agent.nodes.resolve_parties.ChatTongyi"
        ) as mock_tongyi_class, patch(
            "agent.nodes.resolve_parties.PydanticOutputParser"
        ) as mock_parser_class, patch(
            "agent.nodes.resolve_parties.PromptTemplate"
        ) as mock_template_class, patch(
            "agent.nodes.resolve_parties.asyncio.to_thread",
            side_effect=self._async_passthrough,
        ):

            mock_llm = Mock()
            mock_llm.invoke = mock_invoke
            mock_tongyi_class.return_value = mock_llm

            mock_parser = Mock()
            mock_parser.parse.return_value = mock_parsed_result
            mock_parser.get_format_instructions.return_value = "format instructions"
            mock_parser_class.return_value = mock_parser

            mock_template = Mock()
            mock_template.format.return_value = "formatted prompt"
            mock_template_class.return_value = mock_template

            # Act
            result = await resolve_parties(state, mock_runtime)

            # Assert
            assert "identified_parties" in result
            parties_json = result["identified_parties"]
            parties = json.loads(parties_json)
            assert len(parties) == 1

    @pytest.mark.asyncio
    async def test_resolve_parties_with_no_client_list_formatted(self, mock_runtime):
        """Test party resolution when client_list_formatted is missing."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        state["dashscope_api_key"] = "test-api-key"
        # client_list_formatted is missing, should default to "No existing clients"

        mock_parties = [
            self._create_mock_party(
                "新客户公司", "甲方", "NEW_CLIENT_PROPOSED", None, "新客户公司", 0.8
            )
        ]

        (
            mock_tongyi_class,
            mock_parser_class,
            mock_template_class,
            mock_asyncio_patch,
            mock_parsed_result,
            mock_llm_response,
        ) = self._setup_mocks(mock_parties)

        with mock_tongyi_class as tongyi, mock_parser_class as parser_cls, mock_template_class as template_cls, (
            mock_asyncio_patch
        ):
            # Configure the mocks
            mock_llm = Mock()
            mock_llm.invoke.return_value = mock_llm_response
            tongyi.return_value = mock_llm

            mock_parser = Mock()
            mock_parser.parse.return_value = mock_parsed_result
            mock_parser.get_format_instructions.return_value = "format instructions"
            parser_cls.return_value = mock_parser

            mock_template = Mock()
            mock_template.format.return_value = "formatted prompt"
            template_cls.return_value = mock_template

            # Act
            result = await resolve_parties(state, mock_runtime)

            # Assert
            assert "identified_parties" in result
            parties_json = result["identified_parties"]
            parties = json.loads(parties_json)

            assert len(parties) == 1
            party = parties[0]
            assert party["client_resolution"]["status"] == "NEW_CLIENT_PROPOSED"

    @pytest.mark.asyncio
    async def test_resolve_parties_multi_party_scenario(self, mock_runtime):
        """Test party resolution with multiple parties."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.ASSET_PRESERVATION_CN
        state["client_list_formatted"] = json.dumps(
            MOCK_CLIENT_LIST, ensure_ascii=False
        )
        state["dashscope_api_key"] = "test-api-key"

        mock_parties = [
            self._create_mock_party(
                "阿里巴巴（中国）有限公司",
                "原告",
                "MATCH_FOUND",
                102,
                "阿里巴巴（中国）有限公司",
                1.0,
            ),
            self._create_mock_party(
                "深圳市腾讯计算机系统有限公司", "被告", "OTHER_PARTY", None, None, 0.9
            ),
        ]

        (
            mock_tongyi_class,
            mock_parser_class,
            mock_template_class,
            mock_asyncio_patch,
            mock_parsed_result,
            mock_llm_response,
        ) = self._setup_mocks(mock_parties)

        with mock_tongyi_class as tongyi, mock_parser_class as parser_cls, mock_template_class as template_cls, (
            mock_asyncio_patch
        ):
            # Configure the mocks
            mock_llm = Mock()
            mock_llm.invoke.return_value = mock_llm_response
            tongyi.return_value = mock_llm

            mock_parser = Mock()
            mock_parser.parse.return_value = mock_parsed_result
            mock_parser.get_format_instructions.return_value = "format instructions"
            parser_cls.return_value = mock_parser

            mock_template = Mock()
            mock_template.format.return_value = "formatted prompt"
            template_cls.return_value = mock_template

            # Act
            result = await resolve_parties(state, mock_runtime)

            # Assert
            assert "identified_parties" in result
            parties_json = result["identified_parties"]
            parties = json.loads(parties_json)

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
    async def test_resolve_parties_contract_scenario(self, mock_runtime):
        """Test party resolution with contract document."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.CONTRACT_CN
        state["client_list_formatted"] = json.dumps(
            MOCK_CLIENT_LIST, ensure_ascii=False
        )
        state["dashscope_api_key"] = "test-api-key"

        mock_parties = [
            self._create_mock_party(
                "阿里巴巴（中国）有限公司",
                "甲方",
                "MATCH_FOUND",
                102,
                "阿里巴巴（中国）有限公司",
                1.0,
            ),
            self._create_mock_party(
                "北京朝阳律师事务所", "乙方", "OTHER_PARTY", None, None, 0.9
            ),
        ]

        (
            mock_tongyi_class,
            mock_parser_class,
            mock_template_class,
            mock_asyncio_patch,
            mock_parsed_result,
            mock_llm_response,
        ) = self._setup_mocks(mock_parties)

        with mock_tongyi_class as tongyi, mock_parser_class as parser_cls, mock_template_class as template_cls, (
            mock_asyncio_patch
        ):
            # Configure the mocks
            mock_llm = Mock()
            mock_llm.invoke.return_value = mock_llm_response
            tongyi.return_value = mock_llm

            mock_parser = Mock()
            mock_parser.parse.return_value = mock_parsed_result
            mock_parser.get_format_instructions.return_value = "format instructions"
            parser_cls.return_value = mock_parser

            mock_template = Mock()
            mock_template.format.return_value = "formatted prompt"
            template_cls.return_value = mock_template

            # Act
            result = await resolve_parties(state, mock_runtime)

            # Assert
            assert "identified_parties" in result
            parties_json = result["identified_parties"]
            parties = json.loads(parties_json)

            assert len(parties) == 2
            assert parties[0]["role"] == "甲方"  # Party A in contract
            assert parties[1]["role"] == "乙方"  # Party B in contract

    @pytest.mark.asyncio
    async def test_resolve_parties_unexpected_error(self, mock_runtime):
        """Test party resolution handles unexpected errors gracefully."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        state["client_list_formatted"] = json.dumps(
            MOCK_CLIENT_LIST, ensure_ascii=False
        )

        with patch(
            "agent.nodes.resolve_parties.ChatTongyi",
            side_effect=Exception("Unexpected error"),
        ):

            # Act
            result = await resolve_parties(state, mock_runtime)

            # Assert
            assert "identified_parties" in result
            assert result["identified_parties"] == "[]"

    @pytest.mark.asyncio
    async def test_resolve_parties_returns_only_identified_parties_key(
        self, mock_runtime
    ):
        """Test that resolve_parties returns only the identified_parties key."""
        # Arrange
        state = get_mock_initial_state("ocr")
        state["raw_text"] = MockDocuments.COURT_HEARING_CN
        state["client_list_formatted"] = json.dumps(
            MOCK_CLIENT_LIST, ensure_ascii=False
        )
        state["dashscope_api_key"] = "test-api-key"

        mock_llm_response = Mock()
        mock_llm_response.content = json.dumps(
            {
                "identified_parties": [
                    {
                        "name": "测试公司",
                        "role": "甲方",
                        "client_resolution": {
                            "status": "NEW_CLIENT_PROPOSED",
                            "client_id": None,
                            "client_name": "测试公司",
                            "confidence": 0.8,
                        },
                    }
                ],
                "processing_notes": {
                    "total_parties_found": 1,
                    "ocr_corrections_made": False,
                    "text_quality": "high",
                },
            },
            ensure_ascii=False,
        )

        with patch("agent.nodes.resolve_parties.ChatTongyi") as mock_tongyi, patch(
            "agent.nodes.resolve_parties.asyncio.to_thread",
            side_effect=lambda f, *args: f(*args),
        ):

            mock_llm = Mock()
            mock_llm.invoke.return_value = mock_llm_response
            mock_tongyi.return_value = mock_llm

            # Act
            result = await resolve_parties(state, mock_runtime)

            # Assert
            assert len(result) == 1
            assert "identified_parties" in result
            assert "document_type" not in result
            assert "extracted_events" not in result
            assert "processing_notes" not in result
