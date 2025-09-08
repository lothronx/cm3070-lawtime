"""Unit tests for auth_service.py"""

import pytest
from unittest.mock import Mock, MagicMock, patch
from services.auth_service import AuthService


class TestAuthService:
    """Test class for AuthService functionality."""

    @pytest.fixture
    def supabase_client_mock(self):
        """Mock Supabase client."""
        mock = Mock()
        mock.auth = Mock()
        return mock

    @pytest.fixture
    def auth_service(self, supabase_client_mock):
        """Create AuthService instance with mocked dependencies."""
        return AuthService(supabase_client_mock)

    @pytest.fixture
    def mock_auth_response(self):
        """Mock successful Supabase auth response."""
        response = Mock()
        response.user = Mock()
        response.session = Mock()
        
        # User data
        response.user.id = "user123"
        response.user.email = "13800138000@lawtime.temp"
        response.user.phone = "13800138000"
        response.user.created_at = "2024-01-01T00:00:00Z"
        
        # Session data
        response.session.access_token = "mock_access_token"
        response.session.refresh_token = "mock_refresh_token"
        response.session.expires_at = 1640995200
        response.session.token_type = "bearer"
        
        return response

    def test_init(self, supabase_client_mock):
        """Test AuthService initialization."""
        service = AuthService(supabase_client_mock)
        assert service.supabase == supabase_client_mock

    def test_authenticate_user_existing_user_success(self, auth_service, supabase_client_mock, mock_auth_response):
        """Test successful authentication of existing user."""
        phone = "13800138000"
        supabase_client_mock.auth.sign_in_with_password.return_value = mock_auth_response
        
        success, session_data, error = auth_service.authenticate_user(phone)
        
        assert success is True
        assert error is None
        assert session_data is not None
        assert session_data["is_new_user"] is False
        assert session_data["access_token"] == "mock_access_token"
        assert session_data["user"]["id"] == "user123"
        
        # Verify sign in was called with converted email
        supabase_client_mock.auth.sign_in_with_password.assert_called_once_with({
            "email": "13800138000@lawtime.temp",
            "password": phone
        })

    def test_authenticate_user_new_user_creation(self, auth_service, supabase_client_mock, mock_auth_response):
        """Test successful creation of new user."""
        phone = "13800138000"
        
        # First call (sign in) fails, second call (sign up) succeeds
        supabase_client_mock.auth.sign_in_with_password.side_effect = ValueError("User not found")
        supabase_client_mock.auth.sign_up.return_value = mock_auth_response
        
        success, session_data, error = auth_service.authenticate_user(phone)
        
        assert success is True
        assert error is None
        assert session_data is not None
        assert session_data["is_new_user"] is True
        assert session_data["access_token"] == "mock_access_token"
        
        # Verify both sign in and sign up were called
        supabase_client_mock.auth.sign_in_with_password.assert_called_once()
        supabase_client_mock.auth.sign_up.assert_called_once_with({
            "email": "13800138000@lawtime.temp",
            "password": phone,
            "options": {"data": {"phone": phone}}
        })

    def test_authenticate_user_both_methods_fail(self, auth_service, supabase_client_mock):
        """Test failure when both sign in and sign up fail."""
        phone = "13800138000"
        
        # Both methods fail
        supabase_client_mock.auth.sign_in_with_password.side_effect = ValueError("User not found")
        supabase_client_mock.auth.sign_up.side_effect = ValueError("Sign up failed")
        
        success, session_data, error = auth_service.authenticate_user(phone)
        
        assert success is False
        assert session_data is None
        assert error == "Failed to create user account"

    def test_authenticate_user_exception_handling(self, auth_service, supabase_client_mock):
        """Test exception handling in authenticate_user."""
        phone = "13800138000"

        # Both sign in and sign up fail normally (return None), leading to "Failed to create user account"
        supabase_client_mock.auth.sign_in_with_password.side_effect = ValueError("User not found")
        supabase_client_mock.auth.sign_up.side_effect = ValueError("Sign up failed")

        success, session_data, error = auth_service.authenticate_user(phone)

        assert success is False
        assert session_data is None
        assert error == "Failed to create user account"

    def test_authenticate_user_top_level_exception(self, auth_service, supabase_client_mock):
        """Test top-level exception handling in authenticate_user."""
        # Mock phone_number[-4:] to throw an exception (simulating unexpected error)
        with patch.object(auth_service, '_sign_in_existing_user', side_effect=KeyError("Unexpected error")):
            success, session_data, error = auth_service.authenticate_user("13800138000")

            assert success is False
            assert session_data is None
            assert error == "Authentication service error"

    def test_sign_in_existing_user_success(self, auth_service, supabase_client_mock, mock_auth_response):
        """Test _sign_in_existing_user success."""
        phone = "13800138000"
        supabase_client_mock.auth.sign_in_with_password.return_value = mock_auth_response
        
        result = auth_service._sign_in_existing_user(phone)
        
        assert result is not None
        assert result["access_token"] == "mock_access_token"
        assert result["user"]["id"] == "user123"

    def test_sign_in_existing_user_no_user(self, auth_service, supabase_client_mock):
        """Test _sign_in_existing_user when user doesn't exist."""
        phone = "13800138000"
        
        # Response with no user
        response = Mock()
        response.user = None
        response.session = None
        supabase_client_mock.auth.sign_in_with_password.return_value = response
        
        result = auth_service._sign_in_existing_user(phone)
        
        assert result is None

    def test_sign_in_existing_user_exception(self, auth_service, supabase_client_mock):
        """Test _sign_in_existing_user exception handling."""
        phone = "13800138000"
        supabase_client_mock.auth.sign_in_with_password.side_effect = ValueError("User not found")
        
        result = auth_service._sign_in_existing_user(phone)
        
        assert result is None

    def test_create_new_user_success(self, auth_service, supabase_client_mock, mock_auth_response):
        """Test _create_new_user success."""
        phone = "13800138000"
        supabase_client_mock.auth.sign_up.return_value = mock_auth_response
        
        result = auth_service._create_new_user(phone)
        
        assert result is not None
        assert result["access_token"] == "mock_access_token"
        assert result["user"]["phone"] == phone

    def test_create_new_user_no_response(self, auth_service, supabase_client_mock):
        """Test _create_new_user when response is empty."""
        phone = "13800138000"
        
        # Response with no user/session
        response = Mock()
        response.user = None
        response.session = None
        supabase_client_mock.auth.sign_up.return_value = response
        
        result = auth_service._create_new_user(phone)
        
        assert result is None

    def test_create_new_user_exception(self, auth_service, supabase_client_mock):
        """Test _create_new_user exception handling."""
        phone = "13800138000"
        supabase_client_mock.auth.sign_up.side_effect = RuntimeError("Creation failed")
        
        result = auth_service._create_new_user(phone)
        
        assert result is None

    def test_phone_to_email_conversion(self, auth_service):
        """Test phone number to email conversion."""
        phone = "13800138000"
        email = auth_service._phone_to_email(phone)
        assert email == "13800138000@lawtime.temp"

    def test_format_session_response(self, auth_service, mock_auth_response):
        """Test session response formatting."""
        formatted = auth_service._format_session_response(mock_auth_response)
        
        assert formatted["access_token"] == "mock_access_token"
        assert formatted["refresh_token"] == "mock_refresh_token"
        assert formatted["expires_at"] == 1640995200
        assert formatted["token_type"] == "bearer"
        assert formatted["user"]["id"] == "user123"
        assert formatted["user"]["email"] == "13800138000@lawtime.temp"
        assert formatted["user"]["phone"] == "13800138000"
        assert formatted["user"]["created_at"] == "2024-01-01T00:00:00Z"

    def test_format_session_response_empty_fields(self, auth_service):
        """Test session response formatting with empty email/phone."""
        response = Mock()
        response.user = Mock()
        response.session = Mock()
        
        response.user.id = "user123"
        response.user.email = None
        response.user.phone = None
        response.user.created_at = "2024-01-01T00:00:00Z"
        
        response.session.access_token = "token"
        response.session.refresh_token = "refresh"
        response.session.expires_at = 123456
        response.session.token_type = "bearer"
        
        formatted = auth_service._format_session_response(response)
        
        assert formatted["user"]["email"] == ""
        assert formatted["user"]["phone"] == ""

    def test_verify_token_success(self, auth_service, supabase_client_mock):
        """Test successful token verification."""
        token = "valid_token"
        
        # Mock successful verification
        user_response = Mock()
        user_response.user = Mock()
        user_response.user.id = "user123"
        user_response.user.email = "test@example.com"
        user_response.user.phone = "13800138000"
        
        supabase_client_mock.auth.get_user.return_value = user_response
        
        is_valid, user_data = auth_service.verify_token(token)
        
        assert is_valid is True
        assert user_data is not None
        assert user_data["id"] == "user123"
        assert user_data["email"] == "test@example.com"
        assert user_data["phone"] == "13800138000"
        
        supabase_client_mock.auth.get_user.assert_called_once_with(token)

    def test_verify_token_no_user(self, auth_service, supabase_client_mock):
        """Test token verification with no user."""
        token = "invalid_token"
        
        user_response = Mock()
        user_response.user = None
        supabase_client_mock.auth.get_user.return_value = user_response
        
        is_valid, user_data = auth_service.verify_token(token)
        
        assert is_valid is False
        assert user_data is None

    def test_verify_token_exception(self, auth_service, supabase_client_mock):
        """Test token verification exception handling."""
        token = "invalid_token"
        supabase_client_mock.auth.get_user.side_effect = ValueError("Invalid token")
        
        is_valid, user_data = auth_service.verify_token(token)
        
        assert is_valid is False
        assert user_data is None

    def test_verify_token_empty_fields(self, auth_service, supabase_client_mock):
        """Test token verification with empty email/phone fields."""
        token = "valid_token"
        
        user_response = Mock()
        user_response.user = Mock()
        user_response.user.id = "user123"
        user_response.user.email = None
        user_response.user.phone = None
        
        supabase_client_mock.auth.get_user.return_value = user_response
        
        is_valid, user_data = auth_service.verify_token(token)
        
        assert is_valid is True
        assert user_data["email"] == ""
        assert user_data["phone"] == ""

    def test_refresh_session_success(self, auth_service, supabase_client_mock, mock_auth_response):
        """Test successful session refresh."""
        refresh_token = "valid_refresh_token"
        supabase_client_mock.auth.refresh_session.return_value = mock_auth_response
        
        success, session_data, error = auth_service.refresh_session(refresh_token)
        
        assert success is True
        assert error is None
        assert session_data is not None
        assert session_data["access_token"] == "mock_access_token"
        
        supabase_client_mock.auth.refresh_session.assert_called_once_with(refresh_token)

    def test_refresh_session_no_session(self, auth_service, supabase_client_mock):
        """Test session refresh with no session returned."""
        refresh_token = "invalid_refresh_token"
        
        response = Mock()
        response.session = None
        supabase_client_mock.auth.refresh_session.return_value = response
        
        success, session_data, error = auth_service.refresh_session(refresh_token)
        
        assert success is False
        assert session_data is None
        assert error == "Failed to refresh session"

    def test_refresh_session_exception(self, auth_service, supabase_client_mock):
        """Test session refresh exception handling."""
        refresh_token = "invalid_refresh_token"
        supabase_client_mock.auth.refresh_session.side_effect = RuntimeError("Refresh failed")
        
        success, session_data, error = auth_service.refresh_session(refresh_token)
        
        assert success is False
        assert session_data is None
        assert error == "Session refresh error"

    def test_different_phone_number_formats(self, auth_service, supabase_client_mock, mock_auth_response):
        """Test authentication with different phone number formats."""
        test_cases = [
            "13800138000",
            "+8613800138000", 
            "86-138-0013-8000",
            " 138 0013 8000 "
        ]
        
        for phone in test_cases:
            supabase_client_mock.auth.sign_in_with_password.return_value = mock_auth_response
            
            success, session_data, error = auth_service.authenticate_user(phone)
            
            assert success is True
            assert session_data is not None
            # Should convert to consistent email format
            expected_email = f"{phone}@lawtime.temp"
            supabase_client_mock.auth.sign_in_with_password.assert_called_with({
                "email": expected_email,
                "password": phone
            })

    def test_phone_number_logging_privacy(self, auth_service, supabase_client_mock):
        """Test that full phone numbers are not logged (privacy)."""
        # Both sign in and sign up should fail for this test
        supabase_client_mock.auth.sign_in_with_password.side_effect = ValueError("Auth failed")
        supabase_client_mock.auth.sign_up.side_effect = ValueError("Sign up failed")

        # This should not raise an exception even with short phone number
        short_phone = "123"
        success, session_data, error = auth_service.authenticate_user(short_phone)

        assert success is False
        # Should handle short phone numbers gracefully in logging
        assert error == "Failed to create user account"

    def test_concurrent_user_creation_handling(self, auth_service, supabase_client_mock, mock_auth_response):
        """Test handling concurrent user creation scenarios."""
        phone = "13800138000"
        
        # Sign in fails first time, but succeeds on retry (user was created concurrently)
        supabase_client_mock.auth.sign_in_with_password.side_effect = [
            ValueError("User not found"),  # First call fails
        ]
        supabase_client_mock.auth.sign_up.return_value = mock_auth_response
        
        success, session_data, error = auth_service.authenticate_user(phone)
        
        assert success is True
        assert session_data["is_new_user"] is True