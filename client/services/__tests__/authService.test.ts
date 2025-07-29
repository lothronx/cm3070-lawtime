import AuthService, { AuthServiceError } from '../authService';

// Helper function for test assertions
function fail(message: string): never {
  throw new Error(message);
}

// Mock environment variables
jest.mock('@env', () => ({
  API_BASE_URL: 'http://localhost:5001',
}));

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
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
        'http://localhost:5001/api/auth/send-otp',
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
      const errorResponse = { message: 'Invalid phone number' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      } as Response);

      // Act & Assert
      await expect(authService.sendOTP(phoneNumber)).rejects.toThrow(AuthServiceError);
    });

    it('should include correct error details for API errors', async () => {
      // Arrange
      const errorResponse = { message: 'Invalid phone number' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      } as Response);

      // Act & Assert
      try {
        await authService.sendOTP(phoneNumber);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError);
        expect((error as AuthServiceError).statusCode).toBe(400);
        expect((error as AuthServiceError).message).toBe('Invalid phone number');
      }
    });

    it('should throw network error for fetch failure', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      // Act & Assert
      await expect(authService.sendOTP(phoneNumber)).rejects.toThrow(AuthServiceError);
    });

    it('should include correct error details for network failures', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      // Act & Assert
      try {
        await authService.sendOTP(phoneNumber);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError);
        expect((error as AuthServiceError).message).toBe('No internet connection. Please check your network and try again.');
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
        expect((error as AuthServiceError).message).toBe('Unexpected error occurred. Please try again.');
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
      token_type: 'bearer',
    };

    it('should verify OTP successfully and return session', async () => {
      // Arrange
      const mockResponse = {
        message: 'OTP verified successfully',
        session: mockSession,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act
      const result = await authService.verifyOTP(phoneNumber, otpCode);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/auth/verify-otp',
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
    });

    it('should throw AuthServiceError for invalid OTP', async () => {
      // Arrange
      const errorResponse = { message: 'Invalid OTP code' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      } as Response);

      // Act & Assert
      await expect(authService.verifyOTP(phoneNumber, otpCode)).rejects.toThrow(AuthServiceError);
    });

    it('should include correct error details for invalid OTP', async () => {
      // Arrange
      const errorResponse = { message: 'Invalid OTP code' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      } as Response);

      // Act & Assert
      try {
        await authService.verifyOTP(phoneNumber, otpCode);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError);
        expect((error as AuthServiceError).message).toBe('Invalid OTP code');
      }
    });

    it('should handle network errors', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      // Act & Assert
      await expect(authService.verifyOTP(phoneNumber, otpCode)).rejects.toThrow(AuthServiceError);
    });

    it('should include correct error details for network errors', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      // Act & Assert
      try {
        await authService.verifyOTP(phoneNumber, otpCode);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthServiceError);
        expect((error as AuthServiceError).message).toBe('No internet connection. Please check your network and try again.');
      }
    });
  });

  describe('getErrorMessage', () => {
    it('should return user-friendly message for phone number validation error', () => {
      // Arrange
      const error = new (AuthServiceError as any)('Invalid phone_number', 400, 'INVALID_PHONE');

      // Act
      const message = authService.getErrorMessage(error);

      // Assert
      expect(message).toBe('Please enter a valid phone number');
    });

    it('should return user-friendly message for OTP validation error', () => {
      // Arrange
      const error = new (AuthServiceError as any)('Invalid otp_code', 400, 'INVALID_OTP');

      // Act
      const message = authService.getErrorMessage(error);

      // Assert
      expect(message).toBe('Invalid verification code. Please try again.');
    });

    it('should return rate limiting message', () => {
      // Arrange
      const error = new (AuthServiceError as any)('Too many requests', 429, 'RATE_LIMITED');

      // Act
      const message = authService.getErrorMessage(error);

      // Assert
      expect(message).toBe('Too many attempts. Please wait before trying again.');
    });

    it('should return server error message', () => {
      // Arrange
      const error = new (AuthServiceError as any)('Internal server error', 500, 'SERVER_ERROR');

      // Act
      const message = authService.getErrorMessage(error);

      // Assert
      expect(message).toBe('Server error. Please try again in a moment.');
    });

    it('should return network error message', () => {
      // Arrange
      const error = new (AuthServiceError as any)('No internet connection. Please check your network and try again.', 0, 'NETWORK_ERROR');

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

    it('should return generic message for unknown AuthServiceErrors', () => {
      // Arrange
      const error = new (AuthServiceError as any)('Unknown error', 418, 'UNKNOWN_TYPE');

      // Act
      const message = authService.getErrorMessage(error);

      // Assert
      expect(message).toBe('Something went wrong. Please try again.');
    });
  });
});