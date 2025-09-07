import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { processAndValidatePickerFile } from '@/utils/fileUploadUtils';

interface useImagePickerParams {
  onFilesSelected: (files: { uri: string; fileName: string; originalName: string; mimeType: string; size: number }[]) => Promise<void>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

/**
 * UI-focused file picker hook
 * Responsibilities:
 * - Image picker and camera interactions
 * - Permission handling
 * - File validation and user feedback
 * - Success/error messaging
 */
export function useImagePicker({ onFilesSelected, onSuccess, onError }: useImagePickerParams) {

  // Shared file processing logic
  const processPickerResult = useCallback(async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    // Validate and process each file
    const validFiles = [];
    const invalidFiles = [];

    for (const asset of result.assets) {
      const { file, validation } = processAndValidatePickerFile(asset);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        invalidFiles.push({ fileName: asset.fileName || "unknown", error: validation.error });
      }
    }

    // Show validation errors if any
    if (invalidFiles.length > 0) {
      const errorMessage = `${invalidFiles.length} file(s) were skipped:\n${invalidFiles
        .map((f) => `• ${f.fileName}: ${f.error}`)
        .join("\n")}`;
      Alert.alert("File Validation Error", errorMessage, [{ text: "OK" }]);

      // If no valid files, return early
      if (validFiles.length === 0) {
        return;
      }
    }

    // Process valid files
    await onFilesSelected(validFiles);

    // Show success message
    const successMessage =
      validFiles.length === 1
        ? "1 photo added successfully"
        : `${validFiles.length} photos added successfully`;

    onSuccess(successMessage);
  }, [onFilesSelected, onSuccess]);

  const openImagePicker = useCallback(async () => {
    console.log("Opening image picker");

    try {
      // Request permission to access media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant access to your photo library to add images.",
          [{ text: "OK" }]
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

      await processPickerResult(result);

    } catch (error) {
      console.error("Photo selection error:", error);
      onError("Failed to add photos. Please try again.");
    }
  }, [processPickerResult, onError]);

  const openCamera = useCallback(async () => {
    console.log("Opening camera");

    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant camera access to take photos.",
          [{ text: "OK" }]
        );
        return;
      }

      // For multiple photos, we need to implement a capture loop
      // Since expo-image-picker doesn't support multiple capture directly,
      // we'll use a simple approach with a prompt for more photos
      const capturedPhotos = [];
      let shouldContinue = true;

      while (shouldContinue) {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.8,
          exif: false,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          break;
        }

        // Add the captured photo to our collection
        capturedPhotos.push(...result.assets);

        // Ask if user wants to take another photo
        await new Promise((resolve) => {
          Alert.alert(
            "Photo Captured",
            `${capturedPhotos.length} photo(s) captured. Take another photo?`,
            [
              {
                text: "Done",
                style: "cancel",
                onPress: () => {
                  shouldContinue = false;
                  resolve(true);
                },
              },
              {
                text: "Take Another",
                onPress: () => resolve(true),
              },
            ]
          );
        });
      }

      if (capturedPhotos.length === 0) {
        return;
      }

      // Create a mock result object for processing
      const mockResult: ImagePicker.ImagePickerResult = {
        canceled: false,
        assets: capturedPhotos,
      };

      await processPickerResult(mockResult);

    } catch (error) {
      console.error("Camera error:", error);
      onError("Failed to take photos. Please try again.");
    }
  }, [processPickerResult, onError]);

  return {
    openImagePicker,
    openCamera,
  };
}