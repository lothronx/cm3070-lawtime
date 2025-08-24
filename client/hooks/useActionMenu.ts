import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { fileStorageService } from '@/services/fileStorageService';
import { generateUploadBatchId, processPickerFile, generateUniqueFileName } from '@/utils/fileUploadUtils';

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
  // Upload state
  isUploading: boolean;
  uploadProgress: string;
}

/**
 * Hook to handle ActionMenu business logic
 */
export function useActionMenu(): ActionMenuHandlers {
  const router = useRouter();

  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [showTooShortWarning, setShowTooShortWarning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const onPhotoLibrary = useCallback(async () => {
    console.log('Photo library selected');
    
    try {
      // Request permission to access media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant access to your photo library to upload images.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch image picker with multiple selection
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
        exif: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsUploading(true);
      setUploadProgress(`Uploading ${result.assets.length} file(s)...`);

      // Generate batch ID and process files
      const uploadBatchId = generateUploadBatchId();
      const files = result.assets.map(processPickerFile);

      // Upload files to temporary storage sequentially
      const uploadResults = [];
      for (const file of files) {
        const result = await fileStorageService.uploadToTemp(file, uploadBatchId);
        uploadResults.push(result);
      }
      
      setUploadProgress('Processing images...');

      // Navigate to task creation with upload info
      router.push({
        pathname: '/task',
        params: {
          mode: 'create',
          source: 'ocr',
          uploadBatchId,
          fileCount: files.length.toString(),
          tempUrls: uploadResults.map((r: { publicUrl: string }) => r.publicUrl).join(',')
        }
      });

    } catch (error) {
      console.error('Photo library error:', error);
      Alert.alert(
        'Upload Failed',
        'Failed to upload images. Please try again or enter the task manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  }, [router]);

  const onTakePhoto = useCallback(async () => {
    console.log('Take photo selected');
    
    try {
      // Request permission to access camera
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera access to take photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        quality: 0.8,
        exif: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsUploading(true);
      setUploadProgress('Uploading photo...');

      // Generate batch ID and process files
      const uploadBatchId = generateUploadBatchId();
      const files = result.assets.map(processPickerFile);

      // Upload file to temporary storage
      const uploadResults = [];
      for (const file of files) {
        const result = await fileStorageService.uploadToTemp(file, uploadBatchId);
        uploadResults.push(result);
      }

      setUploadProgress('Processing photo...');

      // Navigate to task creation with upload info
      router.push({
        pathname: '/task',
        params: {
          mode: 'create',
          source: 'ocr',
          uploadBatchId,
          fileCount: '1',
          tempUrls: uploadResults[0].publicUrl
        }
      });

    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert(
        'Upload Failed',
        'Failed to upload photo. Please try again or enter the task manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  }, [router]);

  const onChooseFile = useCallback(async () => {
    console.log('Choose file selected');
    
    try {
      // Launch document picker
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsUploading(true);
      setUploadProgress(`Uploading ${result.assets.length} file(s)...`);

      // Generate batch ID and convert document picker results
      const uploadBatchId = generateUploadBatchId();
      const files = result.assets.map(asset => ({
        uri: asset.uri,
        fileName: generateUniqueFileName(asset.name),
        originalName: asset.name,
        mimeType: asset.mimeType || 'application/octet-stream',
        size: asset.size || 0,
      }));

      // Upload files to temporary storage
      const uploadResults = [];
      for (const file of files) {
        const result = await fileStorageService.uploadToTemp(file, uploadBatchId);
        uploadResults.push(result);
      }

      setUploadProgress('Processing files...');

      // Navigate to task creation with upload info
      router.push({
        pathname: '/task',
        params: {
          mode: 'create',
          source: 'ocr',
          uploadBatchId,
          fileCount: files.length.toString(),
          tempUrls: uploadResults.map((r: { publicUrl: string }) => r.publicUrl).join(',')
        }
      });

    } catch (error) {
      console.error('File picker error:', error);
      Alert.alert(
        'Upload Failed',
        'Failed to upload files. Please try again or enter the task manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  }, [router]);

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
    router.push('/task?mode=create');
  }, [router]);

  return {
    onPhotoLibrary,
    onTakePhoto,
    onChooseFile,
    onAudioHoldStart,
    onAudioHoldEnd,
    onManualPress,
    showTooShortWarning,
    dismissTooShortWarning,
    isUploading,
    uploadProgress,
  };
}