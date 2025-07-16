import AuthService, { AuthServiceError } from '../authService';
import * as SecureStore from 'expo-secure-store';

// Mock SecureStore and fetch
jest.mock('expo-secure-store');
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Get fresh instance for each test
    authService = AuthService.getInstance();
    
    // Reset fetch mock
    mockFetch.mockClear();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('sendOTP', () => {
    const phoneNumber = '+8613811111111';

    it('should send OTP successfully', async () => {
      // Arrange
      const mockResponse = { message: 'OTP sent successfully' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act
      const result = await authService.sendOTP(phoneNumber);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'http://192.168.0.105:5001//auth/send-otp',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone_number: phoneNumber }),
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw AuthServiceError for API errors', async () => {
      // Arrange
      const errorResponse = { error: 'Invalid phone number', details: {} };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      } as Response);

      // Act & Assert
      await expect(authService.sendOTP(phoneNumber)).rejects.toThrow(AuthServiceError);
      
      try {
        await authService.sendOTP(phoneNumber);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError);
        expect((error as AuthServiceError).statusCode).toBe(0);
        expect((error as AuthServiceError).message).toBe('1 Unexpected error occurred. Please try again.');
      }
    });

    it('should throw network error for fetch failure', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      // Act & Assert
      await expect(authService.sendOTP(phoneNumber)).rejects.toThrow(AuthServiceError);
      
      try {
        await authService.sendOTP(phoneNumber);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError);
        expect((error as AuthServiceError).message).toBe('1 Unexpected error occurred. Please try again.');
        expect((error as AuthServiceError).statusCode).toBe(0);
      }
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('Unexpected error'));

      // Act & Assert
      await expect(authService.sendOTP(phoneNumber)).rejects.toThrow(AuthServiceError);
      
      try {
        await authService.sendOTP(phoneNumber);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError);
        expect((error as AuthServiceError).message).toContain('Unexpected error occurred');
      }
    });
  });

  describe('verifyOTP', () => {
    const phoneNumber = '+8613811111111';
    const otpCode = '123456';
    const mockSession = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Date.now() / 1000 + 3600, // 1 hour from now
      user: {
        id: 'user-123',
        phone: phoneNumber,
        created_at: '2023-01-01T00:00:00.000Z',
      },
    };

    it('should verify OTP successfully and store session', async () => {
      // Arrange
      const mockResponse = {
        message: 'OTP verified successfully',
        session: mockSession,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);
      
      mockSecureStore.setItemAsync.mockResolvedValue();

      // Act
      const result = await authService.verifyOTP(phoneNumber, otpCode);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'http://192.168.0.105:5001//auth/verify-otp',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone_number: phoneNumber,
            otp_code: otpCode,
          }),
        }
      );
      
      expect(result).toEqual(mockResponse);
      
      // Verify session storage
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(4);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'access_token',
        mockSession.access_token
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'refresh_token',
        mockSession.refresh_token
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'expires_at',
        String(mockSession.expires_at)
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'user_data',
        JSON.stringify(mockSession.user)
      );
    });

    it('should throw AuthServiceError for invalid OTP', async () => {
      // Arrange
      const errorResponse = { error: 'Invalid OTP code' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      } as Response);

      // Act & Assert
      await expect(authService.verifyOTP(phoneNumber, otpCode)).rejects.toThrow(AuthServiceError);
    });

    it('should handle session storage failure', async () => {
      // Arrange
      const mockResponse = {
        message: 'OTP verified successfully',
        session: mockSession,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);
      
      mockSecureStore.setItemAsync.mockRejectedValueOnce(new Error('Storage failed'));

      // Act & Assert
      await expect(authService.verifyOTP(phoneNumber, otpCode)).rejects.toThrow(AuthServiceError);
      
      try {
        await authService.verifyOTP(phoneNumber, otpCode);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError);
        expect((error as AuthServiceError).message).toBe('Unexpected error occurred. Please try again.');
      }
    });
  });

  describe('getStoredSession', () => {
    it('should retrieve stored session successfully', async () => {
      // Arrange
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: {
          id: 'user-123',
          phone: '+8613811111111',
          created_at: '2023-01-01T00:00:00.000Z',
        },
      };

      mockSecureStore.getItemAsync
        .mockResolvedValueOnce(mockSession.access_token)
        .mockResolvedValueOnce(mockSession.refresh_token)
        .mockResolvedValueOnce(String(mockSession.expires_at))
        .mockResolvedValueOnce(JSON.stringify(mockSession.user));

      // Act
      const result = await authService.getStoredSession();

      // Assert
      expect(result).toEqual(mockSession);
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledTimes(4);
    });

    it('should return null for incomplete session data', async () => {
      // Arrange
      mockSecureStore.getItemAsync
        .mockResolvedValueOnce(null) // access_token missing
        .mockResolvedValueOnce('refresh_token')
        .mockResolvedValueOnce('expires_at')
        .mockResolvedValueOnce('user_data');

      // Act
      const result = await authService.getStoredSession();

      // Assert
      expect(result).toBeNull();
    });

    it('should return null and handle storage errors gracefully', async () => {
      // Arrange
      mockSecureStore.getItemAsync.mockRejectedValueOnce(new Error('Storage error'));

      // Act
      const result = await authService.getStoredSession();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('isSessionValid', () => {
    it('should return true for valid session', async () => {
      // Arrange
      const futureTimestamp = (Date.now() / 1000) + 3600; // 1 hour from now
      const mockSession = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: futureTimestamp,
        user: { id: '123', phone: '+8613811111111', created_at: '2023-01-01' },
      };
      
      jest.spyOn(authService, 'getStoredSession').mockResolvedValueOnce(mockSession);

      // Act
      const result = await authService.isSessionValid();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for expired session (with buffer)', async () => {
      // Arrange
      const expiredTimestamp = (Date.now() / 1000) + 200; // 200 seconds from now (less than 300s buffer)
      const mockSession = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: expiredTimestamp,
        user: { id: '123', phone: '+8613811111111', created_at: '2023-01-01' },
      };
      
      jest.spyOn(authService, 'getStoredSession').mockResolvedValueOnce(mockSession);

      // Act
      const result = await authService.isSessionValid();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when no session exists', async () => {
      // Arrange
      jest.spyOn(authService, 'getStoredSession').mockResolvedValueOnce(null);

      // Act
      const result = await authService.isSessionValid();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('clearSession', () => {
    it('should clear all stored session data', async () => {
      // Arrange
      mockSecureStore.deleteItemAsync.mockResolvedValue();

      // Act
      await authService.clearSession();

      // Assert
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledTimes(4);
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('expires_at');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('user_data');
    });

    it('should handle clear errors gracefully', async () => {
      // Arrange
      mockSecureStore.deleteItemAsync.mockRejectedValueOnce(new Error('Clear failed'));

      // Act & Assert - should not throw
      await expect(authService.clearSession()).resolves.toBeUndefined();
    });
  });

  describe('getErrorMessage', () => {
    it('should return user-friendly message for phone number validation error', () => {
      // Arrange
      const error = new AuthServiceError('Invalid phone_number', 400);

      // Act
      const message = authService.getErrorMessage(error);

      // Assert
      expect(message).toBe('Please enter a valid phone number');
    });

    it('should return user-friendly message for OTP validation error', () => {
      // Arrange
      const error = new AuthServiceError('Invalid otp_code', 400);

      // Act
      const message = authService.getErrorMessage(error);

      // Assert
      expect(message).toBe('Invalid verification code. Please try again.');
    });

    it('should return rate limiting message', () => {
      // Arrange
      const error = new AuthServiceError('Too many requests', 429);

      // Act
      const message = authService.getErrorMessage(error);

      // Assert
      expect(message).toBe('Too many requests. Please wait a moment before trying again.');
    });

    it('should return server error message', () => {
      // Arrange
      const error = new AuthServiceError('Internal server error', 500);

      // Act
      const message = authService.getErrorMessage(error);

      // Assert
      expect(message).toBe('Server error. Please try again in a moment.');
    });

    it('should return network error message', () => {
      // Arrange
      const error = new AuthServiceError('No internet connection. Please check your network and try again.', 0);

      // Act
      const message = authService.getErrorMessage(error);

      // Assert
      expect(message).toBe('No internet connection. Please check your network and try again.');
    });

    it('should return generic message for unknown errors', () => {
      // Arrange
      const error = new Error('Unknown error');

      // Act
      const message = authService.getErrorMessage(error);

      // Assert
      expect(message).toBe('An unexpected error occurred. Please try again.');
    });

    it('should return generic message for unknown status codes', () => {
      // Arrange
      const error = new AuthServiceError('Unknown error', 418); // I'm a teapot

      // Act
      const message = authService.getErrorMessage(error);

      // Assert
      expect(message).toBe('Something went wrong. Please try again.');
    });
  });
});