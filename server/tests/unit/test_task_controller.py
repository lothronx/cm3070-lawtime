"""Unit tests for task_controller.py"""

import json
import pytest
from unittest.mock import Mock, patch, AsyncMock
from flask import Flask
from controllers.task_controller import TaskController


class TestTaskController:
    """Test class for TaskController functionality."""

    @pytest.fixture
    def app(self):
        """Create Flask app for testing."""
        app = Flask(__name__)
        app.config['TESTING'] = True
        return app

    @pytest.fixture
    def task_service_mock(self):
        """Mock TaskService."""
        mock = Mock()
        # Make propose_tasks async
        mock.propose_tasks = AsyncMock()
        return mock

    @pytest.fixture
    def task_controller(self, task_service_mock):
        """Create TaskController instance with mocked dependencies."""
        return TaskController(task_service_mock)

    @pytest.fixture
    def valid_request_data(self):
        """Valid request data for testing."""
        return {
            "source_type": "ocr",
            "source_file_urls": ["https://example.com/file1.pdf", "https://example.com/file2.jpg"],
            "client_list": [{"id": 102, "client_name": "ACME Corp"}]
        }

    @pytest.fixture
    def valid_headers(self):
        """Valid authorization headers."""
        return {"Authorization": "Bearer valid_jwt_token_here"}

    def test_init(self, task_service_mock):
        """Test TaskController initialization."""
        controller = TaskController(task_service_mock)
        assert controller.task_service == task_service_mock

    def test_propose_tasks_success_ocr(self, app, task_controller, task_service_mock, valid_request_data, valid_headers):
        """Test successful task proposal for OCR."""
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            json=valid_request_data,
            headers=valid_headers,
            content_type='application/json'
        ):
            # Mock task service response
            expected_tasks = [
                {
                    "title": "Court Hearing - ACME Corp",
                    "event_time": "2025-01-25T09:00:00Z",
                    "location": "Courtroom 5",
                    "client_id": 102
                },
                {
                    "title": "Document Review - ACME Corp", 
                    "event_time": "2025-01-23T14:00:00Z",
                    "location": "Office",
                    "client_id": 102
                }
            ]
            task_service_mock.propose_tasks.return_value = expected_tasks
            
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 200
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['success'] is True
            assert response_data['proposed_tasks'] == expected_tasks
            assert response_data['count'] == 2
            
            # Verify service was called with correct parameters
            task_service_mock.propose_tasks.assert_called_once_with(
                source_type="ocr",
                source_file_urls=["https://example.com/file1.pdf", "https://example.com/file2.jpg"],
                client_list=[{"id": 102, "client_name": "ACME Corp"}],
                jwt_token="valid_jwt_token_here"
            )

    def test_propose_tasks_success_asr(self, app, task_controller, task_service_mock, valid_headers):
        """Test successful task proposal for ASR."""
        asr_data = {
            "source_type": "asr",
            "source_file_urls": ["https://example.com/audio1.wav"],
            "client_list": [{"id": 103, "client_name": "Beta LLC"}]
        }
        
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            json=asr_data,
            headers=valid_headers,
            content_type='application/json'
        ):
            expected_tasks = [
                {
                    "title": "Follow-up Call - Beta LLC",
                    "event_time": "2025-01-24T11:00:00Z",
                    "location": "Phone",
                    "client_id": 103
                }
            ]
            task_service_mock.propose_tasks.return_value = expected_tasks
            
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 200
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['success'] is True
            assert response_data['proposed_tasks'] == expected_tasks
            assert response_data['count'] == 1

    def test_propose_tasks_empty_task_list(self, app, task_controller, task_service_mock, valid_request_data, valid_headers):
        """Test successful request but no tasks generated."""
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            json=valid_request_data,
            headers=valid_headers,
            content_type='application/json'
        ):
            task_service_mock.propose_tasks.return_value = []
            
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 200
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['success'] is True
            assert response_data['proposed_tasks'] == []
            assert response_data['count'] == 0

    def test_propose_tasks_missing_authorization_header(self, app, task_controller, valid_request_data):
        """Test request with missing Authorization header."""
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            json=valid_request_data,
            content_type='application/json'
        ):
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 401
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['error'] == 'Authorization header required'

    def test_propose_tasks_invalid_authorization_header(self, app, task_controller, valid_request_data):
        """Test request with invalid Authorization header format."""
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            json=valid_request_data,
            headers={"Authorization": "InvalidFormat token123"},
            content_type='application/json'
        ):
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 401
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['error'] == 'Authorization header required'

    def test_propose_tasks_non_json_request(self, app, task_controller, valid_headers):
        """Test request with non-JSON content type."""
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            data='not json',
            headers=valid_headers,
            content_type='text/plain'
        ):
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 400
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['error'] == 'Request body must be JSON'

    def test_propose_tasks_missing_source_type(self, app, task_controller, valid_headers):
        """Test request with missing source_type."""
        invalid_data = {
            "source_file_urls": ["https://example.com/file1.pdf"],
            "client_list": []
        }
        
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            json=invalid_data,
            headers=valid_headers,
            content_type='application/json'
        ):
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 400
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['error'] == 'source_type is required'

    def test_propose_tasks_missing_source_file_urls(self, app, task_controller, valid_headers):
        """Test request with missing source_file_urls."""
        invalid_data = {
            "source_type": "ocr",
            "client_list": []
        }
        
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            json=invalid_data,
            headers=valid_headers,
            content_type='application/json'
        ):
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 400
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['error'] == 'source_file_urls is required'

    def test_propose_tasks_empty_source_file_urls(self, app, task_controller, valid_headers):
        """Test request with empty source_file_urls array."""
        invalid_data = {
            "source_type": "ocr",
            "source_file_urls": [],
            "client_list": []
        }
        
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            json=invalid_data,
            headers=valid_headers,
            content_type='application/json'
        ):
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 400
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['error'] == 'source_file_urls is required'

    def test_propose_tasks_invalid_source_file_urls_type(self, app, task_controller, valid_headers):
        """Test request with source_file_urls not being an array."""
        invalid_data = {
            "source_type": "ocr",
            "source_file_urls": "not_an_array",
            "client_list": []
        }
        
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            json=invalid_data,
            headers=valid_headers,
            content_type='application/json'
        ):
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 400
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['error'] == 'source_file_urls must be an array'

    def test_propose_tasks_invalid_client_list_type(self, app, task_controller, valid_headers):
        """Test request with client_list not being an array."""
        invalid_data = {
            "source_type": "ocr",
            "source_file_urls": ["https://example.com/file1.pdf"],
            "client_list": "not_an_array"
        }
        
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            json=invalid_data,
            headers=valid_headers,
            content_type='application/json'
        ):
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 400
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['error'] == 'client_list must be an array'

    def test_propose_tasks_missing_client_list_defaults_empty(self, app, task_controller, task_service_mock, valid_headers):
        """Test request with missing client_list defaults to empty array."""
        data_without_clients = {
            "source_type": "ocr",
            "source_file_urls": ["https://example.com/file1.pdf"]
        }
        
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            json=data_without_clients,
            headers=valid_headers,
            content_type='application/json'
        ):
            task_service_mock.propose_tasks.return_value = []
            
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 200
            # Verify service was called with empty client list
            task_service_mock.propose_tasks.assert_called_once_with(
                source_type="ocr",
                source_file_urls=["https://example.com/file1.pdf"],
                client_list=[],
                jwt_token="valid_jwt_token_here"
            )

    def test_propose_tasks_value_error_from_service(self, app, task_controller, task_service_mock, valid_request_data, valid_headers):
        """Test handling of ValueError from task service."""
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            json=valid_request_data,
            headers=valid_headers,
            content_type='application/json'
        ):
            task_service_mock.propose_tasks.side_effect = ValueError("Invalid JWT token")
            
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 400
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['error'] == 'Invalid JWT token'

    def test_propose_tasks_runtime_error_from_service(self, app, task_controller, task_service_mock, valid_request_data, valid_headers):
        """Test handling of RuntimeError from task service."""
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            json=valid_request_data,
            headers=valid_headers,
            content_type='application/json'
        ):
            task_service_mock.propose_tasks.side_effect = RuntimeError("Service unavailable")
            
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 500
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['error'] == 'Internal server error'

    def test_propose_tasks_key_error_from_service(self, app, task_controller, task_service_mock, valid_request_data, valid_headers):
        """Test handling of KeyError from task service."""
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            json=valid_request_data,
            headers=valid_headers,
            content_type='application/json'
        ):
            task_service_mock.propose_tasks.side_effect = KeyError("Missing configuration")
            
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 500
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['error'] == 'Internal server error'

    def test_propose_tasks_type_error_from_service(self, app, task_controller, task_service_mock, valid_request_data, valid_headers):
        """Test handling of TypeError from task service."""
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            json=valid_request_data,
            headers=valid_headers,
            content_type='application/json'
        ):
            task_service_mock.propose_tasks.side_effect = TypeError("Unexpected data type")
            
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 500
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['error'] == 'Internal server error'

    def test_propose_tasks_jwt_token_extraction(self, app, task_controller, task_service_mock, valid_request_data):
        """Test correct JWT token extraction from Bearer header."""
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            json=valid_request_data,
            headers={"Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.example"},
            content_type='application/json'
        ):
            task_service_mock.propose_tasks.return_value = []
            
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 200
            # Verify JWT token was correctly extracted (Bearer prefix removed)
            task_service_mock.propose_tasks.assert_called_once_with(
                source_type="ocr",
                source_file_urls=["https://example.com/file1.pdf", "https://example.com/file2.jpg"],
                client_list=[{"id": 102, "client_name": "ACME Corp"}],
                jwt_token="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.example"
            )

    def test_propose_tasks_different_source_types(self, app, task_controller, task_service_mock, valid_headers):
        """Test handling of different source types."""
        test_cases = [
            {"source_type": "ocr", "files": ["doc.pdf"]},
            {"source_type": "asr", "files": ["audio.wav"]},
            {"source_type": "mixed", "files": ["doc.pdf", "audio.wav"]}
        ]
        
        for case in test_cases:
            data = {
                "source_type": case["source_type"],
                "source_file_urls": [f"https://example.com/{f}" for f in case["files"]],
                "client_list": []
            }
            
            with app.test_request_context(
                '/api/tasks/propose',
                method='POST',
                json=data,
                headers=valid_headers,
                content_type='application/json'
            ):
                task_service_mock.propose_tasks.return_value = []
                
                response, status_code = task_controller.propose_tasks()
                
                assert status_code == 200
                task_service_mock.propose_tasks.assert_called_with(
                    source_type=case["source_type"],
                    source_file_urls=[f"https://example.com/{f}" for f in case["files"]],
                    client_list=[],
                    jwt_token="valid_jwt_token_here"
                )

    def test_propose_tasks_multiple_files_and_clients(self, app, task_controller, task_service_mock, valid_headers):
        """Test handling of multiple files and clients."""
        complex_data = {
            "source_type": "ocr",
            "source_file_urls": [
                "https://example.com/contract1.pdf",
                "https://example.com/summons2.jpg", 
                "https://example.com/notice3.png"
            ],
            "client_list": [
                {"id": 101, "client_name": "Alpha Inc"},
                {"id": 102, "client_name": "Beta Corp"},
                {"id": 103, "client_name": "Gamma LLC"}
            ]
        }
        
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            json=complex_data,
            headers=valid_headers,
            content_type='application/json'
        ):
            task_service_mock.propose_tasks.return_value = [
                {"title": "Task 1", "client_id": 101},
                {"title": "Task 2", "client_id": 102},
                {"title": "Task 3", "client_id": 103}
            ]
            
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 200
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['count'] == 3
            assert len(response_data['proposed_tasks']) == 3

    @patch('controllers.task_controller.asyncio.run')
    def test_propose_tasks_asyncio_integration(self, mock_asyncio_run, app, task_controller, task_service_mock, valid_request_data, valid_headers):
        """Test that asyncio.run is called correctly for async service method."""
        with app.test_request_context(
            '/api/tasks/propose',
            method='POST',
            json=valid_request_data,
            headers=valid_headers,
            content_type='application/json'
        ):
            expected_tasks = [{"title": "Test Task"}]
            mock_asyncio_run.return_value = expected_tasks
            
            response, status_code = task_controller.propose_tasks()
            
            assert status_code == 200
            # Verify asyncio.run was called with the coroutine
            mock_asyncio_run.assert_called_once()
            
            # Extract the coroutine that was passed to asyncio.run
            call_args = mock_asyncio_run.call_args[0]
            assert len(call_args) == 1  # Should be one argument (the coroutine)