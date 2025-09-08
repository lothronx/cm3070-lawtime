"""Unit tests for phone_verification_service.py"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from services.phone_verification_service import PhoneVerificationService


class TestPhoneVerificationService:
    """Test class for PhoneVerificationService functionality."""

    @pytest.fixture
    def config_mock(self):
        """Mock configuration."""
        config = Mock()
        config.alibaba_access_key_id = "test_access_key_id"
        config.alibaba_access_key_secret = "test_access_key_secret"
        config.sms_sign_name = "TestSign"
        config.sms_template_code = "SMS_123456"
        config.sms_template_param = "{\"code\": \"${code}\"}"
        return config

    @pytest.fixture
    def phone_verification_service(self, config_mock):
        """Create PhoneVerificationService instance with mocked dependencies."""
        return PhoneVerificationService(config_mock)

    @pytest.fixture
    def mock_client(self):
        """Mock Alibaba Cloud client."""
        return Mock()

    @pytest.fixture
    def successful_send_response(self):
        """Mock successful SMS send response."""
        response = Mock()
        response.body = Mock()
        response.body.code = "OK"
        response.body.success = True
        response.body.message = "Success"
        response.body.model = Mock()
        response.body.model.biz_id = "test_biz_id_123"
        return response

    @pytest.fixture
    def successful_verify_response(self):
        """Mock successful SMS verification response."""
        response = Mock()
        response.body = Mock()
        response.body.code = "OK"
        response.body.success = True
        response.body.message = "Success"
        response.body.model = Mock()
        response.body.model.verify_result = "PASS"
        return response

    def test_init(self, config_mock):
        """Test PhoneVerificationService initialization."""
        service = PhoneVerificationService(config_mock)
        assert service.config == config_mock

    @patch('services.phone_verification_service.DypnsapiClient')
    @patch('services.phone_verification_service.CredentialClient')
    @patch('services.phone_verification_service.open_api_models')
    def test_create_client(self, mock_open_api, mock_credential_client, mock_dypnsapi_client, phone_verification_service):
        """Test client creation."""
        mock_credential = Mock()
        mock_credential_client.return_value = mock_credential
        mock_config = Mock()
        mock_open_api.Config.return_value = mock_config
        mock_client = Mock()
        mock_dypnsapi_client.return_value = mock_client
        
        result = phone_verification_service._create_client()
        
        mock_credential_client.assert_called_once()
        mock_open_api.Config.assert_called_once_with(credential=mock_credential)
        assert mock_config.endpoint == "dypnsapi.aliyuncs.com"
        mock_dypnsapi_client.assert_called_once_with(mock_config)
        assert result == mock_client

    def test_send_verification_code_success(self, phone_verification_service, successful_send_response):
        """Test successful verification code sending."""
        phone = "13800138000"
        
        with patch.object(phone_verification_service, '_create_client') as mock_create_client:
            mock_client = Mock()
            mock_create_client.return_value = mock_client
            mock_client.send_sms_verify_code_with_options.return_value = successful_send_response
            
            success, error_message, biz_id = phone_verification_service.send_verification_code(phone)
            
            assert success is True
            assert error_message is None
            assert biz_id == "test_biz_id_123"
            
            # Verify client method was called
            mock_client.send_sms_verify_code_with_options.assert_called_once()

    def test_send_verification_code_invalid_phone(self, phone_verification_service):
        """Test sending verification code with invalid phone number."""
        invalid_phones = ["123", "abc123", "12345678901234", "+1234567890"]
        
        for phone in invalid_phones:
            success, error_message, biz_id = phone_verification_service.send_verification_code(phone)
            
            assert success is False
            assert error_message == "Invalid phone number format"
            assert biz_id is None

    def test_send_verification_code_api_failure(self, phone_verification_service):
        """Test verification code sending with API failure."""
        phone = "13800138000"
        
        with patch.object(phone_verification_service, '_create_client') as mock_create_client:
            mock_client = Mock()
            mock_create_client.return_value = mock_client
            
            # Mock API error response
            error_response = Mock()
            error_response.body = Mock()
            error_response.body.code = "BUSINESS_LIMIT_CONTROL"
            error_response.body.success = False
            error_response.body.message = "Daily limit exceeded"
            
            mock_client.send_sms_verify_code_with_options.return_value = error_response
            
            success, error_message, biz_id = phone_verification_service.send_verification_code(phone)
            
            assert success is False
            assert "Daily limit exceeded. Please try again tomorrow" in error_message
            assert biz_id is None

    def test_send_verification_code_exception(self, phone_verification_service):
        """Test verification code sending with exception."""
        phone = "13800138000"
        
        with patch.object(phone_verification_service, '_create_client') as mock_create_client:
            mock_client = Mock()
            mock_create_client.return_value = mock_client
            mock_client.send_sms_verify_code_with_options.side_effect = RuntimeError("Network error")
            
            success, error_message, biz_id = phone_verification_service.send_verification_code(phone)
            
            assert success is False
            assert "SMS service temporarily unavailable" in error_message
            assert biz_id is None

    def test_verify_code_success(self, phone_verification_service, successful_verify_response):
        """Test successful code verification."""
        phone = "13800138000"
        code = "123456"
        
        with patch.object(phone_verification_service, '_create_client') as mock_create_client:
            mock_client = Mock()
            mock_create_client.return_value = mock_client
            mock_client.check_sms_verify_code_with_options.return_value = successful_verify_response
            
            is_valid, error_message = phone_verification_service.verify_code(phone, code)
            
            assert is_valid is True
            assert error_message is None
            
            # Verify client method was called
            mock_client.check_sms_verify_code_with_options.assert_called_once()

    def test_verify_code_invalid_phone(self, phone_verification_service):
        """Test code verification with invalid phone number."""
        invalid_phone = "123"
        code = "123456"
        
        is_valid, error_message = phone_verification_service.verify_code(invalid_phone, code)
        
        assert is_valid is False
        assert error_message == "Invalid phone number format"

    def test_verify_code_failed_verification(self, phone_verification_service):
        """Test code verification with failed verification."""
        phone = "13800138000"
        code = "123456"
        
        with patch.object(phone_verification_service, '_create_client') as mock_create_client:
            mock_client = Mock()
            mock_create_client.return_value = mock_client
            
            # Mock failed verification response
            failed_response = Mock()
            failed_response.body = Mock()
            failed_response.body.code = "OK"
            failed_response.body.success = True
            failed_response.body.model = Mock()
            failed_response.body.model.verify_result = "FAIL"
            
            mock_client.check_sms_verify_code_with_options.return_value = failed_response
            
            is_valid, error_message = phone_verification_service.verify_code(phone, code)
            
            assert is_valid is False
            assert error_message is None

    def test_verify_code_api_error(self, phone_verification_service):
        """Test code verification with API error."""
        phone = "13800138000"
        code = "123456"
        
        with patch.object(phone_verification_service, '_create_client') as mock_create_client:
            mock_client = Mock()
            mock_create_client.return_value = mock_client
            
            # Mock API error response
            error_response = Mock()
            error_response.body = Mock()
            error_response.body.code = "INVALID_PARAMETERS"
            error_response.body.success = False
            error_response.body.message = "Invalid parameters"
            
            mock_client.check_sms_verify_code_with_options.return_value = error_response
            
            is_valid, error_message = phone_verification_service.verify_code(phone, code)
            
            assert is_valid is False
            assert error_message == "Invalid verification code format"

    def test_verify_code_exception(self, phone_verification_service):
        """Test code verification with exception."""
        phone = "13800138000"
        code = "123456"
        
        with patch.object(phone_verification_service, '_create_client') as mock_create_client:
            mock_client = Mock()
            mock_create_client.return_value = mock_client
            mock_client.check_sms_verify_code_with_options.side_effect = ValueError("Network error")
            
            is_valid, error_message = phone_verification_service.verify_code(phone, code)
            
            assert is_valid is False
            assert error_message == "Verification service temporarily unavailable"

    def test_handle_send_error_mappings(self, phone_verification_service):
        """Test send error message mappings."""
        test_cases = [
            ("MOBILE_NUMBER_ILLEGAL", "Invalid phone number format"),
            ("BUSINESS_LIMIT_CONTROL", "Daily limit exceeded. Please try again tomorrow"),
            ("FREQUENCY_FAIL", "Please wait before requesting another code"),
            ("INVALID_PARAMETERS", "Invalid request parameters"),
            ("FUNCTION_NOT_OPENED", "Phone verification service not enabled"),
            ("UNKNOWN_ERROR", "SMS service temporarily unavailable")
        ]
        
        for error_code, expected_message in test_cases:
            result = phone_verification_service._handle_send_error(error_code, "test message")
            assert result == expected_message

    def test_handle_verify_error_mappings(self, phone_verification_service):
        """Test verify error message mappings."""
        test_cases = [
            ("INVALID_PARAMETERS", "Invalid verification code format"),
            ("FUNCTION_NOT_OPENED", "Phone verification service not available"),
            ("UNKNOWN_ERROR", "Verification service temporarily unavailable")
        ]
        
        for error_code, expected_message in test_cases:
            result = phone_verification_service._handle_verify_error(error_code, "test message")
            assert result == expected_message

    def test_extract_error_message_with_message_attr(self, phone_verification_service):
        """Test error message extraction with message attribute."""
        error = Mock()
        error.message = "Custom error message"
        
        result = phone_verification_service._extract_error_message(error)
        assert result == "Custom error message"

    def test_extract_error_message_with_data_dict(self, phone_verification_service):
        """Test error message extraction with data dictionary."""
        error = Mock()
        # Remove the default message attribute to force data path
        del error.message
        error.data = {"Message": "API error message"}

        result = phone_verification_service._extract_error_message(error)
        assert result == "API error message"

    def test_extract_error_message_fallback(self, phone_verification_service):
        """Test error message extraction fallback to str()."""
        error = ValueError("Simple error")
        
        result = phone_verification_service._extract_error_message(error)
        assert result == "Simple error"

    def test_is_valid_phone_number(self, phone_verification_service):
        """Test phone number validation."""
        valid_phones = [
            "13800138000",      # Standard format
            "13812345678",      # Different prefix
            "15987654321",      # Different prefix
            "8613800138000",    # With country code
            "86 138 0013 8000", # With spaces
            "86-138-0013-8000", # With dashes
            "+8613800138000"    # With plus sign
        ]
        
        for phone in valid_phones:
            assert phone_verification_service._is_valid_phone_number(phone) is True
        
        invalid_phones = [
            "123",              # Too short
            "12345678901234",   # Too long
            "abc123456789",     # Contains letters
            "03800138000",      # Doesn't start with 1
            "23800138000",      # Invalid first digit
            "8503800138000",    # Wrong country code
            ""                  # Empty string
        ]
        
        for phone in invalid_phones:
            assert phone_verification_service._is_valid_phone_number(phone) is False

    def test_clean_phone_number(self, phone_verification_service):
        """Test phone number cleaning."""
        test_cases = [
            ("13800138000", "13800138000"),
            ("138 0013 8000", "13800138000"),
            ("138-0013-8000", "13800138000"),
            ("+13800138000", "13800138000"),
            ("8613800138000", "13800138000"),  # Remove country code
            ("86 138 0013 8000", "13800138000"),
            ("+86-138-0013-8000", "13800138000")
        ]
        
        for input_phone, expected_output in test_cases:
            result = phone_verification_service._clean_phone_number(input_phone)
            assert result == expected_output

    def test_validate_service_configuration_success(self, phone_verification_service):
        """Test successful service configuration validation."""
        is_valid, error_message = phone_verification_service.validate_service_configuration()
        
        assert is_valid is True
        assert error_message is None

    def test_validate_service_configuration_missing_access_key_id(self, config_mock):
        """Test configuration validation with missing access key ID."""
        config_mock.alibaba_access_key_id = None
        service = PhoneVerificationService(config_mock)
        
        is_valid, error_message = service.validate_service_configuration()
        
        assert is_valid is False
        assert error_message == "Alibaba access key ID not configured"

    def test_validate_service_configuration_missing_access_key_secret(self, config_mock):
        """Test configuration validation with missing access key secret."""
        config_mock.alibaba_access_key_secret = None
        service = PhoneVerificationService(config_mock)
        
        is_valid, error_message = service.validate_service_configuration()
        
        assert is_valid is False
        assert error_message == "Alibaba access key secret not configured"

    def test_validate_service_configuration_missing_sms_sign_name(self, config_mock):
        """Test configuration validation with missing SMS sign name."""
        config_mock.sms_sign_name = None
        service = PhoneVerificationService(config_mock)
        
        is_valid, error_message = service.validate_service_configuration()
        
        assert is_valid is False
        assert error_message == "SMS signature name not configured"

    def test_validate_service_configuration_missing_sms_template_code(self, config_mock):
        """Test configuration validation with missing SMS template code."""
        config_mock.sms_template_code = None
        service = PhoneVerificationService(config_mock)
        
        is_valid, error_message = service.validate_service_configuration()
        
        assert is_valid is False
        assert error_message == "SMS template code not configured"

    def test_code_trimming(self, phone_verification_service, successful_verify_response):
        """Test that verification codes are properly trimmed."""
        phone = "13800138000"
        code = "  123456  "  # Code with whitespace
        
        with patch.object(phone_verification_service, '_create_client') as mock_create_client:
            mock_client = Mock()
            mock_create_client.return_value = mock_client
            mock_client.check_sms_verify_code_with_options.return_value = successful_verify_response
            
            is_valid, error_message = phone_verification_service.verify_code(phone, code)
            
            # Verify code was trimmed in the request
            call_args = mock_client.check_sms_verify_code_with_options.call_args[0][0]
            assert call_args.verify_code == "123456"

    def test_send_sms_request_parameters(self, phone_verification_service, successful_send_response, config_mock):
        """Test that SMS send request uses correct parameters."""
        phone = "13800138000"
        
        with patch.object(phone_verification_service, '_create_client') as mock_create_client:
            mock_client = Mock()
            mock_create_client.return_value = mock_client
            mock_client.send_sms_verify_code_with_options.return_value = successful_send_response
            
            phone_verification_service.send_verification_code(phone)
            
            # Verify request parameters
            call_args = mock_client.send_sms_verify_code_with_options.call_args[0][0]
            assert call_args.country_code == "86"
            assert call_args.phone_number == "13800138000"
            assert call_args.sign_name == config_mock.sms_sign_name
            assert call_args.template_code == config_mock.sms_template_code
            assert call_args.template_param == config_mock.sms_template_param
            assert call_args.code_length == 6

    def test_error_message_in_error_code(self, phone_verification_service):
        """Test error handling when error code is in error message."""
        # Test case where error code appears in message instead of code field
        result = phone_verification_service._handle_send_error("UNKNOWN", "FREQUENCY_FAIL detected")
        assert result == "Please wait before requesting another code"

    def test_international_phone_formats(self, phone_verification_service):
        """Test various international phone number formats."""
        international_formats = [
            ("8613800138000", True),
            ("86 138 0013 8000", True),
            ("+86 138 0013 8000", True),
            ("86-138-0013-8000", True),
            ("85213800138000", False),  # Wrong country code
            ("8612345678", False),      # Too short with country code
        ]
        
        for phone, expected_valid in international_formats:
            result = phone_verification_service._is_valid_phone_number(phone)
            assert result == expected_valid