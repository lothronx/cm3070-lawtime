import React from 'react';
import { create, act } from 'react-test-renderer';
import { useAINavigation } from '../aiWorkFlow/useAINavigation';

// Mock expo-router
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    back: mockBack,
    canGoBack: mockCanGoBack,
  }),
}));

// Mock AI workflow store with mutable state
const mockSetCurrentIndex = jest.fn();
const mockReset = jest.fn();
const mockTasks = [
  { id: 1, title: 'Task 1' },
  { id: 2, title: 'Task 2' },
  { id: 3, title: 'Task 3' },
];

let mockCurrentIndex = 1;

jest.mock('@/stores/useAIWorkflowStore', () => ({
  useAIWorkflowStore: () => ({
    tasks: mockTasks,
    get currentIndex() { return mockCurrentIndex; },
    setCurrentIndex: mockSetCurrentIndex,
    reset: mockReset,
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

describe('useAINavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentIndex = 1; // Reset to default
    mockCanGoBack.mockReturnValue(true);
  });

  it('should return navigation functions', () => {
    const { result } = renderHook(() => useAINavigation());

    expect(result).toMatchObject({
      continueFlow: expect.any(Function),
      navigateToTask: expect.any(Function),
      exitFlow: expect.any(Function),
    });
  });

  it('should navigate to next task when continueFlow is called', async () => {
    const { result } = renderHook(() => useAINavigation());

    let flowResult: string;
    await act(async () => {
      flowResult = await result.continueFlow();
    });

    expect(mockSetCurrentIndex).toHaveBeenCalledWith(2);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/task',
      params: {
        mode: 'ai-flow',
        stackIndex: '2',
        stackTotal: '3'
      }
    });
    expect(flowResult!).toBe('Task 1 processed! Showing task 2 of 3');
  });

  it('should complete flow when no more tasks remain', async () => {
    // Set current index to last task
    mockCurrentIndex = 3;
    
    const { result } = renderHook(() => useAINavigation());
    const mockOnComplete = jest.fn();

    let flowResult: string;
    await act(async () => {
      flowResult = await result.continueFlow(mockOnComplete);
    });

    expect(mockReset).toHaveBeenCalled();
    expect(mockOnComplete).toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
    expect(flowResult!).toBe('All tasks completed successfully!');
    
    // Reset for other tests
    mockCurrentIndex = 1;
  });

  it('should navigate to specific task when navigateToTask is called', () => {
    const { result } = renderHook(() => useAINavigation());

    act(() => {
      result.navigateToTask(2);
    });

    expect(mockSetCurrentIndex).toHaveBeenCalledWith(2);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/task',
      params: {
        mode: 'ai-flow',
        stackIndex: '2',
        stackTotal: '3'
      }
    });
  });

  it('should not navigate to invalid task index', () => {
    const { result } = renderHook(() => useAINavigation());

    act(() => {
      result.navigateToTask(0); // Invalid index
      result.navigateToTask(4); // Out of bounds
    });

    expect(mockSetCurrentIndex).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('should exit flow and reset state', () => {
    const { result } = renderHook(() => useAINavigation());

    act(() => {
      result.exitFlow();
    });

    expect(mockReset).toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  it('should navigate to tabs when cannot go back', () => {
    mockCanGoBack.mockReturnValue(false);
    
    const { result } = renderHook(() => useAINavigation());

    act(() => {
      result.exitFlow();
    });

    expect(mockReset).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('should handle continueFlow without onComplete callback', async () => {
    const { result } = renderHook(() => useAINavigation());

    let flowResult: string;
    await act(async () => {
      flowResult = await result.continueFlow(); // No callback
    });

    expect(flowResult!).toBe('Task 1 processed! Showing task 2 of 3');
    expect(mockSetCurrentIndex).toHaveBeenCalled();
  });
});