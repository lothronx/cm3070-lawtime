"""Integration tests for complete authentication workflow.

These tests simulate the complete user authentication journey
from sending OTP to receiving JWT tokens.
"""

import pytest
import json
from unittest.mock import patch
from app import create_app


class TestAuthWorkflow:
    """End-to-end authentication workflow tests."""

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

    @patch('services.phone_verification_service.PhoneVerificationService.send_verification_code')
    def test_auth_workflow_sms_failure(self, mock_send_code, client):
        """Test authentication workflow when SMS sending fails."""
        phone_number = '13800138000'

        # Mock SMS service failure
        mock_send_code.return_value = (False, "Daily limit exceeded. Please try again tomorrow", None)

        send_response = client.post(
            '/api/auth/send-otp',
            json={'phone_number': phone_number},
            content_type='application/json'
        )

        assert send_response.status_code == 429
        send_data = json.loads(send_response.get_data(as_text=True))
        assert send_data['status'] == 'error'
        assert 'Daily limit exceeded' in send_data['message']

    @patch('services.auth_service.AuthService.authenticate_user')
    @patch('services.phone_verification_service.PhoneVerificationService.verify_code')
    @patch('services.phone_verification_service.PhoneVerificationService.send_verification_code')
    def test_auth_workflow_authentication_failure(self, mock_send_code, mock_verify, mock_auth, client):
        """Test authentication workflow when user authentication fails."""
        phone_number = '13800138000'
        otp_code = '123456'

        # Step 1: Send OTP successfully
        mock_send_code.return_value = (True, None, "biz_123")

        send_response = client.post(
            '/api/auth/send-otp',
            json={'phone_number': phone_number},
            content_type='application/json'
        )

        assert send_response.status_code == 200

        # Step 2: OTP verification succeeds but authentication fails
        mock_verify.return_value = (True, None)
        mock_auth.return_value = (False, None, "Failed to create user account")

        verify_response = client.post(
            '/api/auth/verify-otp',
            json={
                'phone_number': phone_number,
                'otp_code': otp_code
            },
            content_type='application/json'
        )

        assert verify_response.status_code == 500
        verify_data = json.loads(verify_response.get_data(as_text=True))
        assert verify_data['status'] == 'error'
        assert 'Failed to create user account' in verify_data['message']

    def test_auth_workflow_malformed_requests(self, client):
        """Test authentication workflow with various malformed requests."""
        # Test invalid JSON
        response = client.post(
            '/api/auth/send-otp',
            data='invalid json',
            content_type='application/json'
        )
        assert response.status_code == 400

        # Test empty request body
        response = client.post(
            '/api/auth/send-otp',
            json={},
            content_type='application/json'
        )
        assert response.status_code == 400

        # Test missing content type
        response = client.post(
            '/api/auth/send-otp',
            data=json.dumps({'phone_number': '13800138000'})
        )
        assert response.status_code == 400

    def test_auth_workflow_basic_validation(self, client):
        """Test basic request validation in auth workflow."""
        # Test verify endpoint with missing fields
        response = client.post(
            '/api/auth/verify-otp',
            json={'phone_number': '13800138000'},
            content_type='application/json'
        )
        assert response.status_code == 400
        data = json.loads(response.get_data(as_text=True))
        assert data['status'] == 'error'
        assert 'otp_code' in data['message'] and 'required' in data['message']

        # Test empty phone number
        response = client.post(
            '/api/auth/send-otp',
            json={'phone_number': ''},
            content_type='application/json'
        )
        assert response.status_code == 400
        data = json.loads(response.get_data(as_text=True))
        assert data['status'] == 'error'
        assert 'phone_number cannot be empty' in data['message']