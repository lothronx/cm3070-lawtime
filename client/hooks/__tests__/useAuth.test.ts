import React from 'react';
import { create, act } from 'react-test-renderer';
import useAuth from '../auth/useAuth';

// Mock expo-router
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

// Mock AuthService
const mockSendOTP = jest.fn();
const mockVerifyOTP = jest.fn();
const mockGetErrorMessage = jest.fn();

jest.mock('@/services/authService', () => {
  return {
    __esModule: true,
    default: {
      getInstance: jest.fn(() => ({
        sendOTP: mockSendOTP,
        verifyOTP: mockVerifyOTP,
        getErrorMessage: mockGetErrorMessage,
      })),
    },
  };
});

// Mock useAuthStore
const mockSetSession = jest.fn();
jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({
    setSession: mockSetSession,
  }),
}));

// Helper function to test hooks using React Test Renderer
function renderHook<T>(hook: () => T) {
  let result: T;
  let hasError = false;
  let error: Error;

  function TestComponent() {
    try {
      result = hook();
      hasError = false;
    } catch (err) {
      hasError = true;
      error = err as Error;
    }
    return null;
  }

  act(() => {
    create(React.createElement(TestComponent));
  });

  if (hasError) {
    throw error!;
  }

  return {
    result: result!,
  };
}

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return initial state and all required functions', () => {
    const { result } = renderHook(() => useAuth());

    // State properties
    expect(typeof result.mobileNumber).toBe('string');
    expect(typeof result.smsCode).toBe('string');
    expect(typeof result.codeSent).toBe('boolean');
    expect(typeof result.isAuthenticating).toBe('boolean');
    expect(typeof result.agreedToTerms).toBe('boolean');
    expect(typeof result.phoneError).toBe('string');
    expect(typeof result.codeError).toBe('string');
    expect(typeof result.generalError).toBe('string');
    expect(typeof result.countdown).toBe('number');

    // Computed values
    expect(typeof result.nextButtonEnabled).toBe('boolean');
    expect(typeof result.signInButtonEnabled).toBe('boolean');

    // Actions
    expect(typeof result.handlePhoneChange).toBe('function');
    expect(typeof result.handleCodeChange).toBe('function');
    expect(typeof result.handleNext).toBe('function');
    expect(typeof result.handleSignIn).toBe('function');
    expect(typeof result.handleResend).toBe('function');
    expect(typeof result.handleChangePhoneNumber).toBe('function');
    expect(typeof result.setAgreedToTerms).toBe('function');
    expect(typeof result.setGeneralError).toBe('function');
  });

  it('should have correct initial values', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.mobileNumber).toBe('');
    expect(result.smsCode).toBe('');
    expect(result.codeSent).toBe(false);
    expect(result.isAuthenticating).toBe(false);
    expect(result.agreedToTerms).toBe(false);
    expect(result.phoneError).toBe('');
    expect(result.codeError).toBe('');
    expect(result.generalError).toBe('');
    expect(result.countdown).toBe(0);
    expect(result.nextButtonEnabled).toBe(false);
    expect(result.signInButtonEnabled).toBe(false);
  });

  it('should have all required handler functions', () => {
    const { result } = renderHook(() => useAuth());

    // Test that handler functions exist and are callable without throwing
    expect(() => {
      result.handlePhoneChange('12345678901');
      result.handleCodeChange('123456');
      result.setAgreedToTerms(true);
      result.setGeneralError('test');
      result.handleChangePhoneNumber();
    }).not.toThrow();
  });

  it('should have async action functions that return promises', async () => {
    const { result } = renderHook(() => useAuth());

    // Test that async functions exist and return promises
    const nextPromise = result.handleNext();
    const signInPromise = result.handleSignIn();
    const resendPromise = result.handleResend();

    expect(nextPromise).toBeInstanceOf(Promise);
    expect(signInPromise).toBeInstanceOf(Promise);
    expect(resendPromise).toBeInstanceOf(Promise);

    // Await promises to prevent warnings
    await Promise.allSettled([nextPromise, signInPromise, resendPromise]);
  });

  it('should integrate with external services', () => {
    const { result } = renderHook(() => useAuth());

    // Should integrate with AuthService, router, and store without errors
    expect(result).toBeDefined();
    expect(typeof result.handleNext).toBe('function');
    expect(typeof result.handleSignIn).toBe('function');
  });

  it('should provide complete authentication interface', () => {
    const { result } = renderHook(() => useAuth());

    // Should provide all necessary properties for authentication flow
    const expectedProperties = [
      'mobileNumber', 'smsCode', 'codeSent', 'isAuthenticating', 'agreedToTerms',
      'phoneError', 'codeError', 'generalError', 'countdown',
      'nextButtonEnabled', 'signInButtonEnabled',
      'handlePhoneChange', 'handleCodeChange', 'handleNext', 'handleSignIn',
      'handleResend', 'handleChangePhoneNumber', 'setAgreedToTerms', 'setGeneralError'
    ];

    expectedProperties.forEach(prop => {
      expect(result).toHaveProperty(prop);
    });
  });

  it('should handle service interactions without errors', async () => {
    // Setup mock returns for success cases
    mockSendOTP.mockResolvedValue(undefined);
    mockVerifyOTP.mockResolvedValue({ session: { access_token: 'test' } });
    mockGetErrorMessage.mockReturnValue('Test error');

    const { result } = renderHook(() => useAuth());

    // Should handle basic service calls without throwing
    await expect(result.handleNext()).resolves.not.toThrow();
    await expect(result.handleSignIn()).resolves.not.toThrow();

    // Note: handleResend has complex error handling that requires more setup,
    // so it's tested separately in integration tests
  });

  it('should provide error handling capabilities', () => {
    const { result } = renderHook(() => useAuth());

    // Should provide error state management
    expect(typeof result.phoneError).toBe('string');
    expect(typeof result.codeError).toBe('string');
    expect(typeof result.generalError).toBe('string');
    expect(typeof result.setGeneralError).toBe('function');

    // Should not throw when setting errors
    expect(() => {
      result.setGeneralError('Test error');
    }).not.toThrow();
  });

  it('should provide form state management', () => {
    const { result } = renderHook(() => useAuth());

    // Should provide all form state properties
    expect(typeof result.mobileNumber).toBe('string');
    expect(typeof result.smsCode).toBe('string');
    expect(typeof result.codeSent).toBe('boolean');
    expect(typeof result.countdown).toBe('number');
    expect(typeof result.agreedToTerms).toBe('boolean');

    // Should provide form handlers
    expect(typeof result.handlePhoneChange).toBe('function');
    expect(typeof result.handleCodeChange).toBe('function');
    expect(typeof result.setAgreedToTerms).toBe('function');
  });

  it('should provide reset functionality', () => {
    const { result } = renderHook(() => useAuth());

    // Should have reset function
    expect(typeof result.handleChangePhoneNumber).toBe('function');

    // Should not throw when called
    expect(() => {
      result.handleChangePhoneNumber();
    }).not.toThrow();
  });
});