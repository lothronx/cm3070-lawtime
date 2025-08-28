import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

interface FormState {
  isDirty?: boolean;
}

interface UseTaskNavigationParams {
  hasUploadedFiles: boolean;
  onDiscard: () => Promise<void>;
}

interface UseTaskNavigationReturn {
  snackbarVisible: boolean;
  snackbarMessage: string;
  showMessage: (message: string) => void;
  handleCloseWithUnsavedChanges: (formState?: FormState | null) => void;
  setSnackbarVisible: (value: boolean) => void;
}

export function useTaskNavigation({
  hasUploadedFiles,
  onDiscard,
}: UseTaskNavigationParams): UseTaskNavigationReturn {
  const router = useRouter();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const showMessage = useCallback((message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  }, []);

  const handleCloseWithUnsavedChanges = useCallback((formState?: FormState | null) => {
    // Check if there are unsaved changes (form dirty or uploaded files)
    const hasUnsavedChanges = formState?.isDirty || hasUploadedFiles;

    if (hasUnsavedChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes that will be lost. Are you sure you want to close?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Close Without Saving",
            style: "destructive",
            onPress: () => {
              // Handle cleanup before closing
              onDiscard();
            },
          },
        ]
      );
    } else {
      // No unsaved changes, close normally
      router.back();
    }
  }, [hasUploadedFiles, onDiscard, router]);

  return {
    snackbarVisible,
    snackbarMessage,
    showMessage,
    handleCloseWithUnsavedChanges,
    setSnackbarVisible,
  };
}