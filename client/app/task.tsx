import React, { useState, useRef, useEffect } from "react";
import { View, ScrollView, StyleSheet, Linking, Alert } from "react-native";
import { Snackbar, Text } from "react-native-paper";
import { useForm } from "react-hook-form";
import { useRouter, useLocalSearchParams } from "expo-router";
import Header from "@/components/Header";
import LoadingComponent from "@/components/LoadingComponent";
import TitleInput from "@/components/task/TitleInput";
import ClientAutocompleteInput from "@/components/task/ClientAutocompleteInput";
import LocationInput from "@/components/task/LocationInput";
import NoteInput from "@/components/task/NoteInput";
import AttachmentsSection from "@/components/task/AttachmentsSection";
import * as ImagePicker from "expo-image-picker";
import { processAndValidatePickerFile } from "@/utils/fileUploadUtils";
import DateTimeInput from "@/components/task/DateTimeInput";
import SaveButton from "@/components/task/SaveButton";
import DiscardButton from "@/components/task/DiscardButton";
import DeleteButton from "@/components/task/DeleteButton";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import { TaskWithClient, isPermanentAttachment } from "@/types";
import { useTasks } from "@/hooks/useTasks";
import { useTaskFiles } from "@/hooks/useTaskFiles";

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

  // Use the task files hook for file operations
  const {
    attachments,
    isLoading: taskFilesLoading,
    error: taskFilesError,
    uploading,
    committing,
    upload,
    delete: deleteAttachment,
    preview,
    isDeleting,
    isUploading: isAttachmentUploading,
    commitTempFiles,
    clearTempFiles,
  } = useTaskFiles(taskId ? parseInt(taskId, 10) : null);

  // Refs for scroll control
  const scrollViewRef = useRef<ScrollView>(null);

  // Determine screen mode based on URL parameters
  const isEditMode = !!taskId; // Edit mode if taskId is provided
  const isAIFlow = !!(stackIndex && stackTotal); // AI flow if stack parameters provided
  const [currentTaskIndex, setCurrentTaskIndex] = useState(
    stackIndex ? parseInt(stackIndex, 10) : 1
  );
  const [totalTasks] = useState(stackTotal ? parseInt(stackTotal, 10) : 1);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    trigger,
    reset,
  } = useForm<TaskWithClient>({
    defaultValues: {
      title: "",
      client_name: "",
      event_time: null,
      location: null,
      note: null,
    },
    mode: "onBlur", // Only validate after user leaves field
  });

  // Load existing task data for edit mode using cache-first approach
  useEffect(() => {
    if (isEditMode && taskId && !tasksLoading) {
      try {
        // Find task directly from tasks array to avoid function dependency issues
        const task = tasks.find((t) => t.id === parseInt(taskId, 10));
        console.log("Loading task data:", { taskId, tasks: tasks.length, foundTask: !!task, task });

        if (task) {
          console.log("Resetting form with task data:", {
            title: task.title,
            client_name: task.client_name,
            event_time: task.event_time,
            location: task.location,
            note: task.note,
          });

          reset({
            title: task.title,
            client_name: task.client_name || "",
            event_time: task.event_time,
            location: task.location || "",
            note: task.note || "",
          });

          // Reset file upload state since we're loading existing data
          setHasUploadedFiles(false);
        } else if (tasks.length > 0) {
          // Tasks are loaded but specific task not found
          console.warn(
            "Task not found in cache:",
            taskId,
            "Available tasks:",
            tasks.map((t) => t.id)
          );
          setSnackbarMessage("Task not found");
          setSnackbarVisible(true);
        }
        // If tasks.length === 0, we're still waiting for data to load
      } catch (error) {
        console.error("Failed to load task:", error);
        setSnackbarMessage("Failed to load task data");
        setSnackbarVisible(true);
      }
    }
  }, [isEditMode, taskId, tasks, tasksLoading, reset]);

  // Clean up temp files on component unmount (e.g., navigation away without save)
  useEffect(() => {
    return () => {
      // Only clean up temp files in these cases:
      // 1. Manual new task (not edit mode AND not AI flow)
      // 2. AI flow last task (not edit mode AND AI flow last task)
      // 3. Edit mode (always clear temp files when leaving edit mode)
      const doNotCleanupOnUnmount = isAIFlow && currentTaskIndex !== totalTasks;

      if (doNotCleanupOnUnmount) {
        clearTempFiles().catch((error) => {
          console.warn("Failed to clear temp files on unmount:", error);
        });
      }
    };
  }, [clearTempFiles, isAIFlow, currentTaskIndex, totalTasks]);

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
      try {
        // In AI flow, only clear temp files on the last task
        // In manual entry, always clear temp files
        const shouldClearTempFiles = !isAIFlow || currentTaskIndex === totalTasks;
        await commitTempFiles(savedTaskId, shouldClearTempFiles);
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
          try {
            await clearTempFiles();
            console.log("Temp files cleared after completing AI flow");
          } catch (error) {
            console.warn("Failed to clear temp files after AI flow completion:", error);
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

    if (shouldCleanupTempFiles) {
      try {
        await clearTempFiles();
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
    const hasUnsavedChanges = isDirty || hasUploadedFiles;

    if (hasUnsavedChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes that will be lost. Are you sure you want to close?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Close Without Saving",
            style: "destructive",
            onPress: () => {
              // Handle cleanup before closing
              handleDiscardPress();
            }
          }
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
      try {
        await clearTempFiles();
        console.log("Temp files cleared after task deletion");
      } catch (error) {
        console.warn("Failed to clear temp files after task deletion:", error);
        // Don't block the delete flow for temp cleanup failures
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

  const handleNoteInputFocus = () => {
    const scrollY = 350;
    scrollViewRef.current?.scrollTo({
      y: scrollY,
      animated: true,
    });
  };

  const handleSavePress = async () => {
    // Trigger validation on all fields
    const isValid = await trigger();

    if (!isValid) {
      // Show first error message in snackbar
      const firstError = Object.values(errors)[0];
      const errorMessage = firstError?.message || "Please fix the errors above";
      setSnackbarMessage(errorMessage);
      setSnackbarVisible(true);
      return;
    }

    // If valid, submit the form
    handleSubmit(onSubmit)();
  };

  const handleAddAttachment = async () => {
    console.log("Add attachment pressed");

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

      // Validate and upload files to temp storage
      const validFiles = [];
      const invalidFiles = [];

      // Process and validate each file
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

      // Upload valid files
      await upload(validFiles);

      // Mark that files have been uploaded (unsaved changes)
      setHasUploadedFiles(true);

      const successMessage =
        validFiles.length === 1
          ? "1 photo added successfully"
          : `${validFiles.length} photos added successfully`;

      setSnackbarMessage(successMessage);
      setSnackbarVisible(true);
    } catch (error) {
      console.error("Photo selection error:", error);
      Alert.alert("Upload Failed", "Failed to add photos. Please try again.", [{ text: "OK" }]);
    }
  };

  const handleDeleteAttachment = async (id: string | number) => {
    console.log("Delete attachment:", id);

    // Find the attachment to get its name for confirmation
    const attachment = attachments.find((att) => att.id === id);
    if (!attachment) {
      console.warn("Attachment not found:", id);
      setSnackbarMessage("Attachment not found");
      setSnackbarVisible(true);
      return;
    }

    // Show confirmation dialog for permanent files
    const isPermanent = isPermanentAttachment(attachment);
    if (isPermanent) {
      Alert.alert(
        "Delete Attachment",
        `Are you sure you want to delete "${attachment.file_name}"? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteAttachment(id),
          },
        ]
      );
    } else {
      // Temp files can be deleted without confirmation
      deleteAttachment(id);
    }
  };

  const handlePreviewAttachment = async (id: string | number) => {
    console.log("Preview attachment:", id);

    try {
      // Find the attachment in attachments
      const attachment = attachments.find((att) => att.id === id);
      if (!attachment) {
        console.warn("Attachment not found:", id);
        setSnackbarMessage("File not found");
        setSnackbarVisible(true);
        return;
      }

      // Get unified preview URL from hook (handles both temp and permanent files)
      const previewUrl = await preview(attachment);

      console.log("Opening file via URL:", previewUrl);

      // Attempt to open the URL
      const supported = await Linking.canOpenURL(previewUrl);
      if (supported) {
        await Linking.openURL(previewUrl);
      } else {
        setSnackbarMessage("Cannot open this file type on your device");
        setSnackbarVisible(true);
      }
    } catch (error) {
      console.error("Failed to preview attachment:", error);
      setSnackbarMessage("Failed to open file. Please try again.");
      setSnackbarVisible(true);
    }
  };

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
          {/* Essential Information Section */}
          <View style={styles.formSection}>
            <Text
              variant="labelLarge"
              style={[styles.sectionLabel, { color: theme.colors.primary }]}>
              Task Information
            </Text>

            <TitleInput control={control} name="title" error={errors.title} />
            <ClientAutocompleteInput
              control={control}
              name="client_name"
              error={errors.client_name}
            />
          </View>

          {/* Schedule Section */}
          <View style={styles.formSection}>
            <Text
              variant="labelLarge"
              style={[styles.sectionLabel, { color: theme.colors.primary }]}>
              Time & Location
            </Text>

            <DateTimeInput control={control} name="event_time" error={errors.event_time} />

            <LocationInput control={control} name="location" error={errors.location} />
          </View>

          {/* Details Section */}
          <View style={styles.formSection}>
            <Text
              variant="labelLarge"
              style={[styles.sectionLabel, { color: theme.colors.primary }]}>
              Additional Details
            </Text>

            <NoteInput
              control={control}
              name="note"
              error={errors.note}
              onFocus={handleNoteInputFocus}
            />
          </View>

          <AttachmentsSection
            attachments={attachments}
            onDeleteAttachment={handleDeleteAttachment}
            onAddAttachment={handleAddAttachment}
            onPreviewAttachment={handlePreviewAttachment}
            loading={isSubmitting || taskFilesLoading || uploading || committing}
            error={!!taskFilesError}
            isAttachmentDeleting={isDeleting}
            isAttachmentUploading={isAttachmentUploading}
          />

          <View style={isAIFlow ? styles.buttonRow : styles.buttonSingle}>
            <SaveButton
              onPress={handleSavePress}
              loading={isSubmitting || uploading || committing}
              title={isEditMode ? "Update" : "Save"}
            />
            {isAIFlow && (
              <DiscardButton
                onPress={handleDiscardPress}
                loading={isSubmitting || uploading || committing}
              />
            )}
          </View>
          {isEditMode && (
            <View style={styles.deleteButtonContainer}>
              <DeleteButton
                onPress={handleDeletePress}
                loading={isSubmitting || uploading || committing}
              />
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
  formSection: {
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    padding: SPACING.xs,
    fontWeight: "600",
    letterSpacing: 0.5,
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
