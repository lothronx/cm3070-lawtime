import os
import random
import string
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv

from flask import Flask, jsonify, request
from supabase import create_client, Client
from sms_service import SMSService

# Load environment variables from .env.local file
load_dotenv(".env.local")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory storage for OTP codes (use Redis or database in production)
otp_storage = {}
rate_limit_storage = {}


def validate_environment():
    """Validate that all required environment variables are present."""
    required_vars = [
        "SUPABASE_URL",
        "SUPABASE_KEY",
        "ALIBABA_DYSMS_ACCESS_KEY_ID",
        "ALIBABA_DYSMS_ACCESS_KEY_SECRET",
    ]

    missing_vars = []
    for var in required_vars:
        if not os.environ.get(var):
            missing_vars.append(var)

    if missing_vars:
        raise ValueError(
            f"Missing required environment variables: {', '.join(missing_vars)}"
        )


def generate_otp_code() -> str:
    """Generate a 6-digit OTP code."""
    return "".join(random.choices(string.digits, k=6))


def is_rate_limited(phone_number: str) -> bool:
    """Check if phone number has exceeded rate limit (5 attempts per hour)."""
    current_time = datetime.utcnow()
    phone_attempts = rate_limit_storage.get(phone_number, [])

    # Remove attempts older than 1 hour
    recent_attempts = [
        attempt_time
        for attempt_time in phone_attempts
        if current_time - attempt_time < timedelta(hours=1)
    ]

    # Update storage
    rate_limit_storage[phone_number] = recent_attempts

    return len(recent_attempts) >= 5


def add_rate_limit_attempt(phone_number: str):
    """Add a rate limit attempt for the phone number."""
    current_time = datetime.utcnow()
    if phone_number not in rate_limit_storage:
        rate_limit_storage[phone_number] = []
    rate_limit_storage[phone_number].append(current_time)


def store_otp(phone_number: str, otp_code: str):
    """Store OTP with 5-minute expiration."""
    expiry_time = datetime.utcnow() + timedelta(minutes=5)
    otp_storage[phone_number] = {"code": otp_code, "expires_at": expiry_time}


def verify_otp(phone_number: str, otp_code: str) -> bool:
    """Verify OTP code for phone number."""
    stored_otp = otp_storage.get(phone_number)
    if not stored_otp:
        return False

    # Check if OTP has expired
    if datetime.utcnow() > stored_otp["expires_at"]:
        del otp_storage[phone_number]
        return False

    # Check if OTP matches
    if stored_otp["code"] == otp_code:
        del otp_storage[phone_number]  # Remove OTP after successful verification
        return True

    return False


def create_app(test_config=None):
    # Validate environment on startup
    try:
        validate_environment()
        logger.info("Environment validation successful")
    except ValueError as e:
        logger.error(f"Environment validation failed: {e}")
        raise

    # create and configure the app
    app = Flask(__name__, instance_relative_config=True)

    # Initialize services
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_KEY")
    supabase: Client = create_client(url, key)

    try:
        sms_service = SMSService()
        logger.info("SMS service initialized successfully")
    except Exception as e:
        logger.error(f"SMS service initialization failed: {e}")
        raise

    # Health check endpoint
    @app.route("/")
    def hello():
        return "Yep, it's running"

    @app.route("/auth/send-otp", methods=["POST"])
    def send_otp():
        """Send OTP code to phone number."""
        try:
            # Validate request body
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
                    jsonify({"status": "error", "message": "phone_number is required"}),
                    400,
                )

            # Validate phone number format
            phone_number = phone_number.strip()
            if not phone_number:
                return (
                    jsonify(
                        {"status": "error", "message": "phone_number cannot be empty"}
                    ),
                    400,
                )

            # Check rate limiting
            if is_rate_limited(phone_number):
                return (
                    jsonify(
                        {
                            "status": "error",
                            "message": "Too many attempts. Please try again later.",
                        }
                    ),
                    429,
                )

            # Generate OTP code
            otp_code = generate_otp_code()

            # Send SMS
            success, error_message = sms_service.send_otp(phone_number, otp_code)

            if not success:
                # Still count as rate limit attempt even if SMS fails
                add_rate_limit_attempt(phone_number)
                return (
                    jsonify(
                        {
                            "status": "error",
                            "message": error_message or "Failed to send SMS",
                        }
                    ),
                    500,
                )

            # Store OTP and add rate limit attempt
            store_otp(phone_number, otp_code)
            add_rate_limit_attempt(phone_number)

            logger.info(f"OTP sent successfully to phone ending in {phone_number[-4:]}")

            return (
                jsonify(
                    {
                        "status": "success",
                        "message": "OTP sent successfully",
                        "expires_in_minutes": 5,
                    }
                ),
                200,
            )

        except Exception as e:
            logger.error(f"Send OTP error: {str(e)}")
            return jsonify({"status": "error", "message": "Internal server error"}), 500

    @app.route("/auth/verify-otp", methods=["POST"])
    def verify_otp_endpoint():
        """Verify OTP and return JWT token."""
        try:
            # Validate request body
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

            phone_number = phone_number.strip()
            otp_code = otp_code.strip()

            # Verify OTP
            if not verify_otp(phone_number, otp_code):
                return (
                    jsonify(
                        {"status": "error", "message": "Invalid or expired OTP code"}
                    ),
                    400,
                )

            # Create or authenticate user with Supabase
            try:
                # First, try to sign in with phone number (if user exists)
                try:
                    auth_response = supabase.auth.sign_in_with_password(
                        {
                            "email": f"{phone_number}@lawtime.temp",  # Using phone as unique identifier
                            "password": phone_number,  # Temporary approach for MVP
                        }
                    )

                    if auth_response.user:
                        logger.info(f"Existing user signed in: {auth_response.user.id}")
                        return (
                            jsonify(
                                {
                                    "status": "success",
                                    "message": "Authentication successful",
                                    "user": {
                                        "id": auth_response.user.id,
                                        "phone": phone_number,
                                    },
                                    "session": {
                                        "access_token": auth_response.session.access_token,
                                        "refresh_token": auth_response.session.refresh_token,
                                        "expires_at": auth_response.session.expires_at,
                                        "token_type": auth_response.session.token_type,
                                    },
                                }
                            ),
                            200,
                        )

                except Exception:
                    # User doesn't exist, create new user
                    try:
                        auth_response = supabase.auth.sign_up(
                            {
                                "email": f"{phone_number}@lawtime.temp",
                                "password": phone_number,
                                "options": {"data": {"phone": phone_number}},
                            }
                        )

                        if auth_response.user:
                            logger.info(f"New user created: {auth_response.user.id}")
                            return (
                                jsonify(
                                    {
                                        "status": "success",
                                        "message": "Account created and authenticated successfully",
                                        "user": {
                                            "id": auth_response.user.id,
                                            "phone": phone_number,
                                            "is_new_user": True,
                                        },
                                        "session": {
                                            "access_token": auth_response.session.access_token,
                                            "refresh_token": auth_response.session.refresh_token,
                                            "expires_at": auth_response.session.expires_at,
                                            "token_type": auth_response.session.token_type,
                                        },
                                    }
                                ),
                                200,
                            )
                        else:
                            return (
                                jsonify(
                                    {
                                        "status": "error",
                                        "message": "Failed to create user account",
                                    }
                                ),
                                500,
                            )

                    except Exception as create_error:
                        logger.error(f"User creation error: {str(create_error)}")
                        return (
                            jsonify(
                                {
                                    "status": "error",
                                    "message": "Failed to create user account",
                                }
                            ),
                            500,
                        )

            except Exception as auth_error:
                logger.error(f"Supabase authentication error: {str(auth_error)}")
                return (
                    jsonify(
                        {"status": "error", "message": "Authentication service error"}
                    ),
                    500,
                )

        except Exception as e:
            logger.error(f"Verify OTP error: {str(e)}")
            return jsonify({"status": "error", "message": "Internal server error"}), 500

    return app
