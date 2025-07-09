import { useCallback, useState } from 'react';

export interface ActionMenuHandlers {
  onPhotoLibrary: () => void;
  onTakePhoto: () => void;
  onChooseFile: () => void;
  onAudioHoldStart: () => void;
  onAudioHoldEnd: () => boolean; // Returns true if recording was successful
  onManualPress: () => void;
  // Audio validation state
  showTooShortWarning: boolean;
  dismissTooShortWarning: () => void;
}

/**
 * Hook to handle ActionMenu business logic
 */
export function useActionMenu(): ActionMenuHandlers {
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [showTooShortWarning, setShowTooShortWarning] = useState(false);
  const onPhotoLibrary = useCallback(() => {
    console.log('Photo library selected');
    // TODO: Implement photo library logic
  }, []);

  const onTakePhoto = useCallback(() => {
    console.log('Take photo selected');
    // TODO: Implement camera logic
  }, []);

  const onChooseFile = useCallback(() => {
    console.log('Choose file selected');
    // TODO: Implement file picker logic
  }, []);

  const onAudioHoldStart = useCallback(() => {
    console.log('Audio recording started');
    setRecordingStartTime(Date.now());
    setShowTooShortWarning(false); // Reset warning
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
    // TODO: Implement manual task creation navigation
  }, []);

  return {
    onPhotoLibrary,
    onTakePhoto,
    onChooseFile,
    onAudioHoldStart,
    onAudioHoldEnd,
    onManualPress,
    showTooShortWarning,
    dismissTooShortWarning,
  };
}