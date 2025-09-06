import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useImagePicker } from '@/hooks/useImagePicker';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useFileOperations } from '@/hooks/useFileOperations';
import { useAIWorkflow } from '@/hooks/useAIWorkflow';


export interface ActionMenuHandlers {
  onPhotoLibrary: () => void;
  onTakePhoto: () => void;
  onAudioHoldStart: () => void;
  onAudioHoldEnd: () => Promise<boolean>; 
  onManualPress: () => void;
  // Audio validation state
  showTooShortWarning: boolean;
  dismissTooShortWarning: () => void;
  // Recording state
  isRecording: boolean;
  // Processing state
  isUploading: boolean;
  uploadProgress: string;
}

/**
 * Hook to handle ActionMenu business logic
 *
 * Responsibilities:
 * - Menu action handlers (photo, audio, manual)
 * - Audio recording state management
 * - File upload coordination
 * - Navigation routing
 */
export function useActionMenu(): ActionMenuHandlers {
  const router = useRouter();

  // Audio recording state
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [showTooShortWarning, setShowTooShortWarning] = useState(false);

  // File upload state
  const [isUploading, setIsUploading] = useState(false);

  // File operations for temp uploads
  const fileOperations = useFileOperations({
    taskFiles: [], // No existing task files in this context
    onCreateTaskFiles: () => {}, // No-op for this use case
    onDeleteTaskFile: () => {} // No-op for this use case
  });

  // Track current action type for source type determination
  const [currentSourceType, setCurrentSourceType] = useState<'ocr' | 'asr'>('ocr');

  const { uploadToTemp, attachments } = fileOperations;

  // AI workflow hook
  const workflow = useAIWorkflow({
    attachments,
    sourceType: currentSourceType
  });

  // Compute upload progress
  const uploadProgress = isUploading ? 'Uploading files...' : workflow.processingMessage;

  // File operation handlers
  const handleFilesSelected = useCallback(async (files: { uri: string; fileName: string; originalName: string; mimeType: string; size: number }[]) => {
    setIsUploading(true);
    await uploadToTemp(files);
  }, [uploadToTemp]);

  const handleSuccess = useCallback((message: string) => {
    console.log('File upload success:', message);
    setIsUploading(false);
    
    // Navigate immediately to Task screen with loading state
    router.push({
      pathname: '/task',
      params: {
        mode: 'ai-flow',
        stackIndex: '1',
        stackTotal: '1' // Will be updated when AI processing completes
      }
    });
    
    // Trigger AI processing in background
    workflow.startProcessing();
  }, [workflow, router]);

  const handleError = useCallback((message: string) => {
    console.error('File selection error:', message);
    setIsUploading(false);
  }, []);

  // Image picker integration
  const { openImagePicker, openCamera } = useImagePicker({
    onFilesSelected: handleFilesSelected,
    onSuccess: handleSuccess,
    onError: handleError
  });

  // Audio recorder integration
  const { startRecording, stopRecording, cancelRecording, isRecording } = useAudioRecorder({
    onFilesSelected: handleFilesSelected,
    onSuccess: handleSuccess,
    onError: handleError
  });

  // Action handlers
  const onPhotoLibrary = useCallback(async () => {
    console.log('Photo library selected');
    setCurrentSourceType('ocr');
    try {
      await openImagePicker();
    } catch (error) {
      console.error('Failed to open photo library:', error);
    }
  }, [openImagePicker]);

  const onTakePhoto = useCallback(async () => {
    console.log('Take photo selected');
    setCurrentSourceType('ocr');
    try {
      await openCamera();
    } catch (error) {
      console.error('Failed to open camera:', error);
    }
  }, [openCamera]);

  const onAudioHoldStart = useCallback(async () => {
    console.log('Audio recording started');
    setCurrentSourceType('asr');
    setRecordingStartTime(Date.now());
    setShowTooShortWarning(false);

    const success = await startRecording();
    if (!success) {
      console.error('Failed to start audio recording');
    }
  }, [startRecording]);

  const onAudioHoldEnd = useCallback(async () => {
    const duration = Date.now() - recordingStartTime;

    if (duration < 1000) {
      console.log('Audio recording too short:', duration + 'ms');
      setShowTooShortWarning(true);
      await cancelRecording();
      return false; 
    }

    console.log('Audio recording ended, duration:', duration + 'ms');

    try {
      const success = await stopRecording();
      return success; 
    } catch (error) {
      console.error('Failed to stop audio recording:', error);
      return false; // Recording failed - don't close menu
    }
  }, [recordingStartTime, stopRecording, cancelRecording]);

  const dismissTooShortWarning = useCallback(() => {
    setShowTooShortWarning(false);
  }, []);

  const onManualPress = useCallback(() => {
    console.log('Manual entry selected');
    router.push('/task?mode=create');
  }, [router]);

  return {
    onPhotoLibrary,
    onTakePhoto,
    onAudioHoldStart,
    onAudioHoldEnd,
    onManualPress,
    showTooShortWarning,
    dismissTooShortWarning,
    isRecording,
    isUploading: isUploading || workflow.isProcessing,
    uploadProgress,
  };
}