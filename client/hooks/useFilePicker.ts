import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { processAndValidatePickerFile } from '@/utils/fileUploadUtils';

interface UseFilePickerParams {
  onFilesSelected: (files: { uri: string; fileName: string; originalName: string; mimeType: string; size: number }[]) => Promise<void>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

/**
 * UI-focused file picker hook
 * Responsibilities:
 * - Image picker interactions
 * - Permission handling
 * - File validation and user feedback
 * - Success/error messaging
 */
export function useFilePicker({ onFilesSelected, onSuccess, onError }: UseFilePickerParams) {

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
    } catch (error) {
      console.error("Photo selection error:", error);
      onError("Failed to add photos. Please try again.");
    }
  }, [onFilesSelected, onSuccess, onError]);

  return {
    openImagePicker,
  };
}