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

class AuthServiceError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AuthServiceError';
    this.statusCode = statusCode;
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
        const errorMessage = data.message || 'Failed to send OTP';
        throw new AuthServiceError(errorMessage, response.status);
      }

      return { message: data.message || 'OTP sent successfully' };
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new AuthServiceError(
          'No internet connection. Please check your network and try again.',
          0
        );
      }

      throw new AuthServiceError(
        'Unexpected error occurred. Please try again.',
        0
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
        const errorMessage = data.message || 'Failed to verify OTP';
        throw new AuthServiceError(errorMessage, response.status);
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
          0
        );
      }

      throw new AuthServiceError(
        'Unexpected error occurred. Please try again.',
        0
      );
    }
  }

  /**
   * Get error message - just return the backend message directly
   */
  getErrorMessage(error: unknown): string {
    if (error instanceof AuthServiceError) {
      return error.message; // Use backend message directly
    }
    return 'An unexpected error occurred. Please try again.';
  }
}

export default AuthService;