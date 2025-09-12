import AuthService from '../authService';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('AuthService', () => {
  let authService: AuthService;

  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      phone: '+8613811111111',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2025-08-30T10:00:00Z',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    authService = AuthService.getInstance();
    mockFetch.mockClear();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(authService);
    });
  });

  describe('sendOTP', () => {
    const phoneNumber = '+8613811111111';

    it('should send OTP successfully', async () => {
      const mockResponse = { message: 'OTP sent successfully' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authService.sendOTP(phoneNumber);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.api.com/api/auth/send-otp',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone_number: phoneNumber }),
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle successful response without message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const result = await authService.sendOTP(phoneNumber);

      expect(result).toEqual({ message: 'OTP sent successfully' });
    });

    it('should throw AuthServiceError for API errors', async () => {
      const errorResponse = { message: 'Invalid phone number format' };
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      } as Response);

      await expect(authService.sendOTP(phoneNumber)).rejects.toMatchObject({
        name: 'AuthServiceError',
        message: 'Invalid phone number format',
        statusCode: 400,
      });
    });

    it('should handle API error without specific message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      await expect(authService.sendOTP(phoneNumber)).rejects.toMatchObject({
        name: 'AuthServiceError',
        message: 'Failed to send OTP',
        statusCode: 500,
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(authService.sendOTP(phoneNumber)).rejects.toMatchObject({
        name: 'AuthServiceError',
        message: 'No internet connection. Please check your network and try again.',
        statusCode: 0,
      });
    });

    it('should handle unexpected errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Unexpected error'));

      await expect(authService.sendOTP(phoneNumber)).rejects.toMatchObject({
        name: 'AuthServiceError',
        message: 'Unexpected error occurred. Please try again.',
        statusCode: 0,
      });
    });

    it('should handle different phone number formats', async () => {
      const phoneNumbers = [
        '+1234567890',
        '86-138-1111-1111',
        '13811111111',
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'OTP sent successfully' }),
      } as Response);

      for (const phone of phoneNumbers) {
        await authService.sendOTP(phone);
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.api.com/api/auth/send-otp',
          expect.objectContaining({
            body: JSON.stringify({ phone_number: phone }),
          })
        );
      }
    });
  });

  describe('verifyOTP', () => {
    const phoneNumber = '+8613811111111';
    const otpCode = '123456';

    it('should verify OTP successfully and return session', async () => {
      const mockResponse = {
        message: 'Authentication successful',
        session: mockSession,
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authService.verifyOTP(phoneNumber, otpCode);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.api.com/api/auth/verify-otp',
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
      expect(result.session.access_token).toBe('mock-access-token');
      expect(result.session.user.id).toBe('test-user-id');
    });

    it('should handle successful response without message', async () => {
      const mockResponse = {
        session: mockSession,
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authService.verifyOTP(phoneNumber, otpCode);

      expect(result.message).toBe('Authentication successful');
      expect(result.session).toEqual(mockSession);
    });

    it('should throw AuthServiceError for invalid OTP', async () => {
      const errorResponse = { message: 'Invalid verification code' };
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      } as Response);

      await expect(authService.verifyOTP(phoneNumber, otpCode)).rejects.toMatchObject({
        name: 'AuthServiceError',
        message: 'Invalid verification code',
        statusCode: 400,
      });
    });

    it('should handle expired OTP', async () => {
      const errorResponse = { message: 'OTP code has expired' };
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 410,
        json: async () => errorResponse,
      } as Response);

      await expect(authService.verifyOTP(phoneNumber, otpCode)).rejects.toMatchObject({
        name: 'AuthServiceError',
        message: 'OTP code has expired',
        statusCode: 410,
      });
    });

    it('should handle rate limiting', async () => {
      const errorResponse = { message: 'Too many verification attempts' };
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => errorResponse,
      } as Response);

      await expect(authService.verifyOTP(phoneNumber, otpCode)).rejects.toMatchObject({
        name: 'AuthServiceError',
        message: 'Too many verification attempts',
        statusCode: 429,
      });
    });

    it('should handle API error without specific message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      await expect(authService.verifyOTP(phoneNumber, otpCode)).rejects.toMatchObject({
        name: 'AuthServiceError',
        message: 'Failed to verify OTP',
        statusCode: 500,
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(authService.verifyOTP(phoneNumber, otpCode)).rejects.toMatchObject({
        name: 'AuthServiceError',
        message: 'No internet connection. Please check your network and try again.',
        statusCode: 0,
      });
    });

    it('should handle unexpected errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Unexpected error'));

      await expect(authService.verifyOTP(phoneNumber, otpCode)).rejects.toMatchObject({
        name: 'AuthServiceError',
        message: 'Unexpected error occurred. Please try again.',
        statusCode: 0,
      });
    });

    it('should handle different OTP code formats', async () => {
      const otpCodes = ['123456', '000000', '999999'];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          message: 'Authentication successful',
          session: mockSession,
        }),
      } as Response);

      for (const otp of otpCodes) {
        await authService.verifyOTP(phoneNumber, otp);
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.api.com/api/auth/verify-otp',
          expect.objectContaining({
            body: JSON.stringify({
              phone_number: phoneNumber,
              otp_code: otp,
            }),
          })
        );
      }
    });
  });

  describe('getErrorMessage', () => {
    it('should return AuthServiceError message directly', async () => {
      // Mock an API error response to trigger AuthServiceError creation
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          message: 'Invalid phone number format'
        }),
      } as any);

      try {
        await authService.sendOTP('+1234567890');
      } catch (error) {
        const message = authService.getErrorMessage(error);
        expect(message).toBe('Invalid phone number format');
      }
    });

    it('should return generic message for unknown errors', () => {
      const error = new Error('Unknown error');

      const message = authService.getErrorMessage(error);
      expect(message).toBe('An unexpected error occurred. Please try again.');
    });

    it('should handle null/undefined errors', () => {
      expect(authService.getErrorMessage(null)).toBe(
        'An unexpected error occurred. Please try again.'
      );
      expect(authService.getErrorMessage(undefined)).toBe(
        'An unexpected error occurred. Please try again.'
      );
    });

    it('should handle non-AuthServiceError objects', () => {
      const error = {
        name: 'SomeOtherError',
        message: 'Some other message',
      };

      const message = authService.getErrorMessage(error);
      expect(message).toBe('An unexpected error occurred. Please try again.');
    });
  });
});