import logging
from flask import jsonify, request, Response
from typing import Tuple

from services import AuthService, PhoneVerificationService

logger = logging.getLogger(__name__)


class AuthController:
    """Controller for handling authentication HTTP endpoints."""

    def __init__(
        self,
        auth_service: AuthService,
        phone_verification_service: PhoneVerificationService,
    ):
        """Initialize authentication controller.

        Args:
            auth_service: Authentication service instance
            phone_verification_service: Phone verification service instance
        """
        self.auth_service = auth_service
        self.phone_verification_service = phone_verification_service

    def send_otp(self) -> Tuple[Response, int]:
        """Handle POST /api/auth/send-otp endpoint.

        Returns:
            Tuple of (Flask response, HTTP status code)
        """
        try:
            # Validate request
            validation_error = self._validate_send_otp_request()
            if validation_error:
                return validation_error

            data = request.get_json()
            phone_number = data.get("phone_number", "").strip()

            # Send verification code using managed service
            # (includes automatic rate limiting and code generation)
            success, error_message, biz_id = (
                self.phone_verification_service.send_verification_code(phone_number)
            )

            if not success:
                return (
                    jsonify(
                        {
                            "status": "error",
                            "message": error_message
                            or "Failed to send verification code",
                        }
                    ),
                    500 if "service" in (error_message or "").lower() else 429,
                )

            logger.info(
                f"Verification code sent successfully to phone ending in {phone_number[-4:]}"
            )

            return (
                jsonify(
                    {
                        "status": "success",
                        "message": "Verification code sent successfully",
                        "expires_in_minutes": 5,  # Managed service default
                    }
                ),
                200,
            )

        except Exception as e:
            logger.error(f"Send OTP error: {str(e)}")
            return jsonify({"status": "error", "message": "Internal server error"}), 500

    def verify_otp(self) -> Tuple[Response, int]:
        """Handle POST /api/auth/verify-otp endpoint.

        Returns:
            Tuple of (Flask response, HTTP status code)
        """
        try:
            # Validate request
            validation_error = self._validate_verify_otp_request()
            if validation_error:
                return validation_error

            data = request.get_json()
            phone_number = data.get("phone_number", "").strip()
            otp_code = data.get("otp_code", "").strip()

            # Verify code using managed service
            is_valid, error_message = self.phone_verification_service.verify_code(
                phone_number, otp_code
            )
            if not is_valid:
                return (
                    jsonify(
                        {
                            "status": "error",
                            "message": "Invalid or expired verification code",
                        }
                    ),
                    400,
                )

            # Authenticate user with Supabase
            success, session_data, error_message = self.auth_service.authenticate_user(
                phone_number
            )

            if not success:
                return (
                    jsonify(
                        {
                            "status": "error",
                            "message": error_message or "Authentication failed",
                        }
                    ),
                    500,
                )

            # Determine if this was a new user or existing user
            is_new_user = session_data.get("is_new_user", False)
            message = (
                "Account created and authenticated successfully"
                if is_new_user
                else "Authentication successful"
            )

            return (
                jsonify(
                    {
                        "status": "success",
                        "message": message,
                        "session": session_data,
                    }
                ),
                200,
            )

        except Exception as e:
            logger.error(f"Verify OTP error: {str(e)}")
            return jsonify({"status": "error", "message": "Internal server error"}), 500

    def _validate_send_otp_request(self) -> Tuple[Response, int]:
        """Validate send OTP request.

        Returns:
            Error response tuple if validation fails, None if valid
        """
        if not request.is_json:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Content-Type must be application/json",
                    }
                ),
                400,
            )

        data = request.get_json()

        phone_number = data.get("phone_number")
        phone_number = phone_number.strip()
        if not phone_number:
            return (
                jsonify({"status": "error", "message": "phone_number cannot be empty"}),
                400,
            )

        return None

    def _validate_verify_otp_request(self) -> Tuple[Response, int]:
        """Validate verify OTP request.

        Returns:
            Error response tuple if validation fails, None if valid
        """
        if not request.is_json:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Content-Type must be application/json",
                    }
                ),
                400,
            )

        data = request.get_json()

        phone_number = data.get("phone_number")
        otp_code = data.get("otp_code")

        if not phone_number or not otp_code:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "phone_number and otp_code are required",
                    }
                ),
                400,
            )

        return None
