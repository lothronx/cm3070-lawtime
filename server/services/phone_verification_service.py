import logging
from typing import Optional, Tuple
from alibabacloud_dypnsapi20170525.client import Client as DypnsapiClient
from alibabacloud_credentials.client import Client as CredentialClient
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_dypnsapi20170525 import models as dypnsapi_models
from alibabacloud_tea_util import models as util_models

from config import Config

logger = logging.getLogger(__name__)


class PhoneVerificationService:
    """
    Alibaba Cloud Phone Number Verification Service.

    Provides managed SMS verification code sending and validation using
    Alibaba's server-side verification system. This eliminates the need
    for manual OTP generation, storage, and rate limiting.
    """

    def __init__(self, config: Config):
        """Initialize phone verification service with configuration.

        Args:
            config: Configuration instance with verification credentials and settings
        """
        self.config = config

    def _create_client(self) -> DypnsapiClient:
        """Create and configure Alibaba Cloud phone verification client.

        Returns:
            Configured phone verification client
        """
        # Use credential client that reads from environment variables
        credential = CredentialClient()

        api_config = open_api_models.Config(credential=credential)
        api_config.endpoint = "dypnsapi.aliyuncs.com"

        return DypnsapiClient(api_config)

    def send_verification_code(
        self,
        phone_number: str,
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Send verification code using Alibaba's managed service.

        Args:
            phone_number: Target phone number (Chinese format)

        Returns:
            Tuple of (success: bool, error_message: Optional[str], biz_id: Optional[str])
        """
        try:
            # Validate phone number format
            if not self._is_valid_phone_number(phone_number):
                return False, "Invalid phone number format", None

            # Clean phone number
            clean_phone = self._clean_phone_number(phone_number)

            # Configs
            sign_name = self.config.sms_sign_name
            template_code = self.config.sms_template_code
            template_param = self.config.sms_template_param

            client = self._create_client()
            request = dypnsapi_models.SendSmsVerifyCodeRequest(
                country_code="86",  # Chinese phone numbers
                phone_number=clean_phone,
                sign_name=sign_name,
                template_code=template_code,
                template_param=template_param,
                code_length=6,
            )

            runtime = util_models.RuntimeOptions()
            response = client.send_sms_verify_code_with_options(request, runtime)

            if response.body.code == "OK" and response.body.success:
                logger.info(
                    "Verification code sent successfully to phone ending in %s", clean_phone[-4:]
                )
                return True, None, response.body.model.biz_id
            else:
                error_msg = response.body.message or "Unknown error"
                logger.error("Verification code send failed: %s", error_msg)
                return (
                    False,
                    self._handle_send_error(response.body.code, error_msg),
                    None,
                )

        except (RuntimeError, ValueError, KeyError) as error:
            error_message = self._extract_error_message(error)
            logger.error("Verification code send exception: %s", error_message)
            return False, self._handle_send_error("EXCEPTION", error_message), None

    def verify_code(
        self, phone_number: str, verify_code: str
    ) -> Tuple[bool, Optional[str]]:
        """Verify code using Alibaba's validation service.

        Args:
            phone_number: Phone number that received the code
            verify_code: Code to verify

        Returns:
            Tuple of (is_valid: bool, error_message: Optional[str])
        """
        try:
            # Validate phone number format
            if not self._is_valid_phone_number(phone_number):
                return False, "Invalid phone number format"

            # Clean phone number
            clean_phone = self._clean_phone_number(phone_number)

            client = self._create_client()
            request = dypnsapi_models.CheckSmsVerifyCodeRequest(
                phone_number=clean_phone,
                verify_code=verify_code.strip(),
            )

            runtime = util_models.RuntimeOptions()
            response = client.check_sms_verify_code_with_options(request, runtime)

            if response.body.code == "OK" and response.body.success:
                is_valid = response.body.model.verify_result == "PASS"
                if is_valid:
                    logger.info(
                        "Verification code validated successfully for phone ending in %s", clean_phone[-4:]
                    )
                else:
                    logger.warning(
                        "Verification code validation failed for phone ending in %s", clean_phone[-4:]
                    )
                return is_valid, None
            else:
                error_msg = response.body.message or "Unknown error"
                logger.error("Verification check failed: %s", error_msg)
                return False, self._handle_verify_error(response.body.code, error_msg)

        except (RuntimeError, ValueError, KeyError) as error:
            error_message = self._extract_error_message(error)
            logger.error("Verification check exception: %s", error_message)
            return False, self._handle_verify_error("EXCEPTION", error_message)

    def _handle_send_error(self, error_code: str, error_message: str) -> str:
        """Handle verification code send errors and return user-friendly messages.

        Args:
            error_code: Error code from API
            error_message: Raw error message

        Returns:
            User-friendly error message
        """
        error_mappings = {
            "MOBILE_NUMBER_ILLEGAL": "Invalid phone number format",
            "BUSINESS_LIMIT_CONTROL": "Daily limit exceeded. Please try again tomorrow",
            "FREQUENCY_FAIL": "Please wait before requesting another code",
            "INVALID_PARAMETERS": "Invalid request parameters",
            "FUNCTION_NOT_OPENED": "Phone verification service not enabled",
        }

        for code, message in error_mappings.items():
            if code in error_code or code in error_message:
                return message

        return "SMS service temporarily unavailable"

    def _handle_verify_error(self, error_code: str, error_message: str) -> str:
        """Handle verification code check errors and return user-friendly messages.

        Args:
            error_code: Error code from API
            error_message: Raw error message

        Returns:
            User-friendly error message
        """
        if "INVALID_PARAMETERS" in error_code or "INVALID_PARAMETERS" in error_message:
            return "Invalid verification code format"
        elif (
            "FUNCTION_NOT_OPENED" in error_code
            or "FUNCTION_NOT_OPENED" in error_message
        ):
            return "Phone verification service not available"
        else:
            return "Verification service temporarily unavailable"

    def _extract_error_message(self, error: Exception) -> str:
        """Extract error message from exception.

        Args:
            error: Exception object

        Returns:
            Error message string
        """
        if hasattr(error, "message"):
            return str(error.message)
        elif hasattr(error, "data") and isinstance(error.data, dict):
            return error.data.get("Message", str(error))
        else:
            return str(error)

    def _is_valid_phone_number(self, phone_number: str) -> bool:
        """Validate Chinese mobile phone number format.

        Args:
            phone_number: Phone number to validate

        Returns:
            True if valid format, False otherwise
        """
        clean_phone = phone_number.replace(" ", "").replace("-", "").replace("+", "")

        # Chinese mobile numbers: 11 digits starting with 1
        if (
            len(clean_phone) == 11
            and clean_phone.startswith("1")
            and clean_phone.isdigit()
        ):
            return True

        # International format with 86 prefix
        if (
            len(clean_phone) == 13
            and clean_phone.startswith("86")
            and clean_phone[2:].startswith("1")
            and clean_phone.isdigit()
        ):
            return True

        return False

    def _clean_phone_number(self, phone_number: str) -> str:
        """Clean and normalize phone number for API.

        Args:
            phone_number: Raw phone number

        Returns:
            Cleaned phone number without country code
        """
        clean_phone = phone_number.replace(" ", "").replace("-", "").replace("+", "")

        # Remove 86 country code if present
        if clean_phone.startswith("86") and len(clean_phone) == 13:
            clean_phone = clean_phone[2:]

        return clean_phone

    def validate_service_configuration(self) -> Tuple[bool, Optional[str]]:
        """Validate that phone verification service is properly configured.

        Returns:
            Tuple of (is_valid: bool, error_message: Optional[str])
        """
        if not self.config.alibaba_access_key_id:
            return False, "Alibaba access key ID not configured"

        if not self.config.alibaba_access_key_secret:
            return False, "Alibaba access key secret not configured"

        if not self.config.sms_sign_name:
            return False, "SMS signature name not configured"

        if not self.config.sms_template_code:
            return False, "SMS template code not configured"

        return True, None
