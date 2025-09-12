import React from 'react';
import { create, act } from 'react-test-renderer';
import { useAIProcessing } from '../aiWorkFlow/useAIProcessing';

// Mock clients hook
const mockClients = [
  { id: 1, client_name: 'Client 1' },
  { id: 2, client_name: 'Client 2' },
];

jest.mock('@/hooks/data/useClients', () => ({
  useClients: () => ({
    clients: mockClients,
  }),
}));

// Mock processing hook
const mockStartAIProcessing = jest.fn();
const mockStopProcessing = jest.fn();

jest.mock('@/hooks/infrastructure/useProcessing', () => ({
  useProcessing: () => ({
    startAIProcessing: mockStartAIProcessing,
    stopProcessing: mockStopProcessing,
  }),
}));

// Mock AI workflow store with complete structure matching the actual store
const mockAIWorkflowStore = {
  // State
  tasks: [],
  sourceType: null,
  currentIndex: 1,
  isProcessing: false,

  // Actions
  setTasks: jest.fn((tasks, sourceType) => {
    mockAIWorkflowStore.tasks = tasks;
    mockAIWorkflowStore.sourceType = sourceType;
    mockAIWorkflowStore.currentIndex = 1;
  }),
  setCurrentIndex: jest.fn((index) => {
    mockAIWorkflowStore.currentIndex = index;
  }),
  setProcessing: jest.fn((isProcessing) => {
    mockAIWorkflowStore.isProcessing = isProcessing;
  }),
  reset: jest.fn(() => {
    mockAIWorkflowStore.tasks = [];
    mockAIWorkflowStore.sourceType = null;
    mockAIWorkflowStore.currentIndex = 1;
    mockAIWorkflowStore.isProcessing = false;
  }),
};

jest.mock('@/stores/useAIWorkflowStore', () => ({
  useAIWorkflowStore: (selector?: (state: any) => any) => {
    // If selector is provided, return the selected piece of state
    if (selector) {
      return selector(mockAIWorkflowStore);
    }
    // Otherwise return the entire store
    return mockAIWorkflowStore;
  },
}));

// Mock AI service
const mockProposeTasks = jest.fn();
const mockGetInstance = jest.fn(() => ({
  proposeTasks: mockProposeTasks,
}));

jest.mock('@/services/aiService', () => ({
  __esModule: true,
  default: {
    getInstance: mockGetInstance,
  },
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

describe('useAIProcessing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return processing functions and state', () => {
    const { result } = renderHook(() => useAIProcessing());

    expect(typeof result.processFiles).toBe('function');
    expect(typeof result.isProcessing).toBe('boolean');
  });

  it('should accept callback functions', () => {
    const mockOnSuccess = jest.fn();
    const mockOnError = jest.fn();
    
    const { result } = renderHook(() => useAIProcessing({
      onSuccess: mockOnSuccess,
      onError: mockOnError,
    }));

    expect(typeof result.processFiles).toBe('function');
    expect(typeof result.isProcessing).toBe('boolean');
  });

  it('should work without callbacks', () => {
    const { result } = renderHook(() => useAIProcessing()); // No callbacks

    expect(typeof result.processFiles).toBe('function');
    expect(typeof result.isProcessing).toBe('boolean');
  });

  it('should have processFiles function that accepts correct parameters', () => {
    const { result } = renderHook(() => useAIProcessing());

    // Function should exist and be callable
    expect(result.processFiles).toBeDefined();
    expect(typeof result.processFiles).toBe('function');
    
    // Test that it accepts the expected parameters without error
    expect(() => {
      const mockAttachments: any[] = [];
      const sourceType: 'ocr' | 'asr' = 'ocr';
      // Just test that the function signature is correct
      const promise = result.processFiles(mockAttachments, sourceType);
      expect(promise).toBeInstanceOf(Promise);
    }).not.toThrow();
  });

  it('should provide isProcessing state', () => {
    const { result } = renderHook(() => useAIProcessing());

    // Should provide isProcessing boolean state
    expect(typeof result.isProcessing).toBe('boolean');
  });

  it('should integrate with all required hooks and services', () => {
    const { result } = renderHook(() => useAIProcessing());

    // Should return the expected interface
    expect(result).toHaveProperty('processFiles');
    expect(result).toHaveProperty('isProcessing');
    
    // Functions should be defined
    expect(result.processFiles).toBeDefined();
    expect(result.isProcessing).toBeDefined();
  });
});