import { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAudioRecorder as useExpoAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorderState} from 'expo-audio';
import { processAndValidatePickerFile } from '@/utils/fileUploadUtils';

interface useAudioRecorderParams {
  onFilesSelected: (files: { uri: string; fileName: string; originalName: string; mimeType: string; size: number }[]) => Promise<void>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

/**
 * UI-focused audio recording hook
 * Responsibilities:
 * - Audio recording and permission handling
 * - File validation and user feedback
 * - Success/error messaging
 */
export function useAudioRecorder({ onFilesSelected, onSuccess, onError }: useAudioRecorderParams) {
  const audioRecorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const isRecording = recorderState.isRecording;
    
  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission to access microphone was denied');
      }

      setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, []);


  const startRecording = useCallback(async () => {
    try {
      console.log('Starting audio recording...');

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      return true;

    } catch (error) {
      console.error('Failed to start recording:', error);
      onError('Failed to start recording. Please try again.');
      return false;
    }
  }, [onError, audioRecorder]);

  const stopRecording = useCallback(async () => {
    try {
      console.log('Stopping audio recording...');

      await audioRecorder.stop();

      // Get the URI from the recorder
      const uri = audioRecorder.uri;

      if (!uri) {
        console.error('Recording URI is null');
        onError('Failed to save recording. Please try again.');
        return false;
      }

      console.log('Recording saved to:', uri);

      // Create a file object for the recording
      const timestamp = Date.now();
      const fileName = `recording_${timestamp}.m4a`;

      // Process the recording file (fileSize will default to 0, which is fine for audio)
      const { file, validation } = processAndValidatePickerFile({
        uri,
        fileName,
        mimeType: 'audio/m4a',
      });

      if (!validation.isValid) {
        Alert.alert('File Validation Error', validation.error, [{ text: 'OK' }]);
        return false;
      }

      // Upload the validated file
      await onFilesSelected([file]);
      onSuccess('Audio recording uploaded successfully');

      return true;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      onError('Failed to save recording. Please try again.');
      return false;
    }
  }, [onFilesSelected, onSuccess, onError, audioRecorder]);

  const cancelRecording = useCallback(async () => {
    try {
      console.log('Cancelling audio recording...');
      await audioRecorder.stop();

    } catch (error) {
      console.error('Error cancelling recording:', error);
    }
  }, [audioRecorder]);

  return {  
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording
  };
}