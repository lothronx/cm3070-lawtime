import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { TaskWithClient, TaskFile } from '@/types';
import { useTasks } from '@/hooks/useTasks';

interface AttachmentHooks {
  commitTempFiles: (taskId: number, clearTempAfterCommit?: boolean) => Promise<TaskFile[]>;
  clearTempFiles: () => Promise<void>;
  uploading: boolean;
  committing: boolean;
}

interface FormState {
  isDirty?: boolean;
}

interface UseTaskOperationsParams {
  taskId?: string;
  isEditMode: boolean;
  isAIFlow: boolean;
  currentTaskIndex: number;
  totalTasks: number;
  attachmentHooks?: AttachmentHooks | null;
}

interface UseTaskOperationsReturn {
  // Task operations
  handleSave: (data: TaskWithClient) => Promise<void>;
  handleDelete: () => Promise<void>;
  handleDiscard: () => Promise<void>;
  // UI feedback
  snackbarVisible: boolean;
  snackbarMessage: string;
  showMessage: (message: string) => void;
  setSnackbarVisible: (value: boolean) => void;
  handleCloseWithUnsavedChanges: (formState?: FormState | null) => void;
}

/**
 * Task operations hook with consolidated data and business logic
 * Responsibilities:
 * - File operations workflow integration
 * - AI flow navigation logic
 * - Success/error message handling
 */
export function useTaskOperations({
  taskId,
  isEditMode,
  isAIFlow,
  currentTaskIndex,
  totalTasks,
  attachmentHooks,
}: UseTaskOperationsParams): UseTaskOperationsReturn {
  const router = useRouter();
  const { createTask, updateTask, deleteTask } = useTasks();

  // UI feedback state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const showMessage = useCallback((message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  }, []);

  const handleSave = useCallback(async (data: TaskWithClient) => {
    console.log("Form submitted:", data);

    try {
      let savedTaskId: number;

      if (isEditMode && taskId) {
        await updateTask(parseInt(taskId, 10), data);
        savedTaskId = parseInt(taskId, 10);
      } else {
        const newTask = await createTask(data);
        savedTaskId = newTask.id;
      }

      // Commit temp files to permanent storage after successful task save
      if (attachmentHooks?.commitTempFiles) {
        try {
          const shouldClearTempFiles = !isAIFlow || currentTaskIndex === totalTasks;
          await attachmentHooks.commitTempFiles(savedTaskId, shouldClearTempFiles);
          console.log("Temp files committed successfully for task:", savedTaskId);
        } catch (fileError) {
          console.error("File commitment failed:", fileError);
          showMessage("Task saved but some files failed to attach. Please try re-uploading them.");
          return;
        }
      }

      // Success handling
      if (isAIFlow) {
        if (currentTaskIndex < totalTasks) {
          showMessage(`Task ${currentTaskIndex} saved! Showing task ${currentTaskIndex + 1} of ${totalTasks}`);
        } else {
          showMessage("All tasks saved successfully!");
          // Clear temp files when completing the entire AI flow
          if (attachmentHooks?.clearTempFiles) {
            try {
              await attachmentHooks.clearTempFiles();
              console.log("Temp files cleared after completing AI flow");
            } catch (error) {
              console.warn("Failed to clear temp files after AI flow completion:", error);
            }
          }
          router.back();
        }
      } else {
        const action = isEditMode ? "updated" : "saved";
        showMessage(`Task ${action} successfully!`);
        setTimeout(() => router.back(), 1000);
      }
    } catch (error) {
      console.error("Unexpected error in handleSave:", error);
      const action = isEditMode ? "update" : "save";
      showMessage(`Failed to ${action} task. Please try again.`);
    }
  }, [taskId, isEditMode, isAIFlow, currentTaskIndex, totalTasks, attachmentHooks, showMessage, createTask, updateTask, router]);

  const handleDelete = useCallback(async () => {
    if (!isEditMode || !taskId) {
      console.log("Cannot delete: not in edit mode or no task ID");
      return;
    }

    console.log("Deleting task:", taskId);

    try {
      await deleteTask(parseInt(taskId, 10));

      // Clean up any temp files
      if (attachmentHooks?.clearTempFiles) {
        try {
          await attachmentHooks.clearTempFiles();
          console.log("Temp files cleared after task deletion");
        } catch (error) {
          console.warn("Failed to clear temp files after task deletion:", error);
        }
      }

      showMessage("Task deleted successfully");
      setTimeout(() => router.back(), 1000);
    } catch (error) {
      console.error("Failed to delete task:", error);
      showMessage("Failed to delete task. Please try again.");
    }
  }, [isEditMode, taskId, attachmentHooks, showMessage, deleteTask, router]);

  const handleDiscard = useCallback(async () => {
    console.log("Task discarded");

    const shouldCleanupTempFiles = !isAIFlow || currentTaskIndex === totalTasks;

    if (shouldCleanupTempFiles && attachmentHooks?.clearTempFiles) {
      try {
        await attachmentHooks.clearTempFiles();
        console.log("Temp files cleared on discard");
      } catch (error) {
        console.warn("Failed to clear temp files on discard:", error);
      }
    }

    if (isAIFlow) {
      if (currentTaskIndex < totalTasks) {
        showMessage(`Task ${currentTaskIndex} discarded. Showing task ${currentTaskIndex + 1} of ${totalTasks}`);
      } else {
        showMessage("AI flow completed!");
        router.back();
      }
    } else {
      showMessage("Changes discarded");
      router.back();
    }
  }, [isAIFlow, currentTaskIndex, totalTasks, attachmentHooks, showMessage, router]);

  const handleCloseWithUnsavedChanges = useCallback((formState?: FormState | null) => {
    // Check if there are unsaved changes (only form dirty now - files are auto-committed)
    const hasUnsavedChanges = formState?.isDirty;

    if (hasUnsavedChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved form changes that will be lost. Are you sure you want to close?",
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
              handleDiscard();
            },
          },
        ]
      );
    } else {
      // No unsaved changes, close normally
      router.back();
    }
  }, [handleDiscard, router]);

  return {
    // Task operations
    handleSave,
    handleDelete,
    handleDiscard,
    // UI feedback
    snackbarVisible,
    snackbarMessage,
    showMessage,
    setSnackbarVisible,
    handleCloseWithUnsavedChanges,
  };
}