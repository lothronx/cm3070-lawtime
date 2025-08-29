import logging
from flask import Flask
from supabase import create_client, Client

from config import Config, setup_logging
from services import AuthService, PhoneVerificationService
from controllers import AuthController

logger = logging.getLogger(__name__)


def create_app(test_config=None):
    """Create and configure Flask application with dependency injection.

    Args:
        test_config: Optional test configuration override

    Returns:
        Configured Flask application instance
    """
    # Initialize configuration
    try:
        config = Config()
        setup_logging(config)
        logger.info("Configuration and logging initialized successfully")
    except ValueError as e:
        logger.error(f"Configuration initialization failed: {e}")
        raise

    # Create and configure the app
    app = Flask(__name__, instance_relative_config=True)

    if test_config:
        app.config.update(test_config)

    # Initialize external services
    supabase: Client = create_client(config.supabase_url, config.supabase_anon_key)

    try:
        phone_verification_service = PhoneVerificationService(config)
        logger.info("Phone verification service initialized successfully")
    except Exception as e:
        logger.error(f"Phone verification service initialization failed: {e}")
        raise

    # Initialize business services
    auth_service = AuthService(supabase)

    # Initialize controllers with simplified dependencies
    auth_controller = AuthController(
        auth_service=auth_service,
        phone_verification_service=phone_verification_service,
    )

    # Health check endpoint
    @app.route("/")
    def hello():
        return "Yep, it's running"

    # Authentication routes
    @app.route("/api/auth/send-otp", methods=["POST"])
    def send_otp_route():
        """Send OTP code to phone number."""
        return auth_controller.send_otp()

    @app.route("/api/auth/verify-otp", methods=["POST"])
    def verify_otp_route():
        """Verify OTP and return JWT token."""
        return auth_controller.verify_otp()

    return app
