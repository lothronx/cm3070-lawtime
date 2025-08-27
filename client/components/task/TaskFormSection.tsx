import React, { useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text } from "react-native-paper";
import { useForm } from "react-hook-form";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import { TaskWithClient } from "@/types";
import TitleInput from "@/components/task/TitleInput";
import ClientAutocompleteInput from "@/components/task/ClientAutocompleteInput";
import LocationInput from "@/components/task/LocationInput";
import NoteInput from "@/components/task/NoteInput";
import DateTimeInput from "@/components/task/DateTimeInput";

interface TaskFormSectionProps {
  taskId?: string;
  tasks: TaskWithClient[];
  tasksLoading: boolean;
  isEditMode: boolean;
  scrollViewRef?: React.RefObject<ScrollView | null>;
  onFormStateChange?: (formState: {
    control: any;
    handleSubmit: any;
    errors: any;
    isSubmitting: boolean;
    isDirty: boolean;
    trigger: any;
    reset: any;
  }) => void;
  onSnackbar?: (message: string) => void;
}

export default function TaskFormSection({
  taskId,
  tasks,
  tasksLoading,
  isEditMode,
  scrollViewRef,
  onFormStateChange,
  onSnackbar,
}: TaskFormSectionProps) {
  const { theme } = useAppTheme();

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
        } else if (tasks.length > 0) {
          // Tasks are loaded but specific task not found
          console.warn(
            "Task not found in cache:",
            taskId,
            "Available tasks:",
            tasks.map((t) => t.id)
          );
          onSnackbar?.("Task not found");
        }
        // If tasks.length === 0, we're still waiting for data to load
      } catch (error) {
        console.error("Failed to load task:", error);
        onSnackbar?.("Failed to load task data");
      }
    }
  }, [isEditMode, taskId, tasks, tasksLoading, reset]);

  // Notify parent component when form state changes
  const formStateObject = React.useMemo(
    () => ({
      control,
      handleSubmit,
      errors,
      isSubmitting,
      isDirty,
      trigger,
      reset,
    }),
    [control, handleSubmit, errors, isSubmitting, isDirty, trigger, reset]
  );

  useEffect(() => {
    onFormStateChange?.(formStateObject);
  }, [formStateObject]);

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

        <TitleInput control={control} name="title" error={errors.title} />
        <ClientAutocompleteInput control={control} name="client_name" error={errors.client_name} />
      </View>

      {/* Schedule Section */}
      <View style={styles.formSection}>
        <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.primary }]}>
          Time & Location
        </Text>

        <DateTimeInput control={control} name="event_time" error={errors.event_time} />

        <LocationInput control={control} name="location" error={errors.location} />
      </View>

      {/* Details Section */}
      <View style={styles.formSection}>
        <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.primary }]}>
          Additional Details
        </Text>

        <NoteInput
          control={control}
          name="note"
          error={errors.note}
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
