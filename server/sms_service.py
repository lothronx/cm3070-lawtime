import os
import sys
import json
import logging
from dotenv import load_dotenv
from typing import Dict, Optional, Tuple

from alibabacloud_credentials.client import Client as CredentialClient
from alibabacloud_credentials.models import Config

from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_tea_util import models as util_models
from alibabacloud_tea_util.client import Client as UtilClient

from alibabacloud_dysmsapi20170525.client import Client as Dysmsapi20170525Client
from alibabacloud_dysmsapi20170525 import models as dysmsapi_20170525_models

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SMSService:
    """SMS service for sending OTP codes via Alibaba Cloud SMS API."""
    
    def __init__(self, sign_name: str = "北京二分文化传媒", template_code: str = "SMS_325135041"):
        """
        Initialize SMS service with sign name and template code.
        
        Args:
            sign_name: SMS signature name
            template_code: SMS template code for OTP
        """
        load_dotenv('.env.local')
        self.sign_name = sign_name
        self.template_code = template_code
        self._validate_credentials()
        
    def _validate_credentials(self) -> None:
        """Validate that required SMS credentials are present."""
        access_key_id = os.environ.get("ALIBABA_DYSMS_ACCESS_KEY_ID")
        access_key_secret = os.environ.get("ALIBABA_DYSMS_ACCESS_KEY_SECRET")
        
        if not access_key_id:
            raise ValueError("ALIBABA_DYSMS_ACCESS_KEY_ID environment variable is required")
        if not access_key_secret:
            raise ValueError("ALIBABA_DYSMS_ACCESS_KEY_SECRET environment variable is required")

    def _create_client(self) -> Dysmsapi20170525Client:
        """
        Create and configure Alibaba Cloud SMS client.
        
        Returns:
            Configured SMS client
        """
        credentialsConfig = Config(
            type="access_key",
            access_key_id=os.environ.get("ALIBABA_DYSMS_ACCESS_KEY_ID"),
            access_key_secret=os.environ.get("ALIBABA_DYSMS_ACCESS_KEY_SECRET"),
        )
        credentialClient = CredentialClient(credentialsConfig)
        config = open_api_models.Config(credential=credentialClient)
        config.endpoint = "dysmsapi.aliyuncs.com"
        return Dysmsapi20170525Client(config)

    def send_otp(self, phone_number: str, otp_code: str) -> Tuple[bool, Optional[str]]:
        """
        Send OTP code to the specified phone number.
        
        Args:
            phone_number: Target phone number (format: +86xxxxxxxxxx or xxxxxxxxxx)
            otp_code: 6-digit OTP code to send
            
        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        try:
            # Validate phone number format
            if not self._is_valid_phone_number(phone_number):
                return False, "Invalid phone number format"
                
            # Clean phone number (remove + and country code if present)
            clean_phone = self._clean_phone_number(phone_number)
            
            client = self._create_client()
            send_sms_request = dysmsapi_20170525_models.SendSmsRequest(
                sign_name=self.sign_name,
                template_code=self.template_code,
                phone_numbers=clean_phone,
                template_param=json.dumps({"code": otp_code}),
            )
            runtime = util_models.RuntimeOptions()
            
            response = client.send_sms_with_options(send_sms_request, runtime)
            
            # Log success (without sensitive data)
            logger.info(f"SMS sent successfully to phone ending in {clean_phone[-4:]}")
            return True, None
            
        except Exception as error:
            error_message = str(error.message) if hasattr(error, 'message') else str(error)
            logger.error(f"SMS sending failed: {error_message}")
            
            # Return user-friendly error message
            if "InvalidPhoneNumbers" in error_message:
                return False, "Invalid phone number"
            elif "SignatureDoesNotMatch" in error_message:
                return False, "SMS service configuration error"
            else:
                return False, "SMS service temporarily unavailable"

    def _is_valid_phone_number(self, phone_number: str) -> bool:
        """
        Validate Chinese mobile phone number format.
        
        Args:
            phone_number: Phone number to validate
            
        Returns:
            True if valid format, False otherwise
        """
        # Remove any spaces, dashes, or plus signs
        clean_phone = phone_number.replace(" ", "").replace("-", "").replace("+", "")
        
        # Check if it's a valid Chinese mobile number
        # Chinese mobile numbers start with 1 and are 11 digits long
        if len(clean_phone) == 11 and clean_phone.startswith("1") and clean_phone.isdigit():
            return True
        # Also accept international format with 86 prefix
        elif len(clean_phone) == 13 and clean_phone.startswith("86") and clean_phone[2:].startswith("1") and clean_phone.isdigit():
            return True
        
        return False

    def _clean_phone_number(self, phone_number: str) -> str:
        """
        Clean and normalize phone number for SMS API.
        
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
