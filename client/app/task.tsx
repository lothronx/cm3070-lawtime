import React, { useState, useRef } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Snackbar, Text } from "react-native-paper";
import { useForm } from "react-hook-form";
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import TitleInput from "@/components/task/TitleInput";
import ClientAutocompleteInput from "@/components/task/ClientAutocompleteInput";
import LocationInput from "@/components/task/LocationInput";
import NoteInput from "@/components/task/NoteInput";
import AttachmentsSection from "@/components/task/AttachmentsSection";
import DateTimeInput from "@/components/task/DateTimeInput";
import SaveButton from "@/components/task/SaveButton";
import DiscardButton from "@/components/task/DiscardButton";
import DeleteButton from "@/components/task/DeleteButton";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import { TaskWithClient, TaskFile } from "@/types";
import { TaskService } from "@/services/taskService";

export default function Task() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Refs for scroll control
  const scrollViewRef = useRef<ScrollView>(null);

  // Screen mode state - for demo purposes
  const [isAIFlow, setIsAIFlow] = useState(false); // Set to false to test Edit mode
  const [isEditMode, setIsEditMode] = useState(true); // Set to true to show Delete button
  const [currentTaskIndex, setCurrentTaskIndex] = useState(1);
  const [totalTasks, setTotalTasks] = useState(3);

  // Mock attachment data
  const [attachments, setAttachments] = useState<TaskFile[]>([
    {
      id: 301,
      task_id: 5001,
      user_id: "123e4567-e89b-12d3-a456-426614174000",
      file_name: "court-notice-p1.jpg",
      mime_type: "image/jpeg",
      role: "source",
      storage_path: "user-id/5001/uuid1.jpg",
      created_at: "2025-08-17T11:01:00+08:00",
    },
    {
      id: 302,
      task_id: 5001,
      user_id: "123e4567-e89b-12d3-a456-426614174000",
      file_name: "related-exhibit.pdf",
      mime_type: "application/pdf",
      role: "attachment",
      storage_path: "user-id/5001/uuid2.pdf",
      created_at: "2025-08-18T14:20:00+08:00",
    },
    {
      id: 303,
      task_id: 5001,
      user_id: "123e4567-e89b-12d3-a456-426614174000",
      file_name: "Client-Email.eml",
      mime_type: "message/rfc822",
      role: "attachment",
      storage_path: "user-id/5001/uuid3.eml",
      created_at: "2025-08-18T16:05:00+08:00",
    },
  ]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    trigger,
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

  const onSubmit = async (data: TaskWithClient) => {
    console.log("Form submitted:", data);

    try {
      // Call the task service to create the task
      const result = await TaskService.createTask(data);

      if (!result.success) {
        // Show error message
        setSnackbarMessage(result.error || "Failed to save task");
        setSnackbarVisible(true);
        return;
      }

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
          setIsAIFlow(false);
          router.back();
        }
      } else {
        setSnackbarMessage("Task saved successfully!");
        // Navigate back after a brief delay to show success message
        setTimeout(() => {
          router.back();
        }, 1000);
      }

      setSnackbarVisible(true);
      
    } catch (error) {
      console.error("Unexpected error in onSubmit:", error);
      setSnackbarMessage("An unexpected error occurred. Please try again.");
      setSnackbarVisible(true);
    }
  };

  const handleDiscardPress = () => {
    console.log("Task discarded");

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
        setIsAIFlow(false);
        router.back();
      }
    } else {
      // Manual entry: just go back
      setSnackbarMessage("Changes discarded");
      router.back();
    }

    setSnackbarVisible(true);
  };

  const handleDeletePress = () => {
    console.log("Task deleted");
    setSnackbarMessage("Task deleted successfully");
    setSnackbarVisible(true);
    // TODO: Add delete logic here (API call to delete task)
    setTimeout(() => {
      router.back();
    }, 1000);
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

  const handleAddAttachment = () => {
    console.log("Add attachment pressed");
    setSnackbarMessage("File picker would open here");
    setSnackbarVisible(true);
    // TODO: Open device file picker
  };

  const handleDeleteAttachment = (id: string | number) => {
    console.log("Delete attachment:", id);
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
    setSnackbarMessage("Attachment deleted");
    setSnackbarVisible(true);
    // TODO: Add API call to delete file from storage
  };

  const handlePreviewAttachment = (id: string | number) => {
    console.log("Preview attachment:", id);
    setSnackbarMessage("File preview would open here");
    setSnackbarVisible(true);
    // TODO: Implement file preview functionality
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title={isEditMode ? "Edit Task" : "New Task"}
        variant="modal"
        stackIndex={isAIFlow ? currentTaskIndex : undefined}
        stackTotal={isAIFlow ? totalTasks : undefined}
      />
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
          <Text variant="labelLarge" style={styles.sectionLabel}>
            Task Information
          </Text>

          <TitleInput control={control} name="title" error={errors.title} />
          <ClientAutocompleteInput control={control} name="client_name" error={errors.client_name} />
        </View>

        {/* Schedule Section */}
        <View style={styles.formSection}>
          <Text variant="labelLarge" style={styles.sectionLabel}>
            Time & Location
          </Text>

          <DateTimeInput control={control} name="event_time" error={errors.event_time} />

          <LocationInput control={control} name="location" error={errors.location} />
        </View>

        {/* Details Section */}
        <View style={styles.formSection}>
          <Text variant="labelLarge" style={styles.sectionLabel}>
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
          loading={isSubmitting}
        />

        <View style={isAIFlow ? styles.buttonRow : styles.buttonSingle}>
          <SaveButton onPress={handleSavePress} loading={isSubmitting} />
          {isAIFlow && <DiscardButton onPress={handleDiscardPress} loading={isSubmitting} />}
        </View>
        {isEditMode && (
          <View style={styles.deleteButtonContainer}>
            <DeleteButton onPress={handleDeletePress} loading={isSubmitting} />
          </View>
        )}
      </ScrollView>
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
