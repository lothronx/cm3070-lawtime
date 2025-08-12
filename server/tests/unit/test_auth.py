#!/usr/bin/env python3
"""
Simple tests for LawTime SMS OTP Authentication
Focus on core functionality with good coverage - perfect for undergrad project.
"""

import pytest
import json
import os
from unittest.mock import patch, Mock
from app import create_app, generate_otp_code, verify_otp, store_otp


# Simple test configuration
@pytest.fixture
def app():
    """Create test app with mocked external services."""
    with patch.dict(
        "os.environ",
        {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQ5NzI4MDAwfQ.test",
            "ALIBABA_DYSMS_ACCESS_KEY_ID": "test",
            "ALIBABA_DYSMS_ACCESS_KEY_SECRET": "test",
        },
    ):
        # Mock Supabase client
        with patch("app.create_client") as mock_supabase:
            mock_client = Mock()
            mock_supabase.return_value = mock_client

            # Mock health check
            mock_response = Mock()
            mock_response.data = []
            mock_response.count = 0
            mock_client.table.return_value.select.return_value.execute.return_value = (
                mock_response
            )

            # Mock auth response with JSON-serializable values
            auth_response = Mock()

            # Create user mock with proper string values
            user_mock = Mock()
            user_mock.id = "test-user-123"
            user_mock.email = "18501052017@lawtime.temp"
            user_mock.phone = "18501052017"
            user_mock.created_at = "2025-01-01T00:00:00.000Z"
            auth_response.user = user_mock

            # Create session mock with proper values
            session_mock = Mock()
            session_mock.access_token = "test-jwt-token"
            session_mock.refresh_token = "test-refresh-token"
            session_mock.expires_at = 1234567890
            session_mock.token_type = "bearer"
            auth_response.session = session_mock

            # Mock the user creation/update response to return a dict instead of Mock
            mock_user_response = Mock()
            mock_user_response.data = {"id": "test-user-123", "phone": "18501052017"}
            mock_client.table.return_value.upsert.return_value.execute.return_value = (
                mock_user_response
            )

            mock_client.auth.sign_in_with_password.return_value = auth_response

            # Mock SMS service
            with patch("app.SMSService") as mock_sms:
                mock_sms_instance = Mock()
                mock_sms.return_value = mock_sms_instance
                mock_sms_instance.send_otp.return_value = (True, None)

                app = create_app()
                app.config["TESTING"] = True
                return app


@pytest.fixture
def client(app):
    """Test client for API calls."""
    return app.test_client()


# === CORE FUNCTIONALITY TESTS ===


def test_otp_generation():
    """Test OTP generation works correctly."""
    otp = generate_otp_code()

    # Should be 6 digits
    assert len(otp) == 6
    assert otp.isdigit()
    # OTP can start with 0, so range is 000000-999999
    assert 0 <= int(otp) <= 999999


def test_otp_storage_and_verification():
    """Test OTP storage and verification logic."""
    phone = "18501052017"
    otp = "123456"

    # Store and verify
    store_otp(phone, otp)
    assert verify_otp(phone, otp) == True

    # Should be cleared after verification
    assert verify_otp(phone, otp) == False


def test_send_otp_endpoint_success(client):
    """Test successful OTP sending."""
    response = client.post("/api/auth/send-otp", json={"phone_number": "18501052017"})

    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert "expires_in_minutes" in data


def test_send_otp_missing_phone(client):
    """Test error when phone number is missing."""
    response = client.post("/api/auth/send-otp", json={})

    assert response.status_code == 400
    data = response.get_json()
    assert data["status"] == "error"
    assert "phone_number is required" in data["message"]


def test_verify_otp_success(client):
    """Test successful OTP verification."""
    phone = "18501052017"

    # Mock the OTP generation to return a predictable value
    with patch("app.generate_otp_code", return_value="123456"):
        # First send OTP
        response = client.post("/api/auth/send-otp", json={"phone_number": phone})
        assert response.status_code == 200

        # Then verify it
        response = client.post(
            "/api/auth/verify-otp", json={"phone_number": phone, "otp_code": "123456"}
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "success"
        assert "session" in data
        assert data["session"]["access_token"] == "test-jwt-token"


def test_verify_otp_invalid(client):
    """Test verification with invalid OTP."""
    response = client.post(
        "/api/auth/verify-otp",
        json={"phone_number": "18501052017", "otp_code": "999999"},
    )

    assert response.status_code == 400
    data = response.get_json()
    assert data["status"] == "error"
    assert "Invalid or expired" in data["message"]


def test_rate_limiting(client):
    """Test rate limiting prevents spam."""
    # Clear rate limit storage for clean test
    from app import rate_limit_storage

    rate_limit_storage.clear()

    phone = "18501052017"

    # Make 5 requests (should work)
    for i in range(5):
        response = client.post("/api/auth/send-otp", json={"phone_number": phone})
        assert response.status_code == 200

    # 6th request should be blocked
    response = client.post("/api/auth/send-otp", json={"phone_number": phone})
    assert response.status_code == 429
    data = response.get_json()
    assert "Too many attempts" in data["message"]


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/")
    assert response.status_code == 200

    # The health check returns plain text, not JSON
    data = response.get_data(as_text=True)
    assert "running" in data


if __name__ == "__main__":
    # Run with: python test_simple.py
    pytest.main([__file__, "-v"])
