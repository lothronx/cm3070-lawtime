"""Integration tests for API endpoints.

These tests use the Flask test client to test actual HTTP requests
and responses through the complete application stack.
"""

import pytest
import json
from unittest.mock import Mock, patch
from app import create_app


class TestAPIEndpoints:
    """Integration tests for API endpoints."""

    @pytest.fixture
    def app(self):
        """Create Flask app for testing."""
        test_config = {
            'TESTING': True
        }
        app = create_app(test_config)
        return app

    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()

    def test_health_check_endpoint(self, client):
        """Test the health check endpoint."""
        response = client.get('/')

        assert response.status_code == 200
        assert response.get_data(as_text=True) == "Yep, it's running"

    @patch('services.phone_verification_service.PhoneVerificationService.send_verification_code')
    def test_send_otp_endpoint_success(self, mock_send_code, client):
        """Test successful OTP sending via API."""
        # Mock successful SMS sending
        mock_send_code.return_value = (True, None, "biz_123")

        response = client.post(
            '/api/auth/send-otp',
            json={'phone_number': '13800138000'},
            content_type='application/json'
        )

        assert response.status_code == 200
        data = json.loads(response.get_data(as_text=True))
        assert data['status'] == 'success'
        assert 'Verification code sent successfully' in data['message']

    def test_send_otp_endpoint_empty_phone(self, client):
        """Test OTP endpoint with empty phone number."""
        response = client.post(
            '/api/auth/send-otp',
            json={'phone_number': ''},
            content_type='application/json'
        )

        assert response.status_code == 400
        data = json.loads(response.get_data(as_text=True))
        assert data['status'] == 'error'
        assert 'phone_number cannot be empty' in data['message']

    def test_send_otp_endpoint_invalid_content_type(self, client):
        """Test OTP endpoint with invalid content type."""
        response = client.post(
            '/api/auth/send-otp',
            data='phone_number=13800138000',
            content_type='application/x-www-form-urlencoded'
        )

        assert response.status_code == 400
        data = json.loads(response.get_data(as_text=True))
        assert data['status'] == 'error'
        assert 'Content-Type must be application/json' in data['message']

    def test_propose_tasks_endpoint_missing_auth(self, client):
        """Test task proposal endpoint without authorization header."""
        response = client.post(
            '/api/tasks/propose',
            json={
                'source_type': 'ocr',
                'source_file_urls': ['https://example.com/file.pdf']
            },
            content_type='application/json'
        )

        assert response.status_code == 401
        data = json.loads(response.get_data(as_text=True))
        assert 'Authorization header required' in data['error']

    @patch('services.task_service.TaskService.propose_tasks')
    def test_propose_tasks_endpoint_success(self, mock_propose, client):
        """Test successful task proposal via API."""
        # Mock successful task proposal
        mock_propose.return_value = [
            {
                'title': 'Court Hearing',
                'client_name': 'John Doe',
                'event_time': '2024-01-15T09:00:00Z',
                'location': 'Courtroom 5'
            }
        ]

        response = client.post(
            '/api/tasks/propose',
            json={
                'source_type': 'ocr',
                'source_file_urls': ['https://example.com/file.pdf'],
                'client_list': [{'id': 1, 'client_name': 'John Doe'}]
            },
            content_type='application/json',
            headers={'Authorization': 'Bearer valid_jwt_token'}
        )

        assert response.status_code == 200
        data = json.loads(response.get_data(as_text=True))
        assert 'proposed_tasks' in data
        assert len(data['proposed_tasks']) == 1
        assert data['proposed_tasks'][0]['title'] == 'Court Hearing'

    def test_propose_tasks_endpoint_missing_data(self, client):
        """Test task proposal endpoint with missing required fields."""
        response = client.post(
            '/api/tasks/propose',
            json={'source_type': 'ocr'},
            content_type='application/json',
            headers={'Authorization': 'Bearer valid_jwt_token'}
        )

        assert response.status_code == 400
        data = json.loads(response.get_data(as_text=True))
        assert 'source_file_urls is required' in data['error']

    def test_nonexistent_endpoint(self, client):
        """Test request to nonexistent endpoint."""
        response = client.get('/api/nonexistent')

        assert response.status_code == 404

    def test_method_not_allowed(self, client):
        """Test invalid HTTP method on existing endpoint."""
        response = client.get('/api/auth/send-otp')

        assert response.status_code == 405

    @patch('services.phone_verification_service.PhoneVerificationService.send_verification_code')
    def test_send_otp_endpoint_service_failure(self, mock_send_code, client):
        """Test OTP endpoint when SMS service fails."""
        # Mock SMS service failure
        mock_send_code.return_value = (False, "Daily limit exceeded", None)

        response = client.post(
            '/api/auth/send-otp',
            json={'phone_number': '13800138000'},
            content_type='application/json'
        )

        assert response.status_code == 429
        data = json.loads(response.get_data(as_text=True))
        assert data['status'] == 'error'
        assert 'Daily limit exceeded' in data['message']

    @patch('services.task_service.TaskService.propose_tasks')
    def test_propose_tasks_endpoint_service_error(self, mock_propose, client):
        """Test task proposal endpoint when service throws error."""
        # Mock service error
        mock_propose.side_effect = ValueError("Invalid file format")

        response = client.post(
            '/api/tasks/propose',
            json={
                'source_type': 'ocr',
                'source_file_urls': ['https://example.com/file.pdf']
            },
            content_type='application/json',
            headers={'Authorization': 'Bearer valid_jwt_token'}
        )

        assert response.status_code == 400
        data = json.loads(response.get_data(as_text=True))
        assert 'Invalid file format' in data['error']