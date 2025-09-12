import React from 'react';
import { create, act } from 'react-test-renderer';
import { useActionMenu } from '../actionMenu/useActionMenu';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock all the dependent hooks
const mockOpenImagePicker = jest.fn().mockResolvedValue(undefined);
const mockOpenCamera = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/media/useImagePicker', () => ({
  useImagePicker: () => ({
    openImagePicker: mockOpenImagePicker,
    openCamera: mockOpenCamera,
  }),
}));

const mockStartRecording = jest.fn().mockResolvedValue(true);
const mockStopRecording = jest.fn().mockResolvedValue(true);
const mockCancelRecording = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/media/useAudioRecorder', () => ({
  useAudioRecorder: () => ({
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
    cancelRecording: mockCancelRecording,
    isRecording: false,
  }),
}));

const mockUploadToTemp = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/operations/useFileOperations', () => ({
  useFileOperations: () => ({
    uploadToTemp: mockUploadToTemp,
    attachments: [],
  }),
}));

const mockAIStartProcessing = jest.fn();
jest.mock('@/hooks/aiWorkFlow/useAIWorkflow', () => ({
  useAIWorkflow: () => ({
    startProcessing: mockAIStartProcessing,
  }),
}));

const mockStartProcessing = jest.fn();
const mockStopProcessing = jest.fn();
jest.mock('@/hooks/infrastructure/useProcessing', () => ({
  useProcessing: () => ({
    startProcessing: mockStartProcessing,
    stopProcessing: mockStopProcessing,
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

describe('useActionMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all required handlers and state', () => {
    const { result } = renderHook(() => useActionMenu());

    expect(result).toMatchObject({
      onPhotoLibrary: expect.any(Function),
      onTakePhoto: expect.any(Function),
      onAudioHoldStart: expect.any(Function),
      onAudioHoldEnd: expect.any(Function),
      onManualPress: expect.any(Function),
      showTooShortWarning: false,
      dismissTooShortWarning: expect.any(Function),
      isRecording: false,
    });
  });

  it('should handle manual press navigation', () => {
    const { result } = renderHook(() => useActionMenu());
    
    act(() => {
      result.onManualPress();
    });
    
    expect(mockPush).toHaveBeenCalledWith('/task?mode=create');
  });

  it('should call image picker when onPhotoLibrary is invoked', async () => {
    const { result } = renderHook(() => useActionMenu());
    
    await act(async () => {
      await result.onPhotoLibrary();
    });
    
    expect(mockOpenImagePicker).toHaveBeenCalled();
  });

  it('should call camera when onTakePhoto is invoked', async () => {
    const { result } = renderHook(() => useActionMenu());
    
    await act(async () => {
      await result.onTakePhoto();
    });
    
    expect(mockOpenCamera).toHaveBeenCalled();
  });

  it('should start audio recording when onAudioHoldStart is invoked', async () => {
    const { result } = renderHook(() => useActionMenu());
    
    await act(async () => {
      await result.onAudioHoldStart();
    });
    
    expect(mockStartRecording).toHaveBeenCalled();
  });

  it('should return functions that can be called without errors', () => {
    const { result } = renderHook(() => useActionMenu());
    
    act(() => {
      expect(() => result.dismissTooShortWarning()).not.toThrow();
    });
    expect(typeof result.onAudioHoldEnd).toBe('function');
  });
});