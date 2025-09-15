import React from 'react';
import { create, act } from 'react-test-renderer';
import { useAIWorkflow } from '../aiWorkFlow/useAIWorkflow';

// Mock useAIProcessing hook
const mockProcessFiles = jest.fn();

jest.mock('../aiWorkFlow/useAIProcessing', () => ({
  useAIProcessing: ({ onSuccess, onError }: any) => ({
    processFiles: mockProcessFiles,
  }),
}));

// Mock useAINavigation hook
const mockContinueFlow = jest.fn();

jest.mock('../aiWorkFlow/useAINavigation', () => ({
  useAINavigation: () => ({
    continueFlow: mockContinueFlow,
  }),
}));

// Mock AI workflow store with selector support
const mockAIWorkflowStore = {
  tasks: [],
  sourceType: null,
  currentIndex: 1,
  isProcessing: false,
  setTasks: jest.fn(),
  setCurrentIndex: jest.fn(),
  setProcessing: jest.fn(),
  reset: jest.fn(),
};

jest.mock('@/stores/useAIWorkflowStore', () => ({
  useAIWorkflowStore: (selector?: (state: any) => any) => {
    if (selector) {
      return selector(mockAIWorkflowStore);
    }
    return mockAIWorkflowStore;
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

describe('useAIWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock store state
    mockAIWorkflowStore.tasks = [];
    mockAIWorkflowStore.sourceType = null;
    mockAIWorkflowStore.currentIndex = 1;
    mockAIWorkflowStore.isProcessing = false;
  });

  it('should return workflow state and actions', () => {
    const { result } = renderHook(() => useAIWorkflow());

    expect(result).toHaveProperty('isActive');
    expect(result).toHaveProperty('currentTask');
    expect(result).toHaveProperty('currentIndex');
    expect(result).toHaveProperty('totalTasks');
    expect(result).toHaveProperty('startProcessing');
    expect(result).toHaveProperty('continueFlow');

    expect(typeof result.isActive).toBe('boolean');
    expect(typeof result.currentIndex).toBe('number');
    expect(typeof result.totalTasks).toBe('number');
    expect(typeof result.startProcessing).toBe('function');
    expect(typeof result.continueFlow).toBe('function');
  });

  it('should work with default parameters', () => {
    const { result } = renderHook(() => useAIWorkflow());

    expect(result.isActive).toBe(false);
    expect(result.currentTask).toBe(null);
    expect(result.currentIndex).toBe(1);
    expect(result.totalTasks).toBe(1);
  });

  it('should work with provided parameters', () => {
    const mockAttachments = [
      { id: '1', name: 'test.pdf', isTemporary: true }
    ];

    const { result } = renderHook(() => useAIWorkflow({
      attachments: mockAttachments,
      sourceType: 'ocr',
      stackIndex: '2',
      stackTotal: '5'
    }));

    expect(result.currentIndex).toBe(2);
    expect(result.totalTasks).toBe(5);
    expect(result.isActive).toBe(true); // Active due to stackIndex/stackTotal
  });

  it('should show active state when tasks exist', () => {
    // Set up mock store with tasks
    mockAIWorkflowStore.tasks = [
      { id: 1, title: 'Task 1' },
      { id: 2, title: 'Task 2' }
    ];

    const { result } = renderHook(() => useAIWorkflow());

    expect(result.isActive).toBe(true);
    expect(result.totalTasks).toBe(2);
    expect(result.currentTask).toEqual({ id: 1, title: 'Task 1' });
  });

  it('should provide current task based on index', () => {
    // Set up mock store with multiple tasks
    mockAIWorkflowStore.tasks = [
      { id: 1, title: 'Task 1' },
      { id: 2, title: 'Task 2' },
      { id: 3, title: 'Task 3' }
    ];

    const { result } = renderHook(() => useAIWorkflow({
      stackIndex: '3' // Should show Task 3
    }));

    expect(result.currentTask).toEqual({ id: 3, title: 'Task 3' });
    expect(result.currentIndex).toBe(3);
  });

  it('should have functional startProcessing action', () => {
    const { result } = renderHook(() => useAIWorkflow());

    expect(typeof result.startProcessing).toBe('function');

    // Should not throw when called
    expect(() => {
      result.startProcessing();
    }).not.toThrow();
  });

  it('should integrate with navigation hook', () => {
    const { result } = renderHook(() => useAIWorkflow());

    expect(result.continueFlow).toBe(mockContinueFlow);
  });

  it('should handle edge cases with invalid parameters', () => {
    // Test with invalid stack index - parseInt returns NaN
    const { result } = renderHook(() => useAIWorkflow({
      stackIndex: 'invalid',
      stackTotal: 'also-invalid'
    }));

    // Reflects actual behavior - parseInt('invalid') returns NaN
    expect(result.currentIndex).toBeNaN();
    expect(result.totalTasks).toBeNaN();
    expect(result.currentTask).toBe(null);
    expect(result.isActive).toBe(true); // Still active due to presence of stackIndex/stackTotal
  });
});