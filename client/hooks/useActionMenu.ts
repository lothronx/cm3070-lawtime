import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useImagePicker } from '@/hooks/useImagePicker';
import { useFileOperations } from '@/hooks/useFileOperations';
import { useAIProcessing } from '@/hooks/useAIProcessing';


export interface ActionMenuHandlers {
  onPhotoLibrary: () => void;
  onTakePhoto: () => void;
  onAudioHoldStart: () => void;
  onAudioHoldEnd: () => boolean; // Returns true if recording was successful
  onManualPress: () => void;
  // Audio validation state
  showTooShortWarning: boolean;
  dismissTooShortWarning: () => void;
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

  const { uploadToTemp, attachments } = fileOperations;

  // AI processing integration
  const aiProcessing = useAIProcessing({ attachments });

  // Compute upload progress from both file upload and AI processing
  const uploadProgress = isUploading ? 'Uploading files...' : aiProcessing.progress;

  // File operation handlers
  const handleFilesSelected = useCallback(async (files: { uri: string; fileName: string; originalName: string; mimeType: string; size: number }[]) => {
    setIsUploading(true);
    await uploadToTemp(files);
  }, [uploadToTemp]);

  const handleSuccess = useCallback((message: string) => {
    console.log('File upload success:', message);
    setIsUploading(false);
    // Trigger AI processing when files are successfully uploaded
    aiProcessing.triggerProcessing();
  }, [aiProcessing]);

  const handleError = useCallback((message: string) => {
    console.error('File selection error:', message);
    setIsUploading(false);
  }, []);

  // Image picker integration
  const { openImagePicker } = useImagePicker({
    onFilesSelected: handleFilesSelected,
    onSuccess: handleSuccess,
    onError: handleError
  });

  // Action handlers
  const onPhotoLibrary = useCallback(async () => {
    console.log('Photo library selected');
    try {
      await openImagePicker();
    } catch (error) {
      console.error('Failed to open photo library:', error);
    }
  }, [openImagePicker]);

  const onTakePhoto = useCallback(async () => {
    console.log('Take photo selected');
    // TODO: Implement camera functionality
  }, []);

  const onAudioHoldStart = useCallback(() => {
    console.log('Audio recording started');
    setRecordingStartTime(Date.now());
    setShowTooShortWarning(false);
    // TODO: Implement audio recording start
  }, []);

  const onAudioHoldEnd = useCallback(() => {
    const duration = Date.now() - recordingStartTime;

    if (duration < 1000) {
      console.log('Audio recording too short:', duration + 'ms');
      setShowTooShortWarning(true);
      return false; // Recording failed - don't close menu
    }

    console.log('Audio recording ended, duration:', duration + 'ms');
    // TODO: Implement audio processing
    return true; // Recording successful - close menu
  }, [recordingStartTime]);

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
    isUploading: isUploading || aiProcessing.isProcessing,
    uploadProgress,
  };
}