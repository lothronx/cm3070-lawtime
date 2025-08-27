import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, ScrollView, StyleSheet, Alert } from "react-native";
import { Snackbar } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import Header from "@/components/Header";
import LoadingComponent from "@/components/LoadingComponent";
import TaskFormSection from "@/components/task/TaskFormSection";
import AttachmentsSection from "@/components/task/AttachmentsSection";
import SaveButton from "@/components/task/SaveButton";
import DiscardButton from "@/components/task/DiscardButton";
import DeleteButton from "@/components/task/DeleteButton";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import { TaskWithClient, TaskFile } from "@/types";
import { useTasks } from "@/hooks/useTasks";
import { useTaskLoading } from "@/hooks/useTaskLoading";

export default function Task() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { taskId, stackIndex, stackTotal } = useLocalSearchParams<{
    mode?: string;
    taskId?: string;
    stackIndex?: string;
    stackTotal?: string;
  }>();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [hasUploadedFiles, setHasUploadedFiles] = useState(false);

  // Use the tasks hook for all task operations with proper cache invalidation
  const { createTask, updateTask, deleteTask, tasks, isLoading: tasksLoading } = useTasks();

  // Form operations will be handled by TaskFormSection component
  const [formState, setFormState] = useState<{
    control: any;
    handleSubmit: any;
    errors: any;
    isSubmitting: boolean;
    isDirty: boolean;
    trigger: any;
    reset: any;
  } | null>(null);

  // Attachment operations will be handled by AttachmentsSection component
  const [attachmentHooks, setAttachmentHooks] = useState<{
    commitTempFiles: (taskId: number, clearTempAfterCommit?: boolean) => Promise<TaskFile[]>;
    clearTempFiles: () => Promise<void>;
    uploading: boolean;
    committing: boolean;
  } | null>(null);

  // Refs for scroll control
  const scrollViewRef = useRef<ScrollView>(null);

  // Determine screen mode based on URL parameters
  const isEditMode = !!taskId; // Edit mode if taskId is provided
  const isAIFlow = !!(stackIndex && stackTotal); // AI flow if stack parameters provided
  const [currentTaskIndex, setCurrentTaskIndex] = useState(
    stackIndex ? parseInt(stackIndex, 10) : 1
  );
  const [totalTasks] = useState(stackTotal ? parseInt(stackTotal, 10) : 1);

  // Clean up temp files on component unmount
  useEffect(() => {
    const clearTempFilesRef = attachmentHooks?.clearTempFiles;

    return () => {
      // Do not clean up temp files if there are more AI proposed tasks to handle
      const doNotCleanupOnUnmount = isAIFlow && currentTaskIndex !== totalTasks;

      if (!doNotCleanupOnUnmount && clearTempFilesRef) {
        clearTempFilesRef().catch((error) => {
          console.warn("Failed to clear temp files on unmount:", error);
        });
      }
    };
  }, [isAIFlow, currentTaskIndex, totalTasks]);

  const onSubmit = async (data: TaskWithClient) => {
    console.log("Form submitted:", data);

    try {
      let savedTaskId: number;

      if (isEditMode && taskId) {
        // Update existing task using hook with proper cache invalidation
        await updateTask(parseInt(taskId, 10), data);
        savedTaskId = parseInt(taskId, 10);
      } else {
        // Create new task using hook with proper cache invalidation
        const newTask = await createTask(data);
        savedTaskId = newTask.id;
      }

      // Commit temp files to permanent storage after successful task save
      if (attachmentHooks?.commitTempFiles) {
        try {
          // In AI flow, only clear temp files on the last task
          // In manual entry, always clear temp files
          const shouldClearTempFiles = !isAIFlow || currentTaskIndex === totalTasks;
          await attachmentHooks.commitTempFiles(savedTaskId, shouldClearTempFiles);
          console.log("Temp files committed successfully for task:", savedTaskId);
        } catch (fileError) {
          console.error("File commitment failed:", fileError);
          // Task was saved but files failed - show warning instead of hard error
          setSnackbarMessage(
            "Task saved but some files failed to attach. Please try re-uploading them."
          );
          setSnackbarVisible(true);
          return; // Exit early to show the error message
        }
      }

      // Clear unsaved changes flags on successful save
      setHasUploadedFiles(false);

      // Success - handle different flow types
      if (isAIFlow) {
        // AI flow: move to next task or finish
        if (currentTaskIndex < totalTasks) {
          setCurrentTaskIndex(currentTaskIndex + 1);
          setSnackbarMessage(
            `Task ${currentTaskIndex} saved! Showing task ${currentTaskIndex + 1} of ${totalTasks}`
          );
          // TODO: Load next AI-proposed task data
        } else {
          setSnackbarMessage("All tasks saved successfully!");
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
        setSnackbarMessage(`Task ${action} successfully!`);
        // Navigate back after a brief delay to show success message
        setTimeout(() => {
          router.back();
        }, 1000);
      }

      setSnackbarVisible(true);
    } catch (error) {
      console.error("Unexpected error in onSubmit:", error);
      const action = isEditMode ? "update" : "save";
      setSnackbarMessage(`Failed to ${action} task. Please try again.`);
      setSnackbarVisible(true);
    }
  };

  const handleDiscardPress = async () => {
    console.log("Task discarded");

    // Only clean up temp files in these cases:
    // 1. Not an AI flow (manual entry)
    // 2. Last task in AI flow
    const shouldCleanupTempFiles = !isAIFlow || currentTaskIndex === totalTasks;

    if (shouldCleanupTempFiles && attachmentHooks?.clearTempFiles) {
      try {
        await attachmentHooks.clearTempFiles();
        console.log("Temp files cleared on discard");
      } catch (error) {
        console.warn("Failed to clear temp files on discard:", error);
        // Don't block the discard flow for cleanup failures
      }
    }

    if (isAIFlow) {
      // AI flow: move to next task or finish
      if (currentTaskIndex < totalTasks) {
        setCurrentTaskIndex(currentTaskIndex + 1);
        setSnackbarMessage(
          `Task ${currentTaskIndex} discarded. Showing task ${
            currentTaskIndex + 1
          } of ${totalTasks}`
        );
        // TODO: Load next AI-proposed task data
      } else {
        setSnackbarMessage("AI flow completed!");
        router.back();
      }
    } else {
      // Manual entry: just go back
      setSnackbarMessage("Changes discarded");
      router.back();
    }

    setSnackbarVisible(true);
  };

  const handleCloseWithUnsavedChanges = () => {
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
              handleDiscardPress();
            },
          },
        ]
      );
    } else {
      // No unsaved changes, close normally
      router.back();
    }
  };

  const handleDeletePress = async () => {
    if (!isEditMode || !taskId) {
      console.log("Cannot delete: not in edit mode or no task ID");
      return;
    }

    console.log("Deleting task:", taskId);

    try {
      // Delete task using hook with proper cache invalidation
      // This automatically deletes associated permanent task files via database cascading
      await deleteTask(parseInt(taskId, 10));

      // Clean up any temp files as per business logic requirement
      if (attachmentHooks?.clearTempFiles) {
        try {
          await attachmentHooks.clearTempFiles();
          console.log("Temp files cleared after task deletion");
        } catch (error) {
          console.warn("Failed to clear temp files after task deletion:", error);
          // Don't block the delete flow for temp cleanup failures
        }
      }

      setSnackbarMessage("Task deleted successfully");
      setSnackbarVisible(true);

      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error) {
      console.error("Failed to delete task:", error);
      setSnackbarMessage("Failed to delete task. Please try again.");
      setSnackbarVisible(true);
    }
  };

  const handleSavePress = async () => {
    if (!formState) {
      console.warn("Form state not available");
      return;
    }

    // Trigger validation on all fields
    const isValid = await formState.trigger();

    if (!isValid) {
      // Show first error message in snackbar
      const firstError = Object.values(formState.errors)[0] as any;
      const errorMessage = firstError?.message || "Please fix the errors above";
      setSnackbarMessage(errorMessage);
      setSnackbarVisible(true);
      return;
    }

    // If valid, submit the form
    formState.handleSubmit(onSubmit)();
  };

  // Snackbar handler for child components
  const handleSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // Handler for form state changes from child component
  const handleFormStateChange = useCallback(
    (newFormState: {
      control: any;
      handleSubmit: any;
      errors: any;
      isSubmitting: boolean;
      isDirty: boolean;
      trigger: any;
      reset: any;
    }) => {
      setFormState(newFormState);
    },
    []
  );

  // Handler for attachment hooks changes from child component
  const handleAttachmentHooksChange = useCallback(
    (hooks: {
      commitTempFiles: (taskId: number, clearTempAfterCommit?: boolean) => Promise<TaskFile[]>;
      clearTempFiles: () => Promise<void>;
      uploading: boolean;
      committing: boolean;
    }) => {
      setAttachmentHooks(hooks);
    },
    []
  );

  // Consolidate all loading states using custom hook
  const { isLoading } = useTaskLoading({ formState, attachmentHooks });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title={isEditMode ? "Edit Task" : "New Task"}
        variant="modal"
        stackIndex={isAIFlow ? currentTaskIndex : undefined}
        stackTotal={isAIFlow ? totalTasks : undefined}
        onClose={handleCloseWithUnsavedChanges}
      />

      {tasksLoading ? (
        <LoadingComponent message="Loading task data..." />
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={true}
          contentInsetAdjustmentBehavior="automatic">
          <TaskFormSection
            taskId={taskId}
            tasks={tasks}
            tasksLoading={tasksLoading}
            isEditMode={isEditMode}
            scrollViewRef={scrollViewRef}
            onFormStateChange={handleFormStateChange}
            onSnackbar={handleSnackbar}
          />

          <AttachmentsSection
            taskId={taskId ? parseInt(taskId, 10) : undefined}
            onFileUpload={() => setHasUploadedFiles(true)}
            onSnackbar={handleSnackbar}
            onHooksChange={handleAttachmentHooksChange}
            externalLoading={formState?.isSubmitting || false}
          />

          <View style={isAIFlow ? styles.buttonRow : styles.buttonSingle}>
            <SaveButton
              onPress={handleSavePress}
              loading={isLoading}
              title={isEditMode ? "Update" : "Save"}
            />
            {isAIFlow && <DiscardButton onPress={handleDiscardPress} loading={isLoading} />}
          </View>
          {isEditMode && (
            <View style={styles.deleteButtonContainer}>
              <DeleteButton onPress={handleDeletePress} loading={isLoading} />
            </View>
          )}
        </ScrollView>
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={{
          backgroundColor: snackbarMessage.includes("successfully")
            ? theme.colors.secondary
            : theme.colors.error,
        }}>
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  buttonSingle: {
    marginTop: SPACING.lg,
  },
  deleteButtonContainer: {
    marginTop: SPACING.lg,
  },
});
