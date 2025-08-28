import React, { useCallback } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text } from "react-native-paper";
import { useForm } from "react-hook-form";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import { TaskWithClient } from "@/types";
import { useTasks } from "@/hooks/useTasks";
import { useTaskFormInit } from "@/hooks/useTaskFormInit";
import TitleInput from "@/components/task/TitleInput";
import ClientAutocompleteInput from "@/components/task/ClientAutocompleteInput";
import LocationInput from "@/components/task/LocationInput";
import NoteInput from "@/components/task/NoteInput";
import DateTimeInput from "@/components/task/DateTimeInput";

interface TaskFormSectionProps {
  taskId?: string;
  isEditMode: boolean;
  scrollViewRef?: React.RefObject<ScrollView | null>;
  onSnackbar?: (message: string) => void;
  onFormReady?: (saveForm: () => Promise<void>) => void;
  onSave?: (formData: TaskWithClient) => Promise<void>;
}

/**
 * Simplified TaskFormSection focused on UI rendering
 * Responsibilities:
 * - Form component structure and styling
 * - React Hook Form setup
 * - Input component coordination
 * - Scroll behavior management
 */
export default function TaskFormSection({
  taskId,
  isEditMode,
  scrollViewRef,
  onSnackbar,
  onFormReady,
  onSave,
}: TaskFormSectionProps) {
  const { theme } = useAppTheme();

  // Data layer
  const { tasks, isLoading: tasksLoading } = useTasks();

  // Form setup
  const formInstance = useForm<TaskWithClient>({
    defaultValues: {
      title: "",
      client_name: "",
      event_time: null,
      location: null,
      note: null,
    },
    mode: "onBlur", // Only validate after user leaves field
  });

  // Internal form validation and submission
  const handleFormSave = React.useCallback(async () => {
    if (!onSave) {
      onSnackbar?.("Save handler not available");
      return;
    }

    // Trigger validation on all fields
    const isValid = await formInstance.trigger();
    if (!isValid) {
      const firstError = Object.values(formInstance.formState.errors)[0] as any;
      const errorMessage = firstError?.message || "Please fix the errors above";
      onSnackbar?.(errorMessage);
      return;
    }

    // Submit the valid form
    formInstance.handleSubmit(onSave)();
  }, [formInstance, onSave, onSnackbar]);

  // Expose save function to parent
  React.useEffect(() => {
    onFormReady?.(handleFormSave);
  }, [onFormReady, handleFormSave]);

  // Form initialization for edit mode
  useTaskFormInit({
    taskId,
    isEditMode,
    tasks,
    tasksLoading,
    reset: formInstance.reset,
    onMessage: onSnackbar,
  });

  // Handle note input focus with scroll
  const handleNoteInputFocus = useCallback(() => {
    const scrollY = 350;
    scrollViewRef?.current?.scrollTo({
      y: scrollY,
      animated: true,
    });
  }, [scrollViewRef]);

  return (
    <>
      {/* Essential Information Section */}
      <View style={styles.formSection}>
        <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.primary }]}>
          Task Information
        </Text>

        <TitleInput
          control={formInstance.control}
          name="title"
          error={formInstance.formState.errors.title}
        />
        <ClientAutocompleteInput
          control={formInstance.control}
          name="client_name"
          error={formInstance.formState.errors.client_name}
        />
      </View>

      {/* Schedule Section */}
      <View style={styles.formSection}>
        <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.primary }]}>
          Time & Location
        </Text>

        <DateTimeInput
          control={formInstance.control}
          name="event_time"
          error={formInstance.formState.errors.event_time}
        />

        <LocationInput
          control={formInstance.control}
          name="location"
          error={formInstance.formState.errors.location}
        />
      </View>

      {/* Details Section */}
      <View style={styles.formSection}>
        <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.primary }]}>
          Additional Details
        </Text>

        <NoteInput
          control={formInstance.control}
          name="note"
          error={formInstance.formState.errors.note}
          onFocus={handleNoteInputFocus}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  formSection: {
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    padding: SPACING.xs,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
