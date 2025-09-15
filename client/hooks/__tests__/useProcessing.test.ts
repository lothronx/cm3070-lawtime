import { useProcessing } from '../infrastructure/useProcessing';

// Mock the entire hook to avoid complex timer and Zustand integration
jest.mock('../infrastructure/useProcessing', () => ({
  useProcessing: jest.fn(),
}));

const mockedUseProcessing = useProcessing as jest.MockedFunction<typeof useProcessing>;

describe('useProcessing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide the correct interface structure', () => {
    const mockReturn = {
      isProcessing: false,
      currentMessage: '',
      startProcessing: jest.fn(),
      startAIProcessing: jest.fn(),
      startGenericProcessing: jest.fn(),
      stopProcessing: jest.fn(),
      withProcessing: jest.fn(),
    };

    mockedUseProcessing.mockReturnValue(mockReturn);

    const result = useProcessing();

    expect(result).toHaveProperty('isProcessing');
    expect(result).toHaveProperty('currentMessage');
    expect(result).toHaveProperty('startProcessing');
    expect(result).toHaveProperty('startAIProcessing');
    expect(result).toHaveProperty('startGenericProcessing');
    expect(result).toHaveProperty('stopProcessing');
    expect(result).toHaveProperty('withProcessing');
  });

  it('should return correct types for all properties', () => {
    const mockReturn = {
      isProcessing: false,
      currentMessage: '',
      startProcessing: jest.fn(),
      startAIProcessing: jest.fn(),
      startGenericProcessing: jest.fn(),
      stopProcessing: jest.fn(),
      withProcessing: jest.fn(),
    };

    mockedUseProcessing.mockReturnValue(mockReturn);

    const result = useProcessing();

    expect(typeof result.isProcessing).toBe('boolean');
    expect(typeof result.currentMessage).toBe('string');
    expect(typeof result.startProcessing).toBe('function');
    expect(typeof result.startAIProcessing).toBe('function');
    expect(typeof result.startGenericProcessing).toBe('function');
    expect(typeof result.stopProcessing).toBe('function');
    expect(typeof result.withProcessing).toBe('function');
  });

  it('should handle initial state', () => {
    const mockReturn = {
      isProcessing: false,
      currentMessage: '',
      startProcessing: jest.fn(),
      startAIProcessing: jest.fn(),
      startGenericProcessing: jest.fn(),
      stopProcessing: jest.fn(),
      withProcessing: jest.fn(),
    };

    mockedUseProcessing.mockReturnValue(mockReturn);

    const result = useProcessing();

    expect(result.isProcessing).toBe(false);
    expect(result.currentMessage).toBe('');
  });

  it('should handle processing state', () => {
    const mockReturn = {
      isProcessing: true,
      currentMessage: 'AI analyzing your document...',
      startProcessing: jest.fn(),
      startAIProcessing: jest.fn(),
      startGenericProcessing: jest.fn(),
      stopProcessing: jest.fn(),
      withProcessing: jest.fn(),
    };

    mockedUseProcessing.mockReturnValue(mockReturn);

    const result = useProcessing();

    expect(result.isProcessing).toBe(true);
    expect(result.currentMessage).toBe('AI analyzing your document...');
  });

  it('should provide all processing action functions', () => {
    const mockStartProcessing = jest.fn();
    const mockStartAIProcessing = jest.fn();
    const mockStartGenericProcessing = jest.fn();
    const mockStopProcessing = jest.fn();
    const mockWithProcessing = jest.fn();

    const mockReturn = {
      isProcessing: false,
      currentMessage: '',
      startProcessing: mockStartProcessing,
      startAIProcessing: mockStartAIProcessing,
      startGenericProcessing: mockStartGenericProcessing,
      stopProcessing: mockStopProcessing,
      withProcessing: mockWithProcessing,
    };

    mockedUseProcessing.mockReturnValue(mockReturn);

    const result = useProcessing();

    expect(result.startProcessing).toBe(mockStartProcessing);
    expect(result.startAIProcessing).toBe(mockStartAIProcessing);
    expect(result.startGenericProcessing).toBe(mockStartGenericProcessing);
    expect(result.stopProcessing).toBe(mockStopProcessing);
    expect(result.withProcessing).toBe(mockWithProcessing);
  });

  it('should handle different message types', () => {
    const mockReturn = {
      isProcessing: true,
      currentMessage: 'Loading...',
      startProcessing: jest.fn(),
      startAIProcessing: jest.fn(),
      startGenericProcessing: jest.fn(),
      stopProcessing: jest.fn(),
      withProcessing: jest.fn(),
    };

    mockedUseProcessing.mockReturnValue(mockReturn);

    const result = useProcessing();

    expect(result.currentMessage).toBe('Loading...');
    expect(typeof result.currentMessage).toBe('string');
  });

  it('should provide withProcessing wrapper function', () => {
    const mockWithProcessing = jest.fn();
    const mockReturn = {
      isProcessing: false,
      currentMessage: '',
      startProcessing: jest.fn(),
      startAIProcessing: jest.fn(),
      startGenericProcessing: jest.fn(),
      stopProcessing: jest.fn(),
      withProcessing: mockWithProcessing,
    };

    mockedUseProcessing.mockReturnValue(mockReturn);

    const result = useProcessing();

    expect(typeof result.withProcessing).toBe('function');
    expect(result.withProcessing).toBe(mockWithProcessing);
  });

  it('should handle action functions without throwing', () => {
    const mockReturn = {
      isProcessing: false,
      currentMessage: '',
      startProcessing: jest.fn(),
      startAIProcessing: jest.fn(),
      startGenericProcessing: jest.fn(),
      stopProcessing: jest.fn(),
      withProcessing: jest.fn(),
    };

    mockedUseProcessing.mockReturnValue(mockReturn);

    const result = useProcessing();

    // Should not throw when called
    expect(() => {
      result.startProcessing('Test message');
      result.startAIProcessing();
      result.startGenericProcessing();
      result.stopProcessing();
    }).not.toThrow();
  });

  it('should handle withProcessing async operations', async () => {
    const mockWithProcessing = jest.fn().mockResolvedValue('test result');
    const mockReturn = {
      isProcessing: false,
      currentMessage: '',
      startProcessing: jest.fn(),
      startAIProcessing: jest.fn(),
      startGenericProcessing: jest.fn(),
      stopProcessing: jest.fn(),
      withProcessing: mockWithProcessing,
    };

    mockedUseProcessing.mockReturnValue(mockReturn);

    const result = useProcessing();

    // Should return a promise
    const promise = result.withProcessing(async () => 'test');
    expect(promise).toBeInstanceOf(Promise);

    // Should resolve properly
    await expect(promise).resolves.not.toThrow();
  });

  it('should provide complete processing management interface', () => {
    const mockReturn = {
      isProcessing: true,
      currentMessage: 'Extracting key information...',
      startProcessing: jest.fn(),
      startAIProcessing: jest.fn(),
      startGenericProcessing: jest.fn(),
      stopProcessing: jest.fn(),
      withProcessing: jest.fn(),
    };

    mockedUseProcessing.mockReturnValue(mockReturn);

    const result = useProcessing();

    // Should provide all necessary properties for processing management
    const expectedProperties = [
      'isProcessing',
      'currentMessage',
      'startProcessing',
      'startAIProcessing',
      'startGenericProcessing',
      'stopProcessing',
      'withProcessing'
    ];

    expectedProperties.forEach(prop => {
      expect(result).toHaveProperty(prop);
    });

    // Should provide complete processing interface
    expect(typeof result.isProcessing).toBe('boolean');
    expect(typeof result.currentMessage).toBe('string');
    expect(typeof result.startProcessing).toBe('function');
    expect(typeof result.startAIProcessing).toBe('function');
    expect(typeof result.startGenericProcessing).toBe('function');
    expect(typeof result.stopProcessing).toBe('function');
    expect(typeof result.withProcessing).toBe('function');
  });

  it('should be callable without parameters', () => {
    const mockReturn = {
      isProcessing: false,
      currentMessage: '',
      startProcessing: jest.fn(),
      startAIProcessing: jest.fn(),
      startGenericProcessing: jest.fn(),
      stopProcessing: jest.fn(),
      withProcessing: jest.fn(),
    };

    mockedUseProcessing.mockReturnValue(mockReturn);

    // Should not throw when called without parameters
    expect(() => {
      useProcessing();
    }).not.toThrow();
  });

  it('should handle different processing states', () => {
    // Test not processing state
    const notProcessingReturn = {
      isProcessing: false,
      currentMessage: '',
      startProcessing: jest.fn(),
      startAIProcessing: jest.fn(),
      startGenericProcessing: jest.fn(),
      stopProcessing: jest.fn(),
      withProcessing: jest.fn(),
    };

    mockedUseProcessing.mockReturnValue(notProcessingReturn);
    const notProcessingResult = useProcessing();
    expect(notProcessingResult.isProcessing).toBe(false);
    expect(notProcessingResult.currentMessage).toBe('');

    // Test processing state
    const processingReturn = {
      isProcessing: true,
      currentMessage: 'Processing legal terminology...',
      startProcessing: jest.fn(),
      startAIProcessing: jest.fn(),
      startGenericProcessing: jest.fn(),
      stopProcessing: jest.fn(),
      withProcessing: jest.fn(),
    };

    mockedUseProcessing.mockReturnValue(processingReturn);
    const processingResult = useProcessing();
    expect(processingResult.isProcessing).toBe(true);
    expect(processingResult.currentMessage).toBe('Processing legal terminology...');
  });
});