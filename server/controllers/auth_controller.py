import logging
import json
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

            # ===== DEBUG: Print request JSON =====
            print("\n" + "="*50)
            print("🔵 POST /api/auth/send-otp")
            print("📥 REQUEST JSON:")
            print(json.dumps(data, indent=2))
            print("="*50)

            # Send verification code using managed service
            # (includes automatic rate limiting and code generation)
            success, error_message, _ = (
                self.phone_verification_service.send_verification_code(phone_number)
            )

            if not success:
                error_response = {
                    "status": "error",
                    "message": error_message or "Failed to send verification code",
                }
                status_code = 500 if "service" in (error_message or "").lower() else 429

                # ===== DEBUG: Print error response JSON =====
                print("📤 ERROR RESPONSE JSON:")
                print(json.dumps(error_response, indent=2))
                print(f"📊 STATUS CODE: {status_code}")
                print("="*50 + "\n")

                return jsonify(error_response), status_code

            logger.info(
                "Verification code sent successfully to phone ending in %s", phone_number[-4:]
            )

            success_response = {
                "status": "success",
                "message": "Verification code sent successfully",
                "expires_in_minutes": 5,  # Managed service default
            }

            # ===== DEBUG: Print success response JSON =====
            print("📤 SUCCESS RESPONSE JSON:")
            print(json.dumps(success_response, indent=2))
            print("📊 STATUS CODE: 200")
            print("="*50 + "\n")

            return jsonify(success_response), 200

        except (RuntimeError, ValueError, KeyError) as e:
            logger.error("Send OTP error: %s", str(e))
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

            # ===== DEBUG: Print request JSON =====
            print("\n" + "="*50)
            print("🔵 POST /api/auth/verify-otp")
            print("📥 REQUEST JSON:")
            print(json.dumps(data, indent=2))
            print("="*50)

            # Verify code using managed service
            is_valid, error_message = self.phone_verification_service.verify_code(
                phone_number, otp_code
            )
            if not is_valid:
                error_response = {
                    "status": "error",
                    "message": "Invalid or expired verification code",
                }

                # ===== DEBUG: Print error response JSON =====
                print("📤 ERROR RESPONSE JSON:")
                print(json.dumps(error_response, indent=2))
                print("📊 STATUS CODE: 400")
                print("="*50 + "\n")

                return jsonify(error_response), 400

            # Authenticate user with Supabase
            success, session_data, error_message = self.auth_service.authenticate_user(
                phone_number
            )

            if not success:
                error_response = {
                    "status": "error",
                    "message": error_message or "Authentication failed",
                }

                # ===== DEBUG: Print error response JSON =====
                print("📤 ERROR RESPONSE JSON:")
                print(json.dumps(error_response, indent=2))
                print("📊 STATUS CODE: 500")
                print("="*50 + "\n")

                return jsonify(error_response), 500

            # Determine if this was a new user or existing user
            is_new_user = session_data.get("is_new_user", False)
            message = (
                "Account created and authenticated successfully"
                if is_new_user
                else "Authentication successful"
            )

            success_response = {
                "status": "success",
                "message": message,
                "session": session_data,
            }

            # ===== DEBUG: Print success response JSON =====
            print("📤 SUCCESS RESPONSE JSON:")
            print(json.dumps(success_response, indent=2))
            print("📊 STATUS CODE: 200")
            print("="*50 + "\n")

            return jsonify(success_response), 200

        except (RuntimeError, ValueError, KeyError) as e:
            logger.error("Verify OTP error: %s", str(e))
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
        if not phone_number:
            return (
                jsonify({"status": "error", "message": "phone_number cannot be empty"}),
                400,
            )
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
