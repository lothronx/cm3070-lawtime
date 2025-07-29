#!/usr/bin/env python3
"""
Error handling tests for LawTime SMS OTP Authentication
Tests edge cases and error scenarios for better coverage.
"""

import pytest
import os
from unittest.mock import patch, Mock
from app import validate_environment, create_app


def test_missing_environment_variables():
    """Test environment validation with missing variables."""
    # Test missing SUPABASE_URL
    with patch.dict(
        "os.environ",
        {
            "SUPABASE_KEY": "test-key",
            "ALIBABA_DYSMS_ACCESS_KEY_ID": "test-id",
            "ALIBABA_DYSMS_ACCESS_KEY_SECRET": "test-secret",
        },
        clear=True,
    ):
        with pytest.raises(
            ValueError, match="Missing required environment variables: SUPABASE_URL"
        ):
            validate_environment()


def test_supabase_auth_failure():
    """Test Supabase authentication failure path."""
    # Clear rate limiting state for clean test
    from app import rate_limit_storage, otp_storage

    rate_limit_storage.clear()
    otp_storage.clear()

    with patch.dict(
        "os.environ",
        {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQ5NzI4MDAwfQ.test",
            "ALIBABA_DYSMS_ACCESS_KEY_ID": "test",
            "ALIBABA_DYSMS_ACCESS_KEY_SECRET": "test",
        },
    ):
        with patch("app.create_client") as mock_supabase, patch(
            "app.SMSService"
        ) as mock_sms:
            mock_client = Mock()
            mock_supabase.return_value = mock_client

            # Mock SMS success
            mock_sms_instance = Mock()
            mock_sms.return_value = mock_sms_instance
            mock_sms_instance.send_otp.return_value = (True, None)

            # Mock Supabase auth failure for new user creation
            mock_client.auth.sign_in_with_password.side_effect = Exception(
                "Auth failed"
            )
            mock_client.auth.sign_up.side_effect = Exception("Signup failed")

            app = create_app()
            app.config["TESTING"] = True
            client = app.test_client()

            # Send OTP first
            response = client.post(
                "/api/auth/send-otp", json={"phone_number": "18501052017"}
            )
            assert response.status_code == 200

            # Mock OTP generation for predictable verification
            with patch("app.generate_otp_code", return_value="123456"):
                # Send OTP again to store known code
                client.post("/api/auth/send-otp", json={"phone_number": "18501052017"})

                # Try to verify - should fail due to Supabase error
                response = client.post(
                    "/api/auth/verify-otp",
                    json={"phone_number": "18501052017", "otp_code": "123456"},
                )

                assert response.status_code == 500
                data = response.get_json()
                assert data["status"] == "error"
                assert "Failed to create user account" in data["message"]


def test_sms_service_initialization_failure():
    """Test SMS service initialization failure."""
    with patch.dict(
        "os.environ",
        {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQ5NzI4MDAwfQ.test",
            "ALIBABA_DYSMS_ACCESS_KEY_ID": "test",
            "ALIBABA_DYSMS_ACCESS_KEY_SECRET": "test",
        },
    ):
        with patch("app.create_client") as mock_supabase, patch(
            "app.SMSService"
        ) as mock_sms:
            mock_client = Mock()
            mock_supabase.return_value = mock_client

            # Mock SMS service initialization failure
            mock_sms.side_effect = Exception("SMS service failed to initialize")

            with pytest.raises(Exception, match="SMS service failed to initialize"):
                create_app()


@pytest.mark.skip(reason="Health check endpoint doesn't perform database operations")
def test_supabase_health_check_failure():
    """Test health check endpoint with Supabase failure."""
    # The current health check endpoint just returns plain text
    # and doesn't perform any database operations that could fail
    # This test is skipped until we implement a proper health check endpoint
    pass


if __name__ == "__main__":
    # Run with: python -m pytest tests/unit/test_error_handling.py -v
    pytest.main([__file__, "-v"])
