import * as SecureStore from 'expo-secure-store';
// eslint-disable-next-line import/no-unresolved
import { API_BASE_URL } from "@env";
import {
  SendOTPResponse,
  VerifyOTPResponse,
  APIError,
  AuthServiceError
} from '@/types/auth';

class AuthService {
  private static instance: AuthService;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Send OTP to the provided phone number
   */
  async sendOTP(phoneNumber: string): Promise<SendOTPResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
        }),
      });

      const data = await response.json();
  

      if (!response.ok) {
        const errorData = data as APIError;
        throw new AuthServiceError(
          errorData.error || 'Failed to send OTP',
          response.status,
          errorData.details
        );
      }

      return data as SendOTPResponse;
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }

      // Network or other errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new AuthServiceError(
          'No internet connection. Please check your network and try again.',
          0
        );
      }

      throw new AuthServiceError(
        '1 Unexpected error occurred. Please try again.',
        0
      );
    }
  }

  /**
   * Verify OTP and get authentication session
   */
  async verifyOTP(phoneNumber: string, otpCode: string): Promise<VerifyOTPResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          otp_code: otpCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as APIError;
        throw new AuthServiceError(
          errorData.error || 'Failed to verify OTP',
          response.status,
          errorData.details
        );
      }

      const verifyResponse = data as VerifyOTPResponse;
      
      // Store tokens securely
      await this.storeSession(verifyResponse.session);
      
      return verifyResponse;
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }

      // Network or other errors
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
   * Store authentication session in secure storage
   */
  private async storeSession(session: VerifyOTPResponse['session']): Promise<void> {
    try {
      // Ensure all values are properly converted to strings for SecureStore
      const accessToken = String(session.access_token || '');
      const refreshToken = String(session.refresh_token || '');
      const expiresAt = String(session.expires_at || '');
      const userDataString = JSON.stringify(session.user || {});

      await Promise.all([
        SecureStore.setItemAsync('access_token', accessToken),
        SecureStore.setItemAsync('refresh_token', refreshToken),
        SecureStore.setItemAsync('expires_at', expiresAt),
        SecureStore.setItemAsync('user_data', userDataString),
      ]);
    } catch (error) {
      console.error('Failed to store session:', error);
      throw new AuthServiceError('Failed to save authentication data', 0);
    }
  }

  /**
   * Get stored authentication session
   */
  async getStoredSession(): Promise<VerifyOTPResponse['session'] | null> {
    try {
      const [accessToken, refreshToken, expiresAt, userData] = await Promise.all([
        SecureStore.getItemAsync('access_token'),
        SecureStore.getItemAsync('refresh_token'),
        SecureStore.getItemAsync('expires_at'),
        SecureStore.getItemAsync('user_data'),
      ]);

      if (!accessToken || !refreshToken || !expiresAt || !userData) {
        return null;
      }

      let parsedUser;
      try {
        parsedUser = JSON.parse(userData);
      } catch (parseError) {
        console.error('Failed to parse user data:', parseError);
        return null;
      }

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: parseInt(expiresAt, 10),
        user: parsedUser,
      };
    } catch (error) {
      console.error('Failed to retrieve session:', error);
      return null;
    }
  }

  /**
   * Check if current session is valid (not expired)
   */
  async isSessionValid(): Promise<boolean> {
    const session = await this.getStoredSession();
    if (!session) {
      return false;
    }

    // Check if token is expired (with 5 minute buffer)
    const now = Date.now() / 1000;
    const expiresAt = session.expires_at;
    
    return expiresAt > now + 300; // 5 minute buffer
  }

  /**
   * Refresh the access token using the stored refresh token
   * @returns Promise with new session data or null if refresh failed
   */
  async refreshToken(): Promise<VerifyOTPResponse['session'] | null> {
    try {
      const session = await this.getStoredSession();
      if (!session?.refresh_token) {
        throw new AuthServiceError('No refresh token available', 401);
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: session.refresh_token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as APIError;
        throw new AuthServiceError(
          errorData.error || 'Failed to refresh token',
          response.status,
          errorData.details
        );
      }

      const refreshResponse = data as VerifyOTPResponse;
      
      // Store the new tokens
      await this.storeSession(refreshResponse.session);
      
      return refreshResponse.session;
    } catch (error) {
      if (error instanceof AuthServiceError) {
        // If refresh fails due to invalid/expired refresh token, clear session
        if (error.statusCode === 401 || error.statusCode === 403) {
          await this.clearSession();
        }
        throw error;
      }

      // Network or other errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new AuthServiceError(
          'No internet connection. Please check your network and try again.',
          0
        );
      }

      throw new AuthServiceError(
        'Failed to refresh authentication. Please log in again.',
        0
      );
    }
  }

  /**
   * Get valid session with automatic token refresh if needed
   * @returns Promise with valid session or null if authentication failed
   */
  async getValidSession(): Promise<VerifyOTPResponse['session'] | null> {
    try {
      const session = await this.getStoredSession();
      if (!session) {
        return null;
      }

      // Check if token is still valid
      if (await this.isSessionValid()) {
        return session;
      }

      // Token is expired, try to refresh
      try {
        const refreshedSession = await this.refreshToken();
        return refreshedSession;
      } catch (refreshError) {
        // Refresh failed, session is invalid
        console.log('Token refresh failed:', refreshError);
        return null;
      }
    } catch (error) {
      console.error('Failed to get valid session:', error);
      return null;
    }
  }

  /**
   * Clear stored authentication data
   */
  async clearSession(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync('access_token'),
        SecureStore.deleteItemAsync('refresh_token'),
        SecureStore.deleteItemAsync('expires_at'),
        SecureStore.deleteItemAsync('user_data'),
      ]);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * Get user-friendly error message from API error
   */
  getErrorMessage(error: unknown): string {
    if (error instanceof AuthServiceError) {
      // Map specific error messages to user-friendly ones
      switch (error.statusCode) {
        case 400:
          if (error.message.includes('phone_number')) {
            return 'Please enter a valid phone number';
          }
          if (error.message.includes('otp_code') || error.message.includes('Invalid')) {
            return 'Invalid verification code. Please try again.';
          }
          return 'Please check your input and try again';
        case 429:
          return 'Too many requests. Please wait a moment before trying again.';
        case 500:
          return 'Server error. Please try again in a moment.';
        case 0:
          return error.message; // Network errors already have user-friendly messages
        default:
          return 'Something went wrong. Please try again.';
      }
    }

    return 'An unexpected error occurred. Please try again.';
  }
}

export default AuthService;
export { AuthServiceError };