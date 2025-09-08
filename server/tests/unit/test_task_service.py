"""Unit tests for task_service.py"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from services.task_service import TaskService


class TestTaskService:
    """Test class for TaskService functionality."""

    @pytest.fixture
    def supabase_client_mock(self):
        """Mock Supabase client."""
        mock = Mock()
        mock.auth = Mock()
        return mock

    @pytest.fixture
    def config_mock(self):
        """Mock configuration."""
        return Mock()

    @pytest.fixture
    def task_service(self, supabase_client_mock, config_mock):
        """Create TaskService instance with mocked dependencies."""
        return TaskService(supabase_client_mock, config_mock)

    @pytest.fixture
    def mock_user_response(self):
        """Mock successful user response."""
        response = Mock()
        response.user = Mock()
        response.user.id = "user123"
        return response

    @pytest.fixture
    def valid_file_urls(self):
        """Valid file URLs for testing."""
        return [
            "https://project.supabase.co/storage/v1/object/public/file_storage/temp/user123/batch1/file1.pdf",
            "https://project.supabase.co/storage/v1/object/public/file_storage/temp/user123/batch1/file2.jpg"
        ]

    @pytest.fixture
    def valid_client_list(self):
        """Valid client list for testing."""
        return [
            {"id": 101, "client_name": "ACME Corp"},
            {"id": 102, "client_name": "Beta LLC"}
        ]

    def test_init(self, supabase_client_mock, config_mock):
        """Test TaskService initialization."""
        service = TaskService(supabase_client_mock, config_mock)
        assert service.supabase == supabase_client_mock
        assert service.config == config_mock

    def test_validate_jwt_and_extract_user_id_success(self, task_service, supabase_client_mock, mock_user_response):
        """Test successful JWT validation and user ID extraction."""
        jwt_token = "valid_jwt_token"
        supabase_client_mock.auth.get_user.return_value = mock_user_response
        
        user_id = task_service.validate_jwt_and_extract_user_id(jwt_token)
        
        assert user_id == "user123"
        supabase_client_mock.auth.get_user.assert_called_once_with(jwt_token)

    def test_validate_jwt_no_user(self, task_service, supabase_client_mock):
        """Test JWT validation with no user returned."""
        jwt_token = "invalid_jwt_token"
        
        # Mock response with no user
        response = Mock()
        response.user = None
        supabase_client_mock.auth.get_user.return_value = response
        
        with pytest.raises(ValueError, match="Authentication failed"):
            task_service.validate_jwt_and_extract_user_id(jwt_token)

    def test_validate_jwt_no_response(self, task_service, supabase_client_mock):
        """Test JWT validation with no response."""
        jwt_token = "invalid_jwt_token"
        supabase_client_mock.auth.get_user.return_value = None
        
        with pytest.raises(ValueError, match="Authentication failed"):
            task_service.validate_jwt_and_extract_user_id(jwt_token)

    def test_validate_jwt_exception(self, task_service, supabase_client_mock):
        """Test JWT validation with exception."""
        jwt_token = "invalid_jwt_token"
        supabase_client_mock.auth.get_user.side_effect = RuntimeError("Auth service error")
        
        with pytest.raises(ValueError, match="Authentication failed"):
            task_service.validate_jwt_and_extract_user_id(jwt_token)

    def test_validate_file_urls_success(self, task_service, valid_file_urls):
        """Test successful file URL validation."""
        user_id = "user123"
        
        # Should not raise any exception
        task_service.validate_file_urls(valid_file_urls, user_id)

    def test_validate_file_urls_unauthorized(self, task_service):
        """Test file URL validation with unauthorized access."""
        user_id = "user123"
        unauthorized_urls = [
            "https://project.supabase.co/storage/v1/object/public/file_storage/temp/user456/batch1/file1.pdf"
        ]
        
        with pytest.raises(ValueError, match="Unauthorized access to file"):
            task_service.validate_file_urls(unauthorized_urls, user_id)

    def test_url_belongs_to_user_valid(self, task_service):
        """Test URL ownership validation for valid URLs."""
        user_id = "user123"
        valid_urls = [
            "https://project.supabase.co/storage/v1/object/public/file_storage/temp/user123/batch1/file1.pdf",
            "https://example.com/storage/buckets/file_storage/temp/user123/batch2/document.jpg",
            "https://other.domain.com/path/temp/user123/test.wav"
        ]
        
        for url in valid_urls:
            assert task_service._url_belongs_to_user(url, user_id) is True

    def test_url_belongs_to_user_invalid(self, task_service):
        """Test URL ownership validation for invalid URLs."""
        user_id = "user123"
        invalid_urls = [
            "https://project.supabase.co/storage/v1/object/public/file_storage/temp/user456/batch1/file1.pdf",
            "https://example.com/storage/buckets/file_storage/temp/user789/document.jpg",
            "https://malicious.com/path/temp/user999/test.wav"
        ]
        
        for url in invalid_urls:
            assert task_service._url_belongs_to_user(url, user_id) is False

    def test_url_belongs_to_user_malformed_urls(self, task_service):
        """Test URL ownership validation for malformed URLs."""
        user_id = "user123"
        malformed_urls = [
            "https://example.com/no/temp/in/path",
            "https://example.com/temp",  # No user ID after temp
            "invalid-url",
            "",
            "https://example.com/temp/"  # Empty user ID
        ]
        
        for url in malformed_urls:
            assert task_service._url_belongs_to_user(url, user_id) is False

    @pytest.mark.asyncio
    async def test_propose_tasks_success(self, task_service, supabase_client_mock, mock_user_response, valid_file_urls, valid_client_list):
        """Test successful task proposal."""
        jwt_token = "valid_jwt_token"
        source_type = "ocr"
        
        # Mock JWT validation
        supabase_client_mock.auth.get_user.return_value = mock_user_response
        
        # Mock LangGraph response
        expected_tasks = [
            {
                "title": "Court Hearing - ACME Corp",
                "event_time": "2025-01-25T09:00:00Z",
                "location": "Courtroom 5",
                "client_id": 101
            },
            {
                "title": "Document Review - Beta LLC",
                "event_time": "2025-01-23T14:00:00Z",
                "location": "Office",
                "client_id": 102
            }
        ]
        
        with patch('services.task_service.graph') as mock_graph:
            mock_graph.ainvoke = AsyncMock(return_value={"proposed_tasks": expected_tasks})
            
            result = await task_service.propose_tasks(
                source_type=source_type,
                source_file_urls=valid_file_urls,
                client_list=valid_client_list,
                jwt_token=jwt_token
            )
            
            assert result == expected_tasks
            mock_graph.ainvoke.assert_called_once()
            
            # Verify the initial state passed to the graph
            call_args = mock_graph.ainvoke.call_args[0][0]
            assert call_args["source_type"] == source_type
            assert call_args["source_file_urls"] == valid_file_urls
            assert call_args["client_list"] == valid_client_list

    @pytest.mark.asyncio
    async def test_propose_tasks_empty_result(self, task_service, supabase_client_mock, mock_user_response, valid_file_urls, valid_client_list):
        """Test task proposal with empty result."""
        jwt_token = "valid_jwt_token"
        source_type = "asr"
        
        # Mock JWT validation
        supabase_client_mock.auth.get_user.return_value = mock_user_response
        
        with patch('services.task_service.graph') as mock_graph:
            mock_graph.ainvoke = AsyncMock(return_value={"proposed_tasks": []})
            
            result = await task_service.propose_tasks(
                source_type=source_type,
                source_file_urls=valid_file_urls,
                client_list=valid_client_list,
                jwt_token=jwt_token
            )
            
            assert result == []

    @pytest.mark.asyncio
    async def test_propose_tasks_no_proposed_tasks_key(self, task_service, supabase_client_mock, mock_user_response, valid_file_urls, valid_client_list):
        """Test task proposal with missing proposed_tasks key."""
        jwt_token = "valid_jwt_token"
        source_type = "ocr"
        
        # Mock JWT validation
        supabase_client_mock.auth.get_user.return_value = mock_user_response
        
        with patch('services.task_service.graph') as mock_graph:
            mock_graph.ainvoke = AsyncMock(return_value={})  # No proposed_tasks key
            
            result = await task_service.propose_tasks(
                source_type=source_type,
                source_file_urls=valid_file_urls,
                client_list=valid_client_list,
                jwt_token=jwt_token
            )
            
            assert result == []

    @pytest.mark.asyncio
    async def test_propose_tasks_invalid_jwt(self, task_service, supabase_client_mock, valid_file_urls, valid_client_list):
        """Test task proposal with invalid JWT."""
        jwt_token = "invalid_jwt_token"
        source_type = "ocr"
        
        # Mock JWT validation failure
        supabase_client_mock.auth.get_user.side_effect = RuntimeError("Invalid token")
        
        with pytest.raises(ValueError, match="Authentication failed"):
            await task_service.propose_tasks(
                source_type=source_type,
                source_file_urls=valid_file_urls,
                client_list=valid_client_list,
                jwt_token=jwt_token
            )

    @pytest.mark.asyncio
    async def test_propose_tasks_unauthorized_files(self, task_service, supabase_client_mock, mock_user_response, valid_client_list):
        """Test task proposal with unauthorized file URLs."""
        jwt_token = "valid_jwt_token"
        source_type = "ocr"
        unauthorized_urls = [
            "https://project.supabase.co/storage/v1/object/public/file_storage/temp/user456/batch1/file1.pdf"
        ]
        
        # Mock JWT validation
        supabase_client_mock.auth.get_user.return_value = mock_user_response
        
        with pytest.raises(ValueError, match="Unauthorized access to file"):
            await task_service.propose_tasks(
                source_type=source_type,
                source_file_urls=unauthorized_urls,
                client_list=valid_client_list,
                jwt_token=jwt_token
            )

    @pytest.mark.asyncio
    async def test_propose_tasks_graph_exception(self, task_service, supabase_client_mock, mock_user_response, valid_file_urls, valid_client_list):
        """Test task proposal with LangGraph exception."""
        jwt_token = "valid_jwt_token"
        source_type = "ocr"
        
        # Mock JWT validation
        supabase_client_mock.auth.get_user.return_value = mock_user_response
        
        with patch('services.task_service.graph') as mock_graph:
            mock_graph.ainvoke = AsyncMock(side_effect=RuntimeError("Graph processing failed"))
            
            with pytest.raises(ValueError, match="AI processing failed"):
                await task_service.propose_tasks(
                    source_type=source_type,
                    source_file_urls=valid_file_urls,
                    client_list=valid_client_list,
                    jwt_token=jwt_token
                )

    def test_initial_state_structure(self, task_service, supabase_client_mock, mock_user_response, valid_file_urls, valid_client_list):
        """Test that initial state structure is correctly formatted for LangGraph."""
        jwt_token = "valid_jwt_token"
        source_type = "ocr"
        
        # Mock JWT validation
        supabase_client_mock.auth.get_user.return_value = mock_user_response
        
        with patch('services.task_service.graph') as mock_graph:
            mock_graph.ainvoke = AsyncMock(return_value={"proposed_tasks": []})
            
            # Run the async function synchronously for this test
            import asyncio
            asyncio.run(task_service.propose_tasks(
                source_type=source_type,
                source_file_urls=valid_file_urls,
                client_list=valid_client_list,
                jwt_token=jwt_token
            ))
            
            # Verify initial state structure
            call_args = mock_graph.ainvoke.call_args[0][0]
            
            # Required fields
            assert call_args["source_type"] == source_type
            assert call_args["source_file_urls"] == valid_file_urls
            assert call_args["client_list"] == valid_client_list
            
            # Initialized fields
            assert call_args["client_list_formatted"] == ""
            assert call_args["current_datetime"] == ""
            assert call_args["dashscope_api_key"] == ""
            assert call_args["raw_text"] == ""
            assert call_args["identified_parties"] is None
            assert call_args["document_type"] is None
            assert call_args["validation_passed"] is None
            assert call_args["extracted_events"] == []
            assert call_args["proposed_tasks"] == []

    @pytest.mark.asyncio
    async def test_propose_tasks_different_source_types(self, task_service, supabase_client_mock, mock_user_response, valid_file_urls, valid_client_list):
        """Test task proposal with different source types."""
        jwt_token = "valid_jwt_token"
        source_types = ["ocr", "asr", "mixed"]
        
        # Mock JWT validation
        supabase_client_mock.auth.get_user.return_value = mock_user_response
        
        for source_type in source_types:
            with patch('services.task_service.graph') as mock_graph:
                mock_graph.ainvoke = AsyncMock(return_value={"proposed_tasks": []})
                
                await task_service.propose_tasks(
                    source_type=source_type,
                    source_file_urls=valid_file_urls,
                    client_list=valid_client_list,
                    jwt_token=jwt_token
                )
                
                # Verify source type was passed correctly
                call_args = mock_graph.ainvoke.call_args[0][0]
                assert call_args["source_type"] == source_type

    @pytest.mark.asyncio
    async def test_propose_tasks_empty_client_list(self, task_service, supabase_client_mock, mock_user_response, valid_file_urls):
        """Test task proposal with empty client list."""
        jwt_token = "valid_jwt_token"
        source_type = "ocr"
        empty_client_list = []
        
        # Mock JWT validation
        supabase_client_mock.auth.get_user.return_value = mock_user_response
        
        with patch('services.task_service.graph') as mock_graph:
            mock_graph.ainvoke = AsyncMock(return_value={"proposed_tasks": []})
            
            result = await task_service.propose_tasks(
                source_type=source_type,
                source_file_urls=valid_file_urls,
                client_list=empty_client_list,
                jwt_token=jwt_token
            )
            
            assert result == []
            
            # Verify empty client list was passed
            call_args = mock_graph.ainvoke.call_args[0][0]
            assert call_args["client_list"] == []

    @pytest.mark.asyncio
    async def test_propose_tasks_single_file(self, task_service, supabase_client_mock, mock_user_response, valid_client_list):
        """Test task proposal with single file."""
        jwt_token = "valid_jwt_token"
        source_type = "asr"
        single_file_url = ["https://project.supabase.co/storage/v1/object/public/file_storage/temp/user123/batch1/audio.wav"]
        
        # Mock JWT validation
        supabase_client_mock.auth.get_user.return_value = mock_user_response
        
        with patch('services.task_service.graph') as mock_graph:
            mock_graph.ainvoke = AsyncMock(return_value={"proposed_tasks": [{"title": "Audio Task"}]})
            
            result = await task_service.propose_tasks(
                source_type=source_type,
                source_file_urls=single_file_url,
                client_list=valid_client_list,
                jwt_token=jwt_token
            )
            
            assert len(result) == 1
            assert result[0]["title"] == "Audio Task"

    def test_url_parsing_edge_cases(self, task_service):
        """Test URL parsing with various edge cases."""
        user_id = "user123"
        
        edge_cases = [
            # Valid cases
            ("https://a.b.c/temp/user123/file.pdf", True),
            ("http://example.com/temp/user123", True),
            ("https://example.com/path/temp/user123/nested/file.txt", True),
            
            # Invalid cases - wrong user ID
            ("https://example.com/temp/user456/file.pdf", False),
            ("https://example.com/temp/other_user/file.pdf", False),
            
            # Invalid cases - no temp in path
            ("https://example.com/user123/file.pdf", False),
            ("https://example.com/permanent/user123/file.pdf", False),
            
            # Invalid cases - malformed
            ("not-a-url", False),
            ("", False),
            ("https://", False),
            ("https://example.com/", False),
            ("https://example.com/temp", False),  # No user ID after temp
        ]
        
        for url, expected in edge_cases:
            result = task_service._url_belongs_to_user(url, user_id)
            assert result == expected, f"Failed for URL: {url}"

    @pytest.mark.asyncio
    async def test_propose_tasks_complex_scenario(self, task_service, supabase_client_mock, mock_user_response):
        """Test task proposal with complex real-world scenario."""
        jwt_token = "valid_jwt_token"
        source_type = "ocr"
        
        # Multiple files from different batches
        file_urls = [
            "https://project.supabase.co/storage/v1/object/public/file_storage/temp/user123/batch1/contract.pdf",
            "https://project.supabase.co/storage/v1/object/public/file_storage/temp/user123/batch1/summons.jpg",
            "https://project.supabase.co/storage/v1/object/public/file_storage/temp/user123/batch2/notice.png"
        ]
        
        # Multiple clients
        client_list = [
            {"id": 101, "client_name": "Alpha Corp"},
            {"id": 102, "client_name": "Beta LLC"},
            {"id": 103, "client_name": "Gamma Inc"}
        ]
        
        # Complex task response
        expected_tasks = [
            {
                "title": "Contract Review - Alpha Corp",
                "event_time": "2025-01-30T10:00:00Z",
                "location": "Conference Room A",
                "client_id": 101,
                "source_document": "contract.pdf"
            },
            {
                "title": "Court Appearance - Beta LLC",
                "event_time": "2025-02-01T09:00:00Z",
                "location": "Courtroom 3",
                "client_id": 102,
                "source_document": "summons.jpg"
            },
            {
                "title": "Deadline Reminder - Gamma Inc",
                "event_time": "2025-01-28T15:00:00Z",
                "location": "Office",
                "client_id": 103,
                "source_document": "notice.png"
            }
        ]
        
        # Mock JWT validation
        supabase_client_mock.auth.get_user.return_value = mock_user_response
        
        with patch('services.task_service.graph') as mock_graph:
            mock_graph.ainvoke = AsyncMock(return_value={"proposed_tasks": expected_tasks})
            
            result = await task_service.propose_tasks(
                source_type=source_type,
                source_file_urls=file_urls,
                client_list=client_list,
                jwt_token=jwt_token
            )
            
            assert len(result) == 3
            assert result == expected_tasks
            
            # Verify all data was passed correctly to graph
            call_args = mock_graph.ainvoke.call_args[0][0]
            assert call_args["source_type"] == source_type
            assert call_args["source_file_urls"] == file_urls
            assert call_args["client_list"] == client_list