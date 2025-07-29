// eslint-disable-next-line import/no-unresolved
import { API_BASE_URL } from "@env";
import { Session } from '@supabase/supabase-js';

/**
 * Authentication Service
 * 
 * Handles only OTP operations:
 * - sendOTP: Send SMS verification code
 * - verifyOTP: Verify code and get session from server
 * 
 * Session management is handled by useAuthStore.
 */

interface SendOTPResponse {
  message: string;
}

interface VerifyOTPResponse {
  message: string;
  session: Session;
}

enum AuthErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_OTP = 'INVALID_OTP',
  INVALID_PHONE = 'INVALID_PHONE',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
}

class AuthServiceError extends Error {
  public statusCode: number;
  public errorType: AuthErrorType;

  constructor(message: string, statusCode: number, errorType: AuthErrorType) {
    super(message);
    this.name = 'AuthServiceError';
    this.statusCode = statusCode;
    this.errorType = errorType;
  }
}

class AuthService {
  private static instance: AuthService;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Send OTP to phone number
   */
  async sendOTP(phoneNumber: string): Promise<SendOTPResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });
      
      const data = await response.json();

      if (!response.ok) {
        const errorType = this.mapStatusToErrorType(response.status, data.message);
        throw new AuthServiceError(
          data.message || 'Failed to send OTP',
          response.status,
          errorType
        );
      }

      return { message: data.message || 'OTP sent successfully' };
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new AuthServiceError(
          'No internet connection. Please check your network and try again.',
          0,
          AuthErrorType.NETWORK_ERROR
        );
      }

      throw new AuthServiceError(
        'Unexpected error occurred. Please try again.',
        0,
        AuthErrorType.SERVER_ERROR
      );
    }
  }

  /**
   * Verify OTP and return session data
   */
  async verifyOTP(phoneNumber: string, otpCode: string): Promise<VerifyOTPResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          otp_code: otpCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorType = this.mapStatusToErrorType(response.status, data.message);
        throw new AuthServiceError(
          data.message || 'Failed to verify OTP',
          response.status,
          errorType
        );
      }

      // Return session data
      return {
        message: data.message || 'Authentication successful',
        session: data.session
      };
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new AuthServiceError(
          'No internet connection. Please check your network and try again.',
          0,
          AuthErrorType.NETWORK_ERROR
        );
      }

      throw new AuthServiceError(
        'Unexpected error occurred. Please try again.',
        0,
        AuthErrorType.SERVER_ERROR
      );
    }
  }



  /**
   * Map HTTP status code to specific error type
   */
  private mapStatusToErrorType(statusCode: number, message?: string): AuthErrorType {
    switch (statusCode) {
      case 400:
        if (message?.includes('phone')) return AuthErrorType.INVALID_PHONE;
        if (message?.includes('otp') || message?.includes('Invalid')) return AuthErrorType.INVALID_OTP;
        return AuthErrorType.INVALID_OTP; // Default for 400s
      case 429:
        return AuthErrorType.RATE_LIMITED;
      case 500:
        return AuthErrorType.SERVER_ERROR;
      default:
        return AuthErrorType.SERVER_ERROR;
    }
  }

  /**
   * Get user-friendly error message (simplified for OTP operations only)
   */
  getErrorMessage(error: unknown): string {
    if (error instanceof AuthServiceError) {
      switch (error.errorType) {
        case AuthErrorType.INVALID_PHONE:
          return 'Please enter a valid phone number';
        case AuthErrorType.INVALID_OTP:
          return 'Invalid verification code. Please try again.';
        case AuthErrorType.RATE_LIMITED:
          return 'Too many attempts. Please wait before trying again.';
        case AuthErrorType.NETWORK_ERROR:
          return error.message; // Already user-friendly
        case AuthErrorType.SERVER_ERROR:
          return 'Server error. Please try again in a moment.';
        default:
          return 'Something went wrong. Please try again.';
      }
    }

    return 'An unexpected error occurred. Please try again.';
  }
}

export default AuthService;
export { AuthServiceError };