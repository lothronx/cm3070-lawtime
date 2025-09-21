import logging
from datetime import datetime
from typing import Dict, Optional, Tuple, Any
from supabase import Client

logger = logging.getLogger(__name__)


class AuthService:
    """Service for handling authentication operations with Supabase."""

    def __init__(self, supabase_client: Client):
        """Initialize authentication service.

        Args:
            supabase_client: Configured Supabase client instance
        """
        self.supabase = supabase_client

    def authenticate_user(
        self, phone_number: str
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """Authenticate or create user with phone number.

        Args:
            phone_number: Phone number to authenticate

        Returns:
            Tuple of (success, session_data, error_message)
        """
        try:
            # First, try to sign in existing user
            session_data = self._sign_in_existing_user(phone_number)
            if session_data:
                logger.info(
                    "Existing user authenticated for phone ending in %s", phone_number[-4:]
                )
                session_data["is_new_user"] = False
                return True, session_data, None

            # User doesn't exist, create new user
            session_data = self._create_new_user(phone_number)
            if session_data:
                logger.info("New user created for phone ending in %s", phone_number[-4:])
                session_data["is_new_user"] = True
                return True, session_data, None

            return False, None, "Failed to create user account"

        except (RuntimeError, ValueError, KeyError) as e:
            logger.error(
                "Authentication error for phone ending in %s: %s", phone_number[-4:], str(e)
            )
            return False, None, "Authentication service error"

    def _sign_in_existing_user(self, phone_number: str) -> Optional[Dict]:
        """Attempt to sign in existing user.

        Args:
            phone_number: Phone number to sign in

        Returns:
            Session data if successful, None if user doesn't exist
        """
        try:
            email = self._phone_to_email(phone_number)
            auth_response = self.supabase.auth.sign_in_with_password(
                {
                    "email": email,
                    "password": phone_number,  # Temporary approach for MVP
                }
            )

            if auth_response.user and auth_response.session:
                return self._format_session_response(auth_response)

            return None

        except (RuntimeError, ValueError, KeyError):
            # User doesn't exist or other auth error
            return None

    def _create_new_user(self, phone_number: str) -> Optional[Dict]:
        """Create new user account.

        Args:
            phone_number: Phone number for new user

        Returns:
            Session data if successful, None if creation failed
        """
        try:
            email = self._phone_to_email(phone_number)
            auth_response = self.supabase.auth.sign_up(
                {
                    "email": email,
                    "password": phone_number,  # Temporary approach for MVP
                    "options": {"data": {"phone": phone_number}},
                }
            )

            if auth_response.user and auth_response.session:
                return self._format_session_response(auth_response)

            return None

        except (RuntimeError, ValueError, KeyError) as e:
            logger.error(
                "User creation failed for phone ending in %s: %s", phone_number[-4:], str(e)
            )
            return None

    def _phone_to_email(self, phone_number: str) -> str:
        """Convert phone number to email format for Supabase.

        Args:
            phone_number: Phone number to convert

        Returns:
            Email address format using phone number
        """
        return f"{phone_number}@lawtime.temp"

    def _format_session_response(self, auth_response: Any) -> Dict:
        """Format Supabase auth response into standardized session data.

        Args:
            auth_response: Supabase authentication response

        Returns:
            Formatted session data dictionary
        """
        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "expires_at": self._format_timestamp(auth_response.session.expires_at),
            "token_type": auth_response.session.token_type,
            "user": {
                "id": auth_response.user.id,
                "email": auth_response.user.email or "",
                "phone": auth_response.user.phone or "",
                "created_at": self._format_timestamp(auth_response.user.created_at),
            },
        }

    def _format_timestamp(self, timestamp: Any) -> Optional[str]:
        """Convert timestamp to ISO format string.

        Args:
            timestamp: Timestamp value (can be datetime, int, or None)

        Returns:
            ISO format string or None
        """
        if timestamp is None:
            return None

        if isinstance(timestamp, datetime):
            return timestamp.isoformat()

        if isinstance(timestamp, (int, float)):
            return datetime.fromtimestamp(timestamp).isoformat()

        # If it's already a string, return as-is
        if isinstance(timestamp, str):
            return timestamp

        return None

    def verify_token(self, token: str) -> Tuple[bool, Optional[Dict]]:
        """Verify JWT token and return user data.

        Args:
            token: JWT token to verify

        Returns:
            Tuple of (is_valid, user_data)
        """
        try:
            user = self.supabase.auth.get_user(token)
            if user.user:
                return True, {
                    "id": user.user.id,
                    "email": user.user.email or "",
                    "phone": user.user.phone or "",
                }
            return False, None
        except (RuntimeError, ValueError, KeyError) as e:
            logger.error("Token verification failed: %s", str(e))
            return False, None

    def refresh_session(
        self, refresh_token: str
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """Refresh user session using refresh token.

        Args:
            refresh_token: Refresh token to use

        Returns:
            Tuple of (success, new_session_data, error_message)
        """
        try:
            auth_response = self.supabase.auth.refresh_session(refresh_token)
            if auth_response.session:
                session_data = self._format_session_response(auth_response)
                logger.info("Session refreshed successfully")
                return True, session_data, None

            return False, None, "Failed to refresh session"

        except (RuntimeError, ValueError, KeyError) as e:
            logger.error("Session refresh failed: %s", str(e))
            return False, None, "Session refresh error"
