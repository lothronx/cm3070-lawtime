"""Unit tests for auth_controller.py"""

import json
import pytest
from unittest.mock import Mock, patch, MagicMock
from flask import Flask, request
from controllers.auth_controller import AuthController


class TestAuthController:
    """Test class for AuthController functionality."""

    @pytest.fixture
    def app(self):
        """Create Flask app for testing."""
        app = Flask(__name__)
        app.config['TESTING'] = True
        return app

    @pytest.fixture
    def auth_service_mock(self):
        """Mock AuthService."""
        return Mock()

    @pytest.fixture
    def phone_verification_service_mock(self):
        """Mock PhoneVerificationService."""
        return Mock()

    @pytest.fixture
    def auth_controller(self, auth_service_mock, phone_verification_service_mock):
        """Create AuthController instance with mocked dependencies."""
        return AuthController(auth_service_mock, phone_verification_service_mock)

    def test_init(self, auth_service_mock, phone_verification_service_mock):
        """Test AuthController initialization."""
        controller = AuthController(auth_service_mock, phone_verification_service_mock)
        
        assert controller.auth_service == auth_service_mock
        assert controller.phone_verification_service == phone_verification_service_mock

    def test_send_otp_success(self, app, auth_controller, phone_verification_service_mock):
        """Test successful OTP sending."""
        with app.test_request_context(
            '/api/auth/send-otp',
            method='POST',
            json={'phone_number': '+1234567890'},
            content_type='application/json'
        ):
            phone_verification_service_mock.send_verification_code.return_value = (
                True, None, None
            )
            
            response, status_code = auth_controller.send_otp()
            
            assert status_code == 200
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['status'] == 'success'
            assert response_data['message'] == 'Verification code sent successfully'
            assert response_data['expires_in_minutes'] == 5
            
            phone_verification_service_mock.send_verification_code.assert_called_once_with('+1234567890')

    def test_send_otp_invalid_json(self, app, auth_controller):
        """Test send OTP with invalid JSON content type."""
        with app.test_request_context(
            '/api/auth/send-otp',
            method='POST',
            data='invalid',
            content_type='text/plain'
        ):
            response, status_code = auth_controller.send_otp()
            
            assert status_code == 400
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['status'] == 'error'
            assert 'Content-Type must be application/json' in response_data['message']

    def test_send_otp_missing_phone_number(self, app, auth_controller):
        """Test send OTP with missing phone number."""
        with app.test_request_context(
            '/api/auth/send-otp',
            method='POST',
            json={},
            content_type='application/json'
        ):
            response, status_code = auth_controller.send_otp()
            
            assert status_code == 400
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['status'] == 'error'
            assert 'phone_number cannot be empty' in response_data['message']

    def test_send_otp_empty_phone_number(self, app, auth_controller):
        """Test send OTP with empty phone number."""
        with app.test_request_context(
            '/api/auth/send-otp',
            method='POST',
            json={'phone_number': '   '},
            content_type='application/json'
        ):
            response, status_code = auth_controller.send_otp()
            
            assert status_code == 400
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['status'] == 'error'
            assert 'phone_number cannot be empty' in response_data['message']

    def test_send_otp_service_failure_rate_limit(self, app, auth_controller, phone_verification_service_mock):
        """Test OTP sending with rate limit error."""
        with app.test_request_context(
            '/api/auth/send-otp',
            method='POST',
            json={'phone_number': '+1234567890'},
            content_type='application/json'
        ):
            phone_verification_service_mock.send_verification_code.return_value = (
                False, "Rate limit exceeded", None
            )
            
            response, status_code = auth_controller.send_otp()
            
            assert status_code == 429
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['status'] == 'error'
            assert response_data['message'] == 'Rate limit exceeded'

    def test_send_otp_service_failure_server_error(self, app, auth_controller, phone_verification_service_mock):
        """Test OTP sending with service error."""
        with app.test_request_context(
            '/api/auth/send-otp',
            method='POST',
            json={'phone_number': '+1234567890'},
            content_type='application/json'
        ):
            phone_verification_service_mock.send_verification_code.return_value = (
                False, "Service unavailable", None
            )
            
            response, status_code = auth_controller.send_otp()
            
            assert status_code == 500
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['status'] == 'error'
            assert response_data['message'] == 'Service unavailable'

    def test_send_otp_exception_handling(self, app, auth_controller, phone_verification_service_mock):
        """Test OTP sending with exception."""
        with app.test_request_context(
            '/api/auth/send-otp',
            method='POST',
            json={'phone_number': '+1234567890'},
            content_type='application/json'
        ):
            phone_verification_service_mock.send_verification_code.side_effect = RuntimeError("Test error")
            
            response, status_code = auth_controller.send_otp()
            
            assert status_code == 500
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['status'] == 'error'
            assert response_data['message'] == 'Internal server error'

    def test_verify_otp_success_new_user(self, app, auth_controller, phone_verification_service_mock, auth_service_mock):
        """Test successful OTP verification for new user."""
        with app.test_request_context(
            '/api/auth/verify-otp',
            method='POST',
            json={'phone_number': '+1234567890', 'otp_code': '123456'},
            content_type='application/json'
        ):
            phone_verification_service_mock.verify_code.return_value = (True, None)
            auth_service_mock.authenticate_user.return_value = (
                True,
                {
                    'access_token': 'test_token',
                    'user_id': 'user123',
                    'is_new_user': True
                },
                None
            )
            
            response, status_code = auth_controller.verify_otp()
            
            assert status_code == 200
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['status'] == 'success'
            assert 'Account created and authenticated successfully' in response_data['message']
            assert response_data['session']['access_token'] == 'test_token'
            assert response_data['session']['user_id'] == 'user123'
            
            phone_verification_service_mock.verify_code.assert_called_once_with('+1234567890', '123456')
            auth_service_mock.authenticate_user.assert_called_once_with('+1234567890')

    def test_verify_otp_success_existing_user(self, app, auth_controller, phone_verification_service_mock, auth_service_mock):
        """Test successful OTP verification for existing user."""
        with app.test_request_context(
            '/api/auth/verify-otp',
            method='POST',
            json={'phone_number': '+1234567890', 'otp_code': '123456'},
            content_type='application/json'
        ):
            phone_verification_service_mock.verify_code.return_value = (True, None)
            auth_service_mock.authenticate_user.return_value = (
                True,
                {
                    'access_token': 'test_token',
                    'user_id': 'user123',
                    'is_new_user': False
                },
                None
            )
            
            response, status_code = auth_controller.verify_otp()
            
            assert status_code == 200
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['status'] == 'success'
            assert response_data['message'] == 'Authentication successful'
            assert response_data['session']['access_token'] == 'test_token'

    def test_verify_otp_invalid_json(self, app, auth_controller):
        """Test verify OTP with invalid JSON content type."""
        with app.test_request_context(
            '/api/auth/verify-otp',
            method='POST',
            data='invalid',
            content_type='text/plain'
        ):
            response, status_code = auth_controller.verify_otp()
            
            assert status_code == 400
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['status'] == 'error'
            assert 'Content-Type must be application/json' in response_data['message']

    def test_verify_otp_missing_fields(self, app, auth_controller):
        """Test verify OTP with missing required fields."""
        with app.test_request_context(
            '/api/auth/verify-otp',
            method='POST',
            json={'phone_number': '+1234567890'},
            content_type='application/json'
        ):
            response, status_code = auth_controller.verify_otp()
            
            assert status_code == 400
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['status'] == 'error'
            assert 'phone_number and otp_code are required' in response_data['message']

    def test_verify_otp_invalid_code(self, app, auth_controller, phone_verification_service_mock):
        """Test verify OTP with invalid verification code."""
        with app.test_request_context(
            '/api/auth/verify-otp',
            method='POST',
            json={'phone_number': '+1234567890', 'otp_code': '123456'},
            content_type='application/json'
        ):
            phone_verification_service_mock.verify_code.return_value = (False, "Invalid code")
            
            response, status_code = auth_controller.verify_otp()
            
            assert status_code == 400
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['status'] == 'error'
            assert 'Invalid or expired verification code' in response_data['message']

    def test_verify_otp_auth_service_failure(self, app, auth_controller, phone_verification_service_mock, auth_service_mock):
        """Test verify OTP with authentication service failure."""
        with app.test_request_context(
            '/api/auth/verify-otp',
            method='POST',
            json={'phone_number': '+1234567890', 'otp_code': '123456'},
            content_type='application/json'
        ):
            phone_verification_service_mock.verify_code.return_value = (True, None)
            auth_service_mock.authenticate_user.return_value = (
                False, None, "Database connection failed"
            )
            
            response, status_code = auth_controller.verify_otp()
            
            assert status_code == 500
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['status'] == 'error'
            assert response_data['message'] == 'Database connection failed'

    def test_verify_otp_exception_handling(self, app, auth_controller, phone_verification_service_mock):
        """Test verify OTP with exception."""
        with app.test_request_context(
            '/api/auth/verify-otp',
            method='POST',
            json={'phone_number': '+1234567890', 'otp_code': '123456'},
            content_type='application/json'
        ):
            phone_verification_service_mock.verify_code.side_effect = ValueError("Test error")
            
            response, status_code = auth_controller.verify_otp()
            
            assert status_code == 500
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['status'] == 'error'
            assert response_data['message'] == 'Internal server error'

    def test_validate_send_otp_request_valid(self, app, auth_controller):
        """Test _validate_send_otp_request with valid input."""
        with app.test_request_context(
            '/api/auth/send-otp',
            method='POST',
            json={'phone_number': '+1234567890'},
            content_type='application/json'
        ):
            result = auth_controller._validate_send_otp_request()
            assert result is None

    def test_validate_send_otp_request_invalid_content_type(self, app, auth_controller):
        """Test _validate_send_otp_request with invalid content type."""
        with app.test_request_context(
            '/api/auth/send-otp',
            method='POST',
            data='test',
            content_type='text/plain'
        ):
            response, status_code = auth_controller._validate_send_otp_request()
            
            assert status_code == 400
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['status'] == 'error'
            assert 'Content-Type must be application/json' in response_data['message']

    def test_validate_send_otp_request_missing_phone_number(self, app, auth_controller):
        """Test _validate_send_otp_request with missing phone number."""
        with app.test_request_context(
            '/api/auth/send-otp',
            method='POST',
            json={},
            content_type='application/json'
        ):
            response, status_code = auth_controller._validate_send_otp_request()
            
            assert status_code == 400
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['status'] == 'error'
            assert 'phone_number cannot be empty' in response_data['message']

    def test_validate_verify_otp_request_valid(self, app, auth_controller):
        """Test _validate_verify_otp_request with valid input."""
        with app.test_request_context(
            '/api/auth/verify-otp',
            method='POST',
            json={'phone_number': '+1234567890', 'otp_code': '123456'},
            content_type='application/json'
        ):
            result = auth_controller._validate_verify_otp_request()
            assert result is None

    def test_validate_verify_otp_request_invalid_content_type(self, app, auth_controller):
        """Test _validate_verify_otp_request with invalid content type."""
        with app.test_request_context(
            '/api/auth/verify-otp',
            method='POST',
            data='test',
            content_type='text/plain'
        ):
            response, status_code = auth_controller._validate_verify_otp_request()
            
            assert status_code == 400
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['status'] == 'error'
            assert 'Content-Type must be application/json' in response_data['message']

    def test_validate_verify_otp_request_missing_fields(self, app, auth_controller):
        """Test _validate_verify_otp_request with missing required fields."""
        with app.test_request_context(
            '/api/auth/verify-otp',
            method='POST',
            json={'phone_number': '+1234567890'},
            content_type='application/json'
        ):
            response, status_code = auth_controller._validate_verify_otp_request()
            
            assert status_code == 400
            response_data = json.loads(response.get_data(as_text=True))
            assert response_data['status'] == 'error'
            assert 'phone_number and otp_code are required' in response_data['message']

    def test_phone_number_trimming(self, app, auth_controller, phone_verification_service_mock):
        """Test that phone numbers are properly trimmed."""
        with app.test_request_context(
            '/api/auth/send-otp',
            method='POST',
            json={'phone_number': '  +1234567890  '},
            content_type='application/json'
        ):
            phone_verification_service_mock.send_verification_code.return_value = (
                True, None, None
            )
            
            response, status_code = auth_controller.send_otp()
            
            assert status_code == 200
            phone_verification_service_mock.send_verification_code.assert_called_once_with('+1234567890')

    def test_otp_code_trimming(self, app, auth_controller, phone_verification_service_mock, auth_service_mock):
        """Test that OTP codes are properly trimmed."""
        with app.test_request_context(
            '/api/auth/verify-otp',
            method='POST',
            json={'phone_number': '+1234567890', 'otp_code': '  123456  '},
            content_type='application/json'
        ):
            phone_verification_service_mock.verify_code.return_value = (True, None)
            auth_service_mock.authenticate_user.return_value = (
                True, {'access_token': 'test_token', 'is_new_user': False}, None
            )
            
            response, status_code = auth_controller.verify_otp()
            
            assert status_code == 200
            phone_verification_service_mock.verify_code.assert_called_once_with('+1234567890', '123456')