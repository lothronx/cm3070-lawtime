import React, { useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Snackbar } from "react-native-paper";
import { useForm } from "react-hook-form";
import Header from "@/components/Header";
import TitleInput from "@/components/task/TitleInput";
import ClientAutocompleteInput from "@/components/task/ClientAutocompleteInput";
import DateTimeInput from "@/components/task/DateTimeInput";
import SaveButton from "@/components/task/SaveButton";
import DiscardButton from "@/components/task/DiscardButton";
import DeleteButton from "@/components/task/DeleteButton";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";

interface TaskFormData {
  title: string;
  client: string;
  datetime: Date | null;
}

export default function App() {
  const { theme } = useAppTheme();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Screen mode state - for demo purposes
  const [isAIFlow, setIsAIFlow] = useState(false); // Set to false to test Edit mode
  const [isEditMode, setIsEditMode] = useState(true); // Set to true to show Delete button
  const [currentTaskIndex, setCurrentTaskIndex] = useState(1);
  const [totalTasks, setTotalTasks] = useState(3);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    trigger,
  } = useForm<TaskFormData>({
    defaultValues: {
      title: "",
      client: "",
      datetime: null,
    },
    mode: "onBlur", // Only validate after user leaves field
  });

  const onSubmit = async (data: TaskFormData) => {
    console.log("Form submitted:", data);

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
        // TODO: Navigate back to previous screen
      }
    } else {
      setSnackbarMessage("Task saved successfully!");
      // TODO: Navigate back to previous screen
    }

    setSnackbarVisible(true);
    // TODO: Add task creation logic here
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
        // TODO: Navigate back to previous screen
      }
    } else {
      // Manual entry: just go back
      setSnackbarMessage("Changes discarded");
      // TODO: Navigate back to previous screen
    }

    setSnackbarVisible(true);
  };

  const handleDeletePress = () => {
    console.log("Task deleted");
    setSnackbarMessage("Task deleted successfully");
    setSnackbarVisible(true);
    // TODO: Add delete logic here (API call to delete task)
    // TODO: Navigate back to previous screen after deletion
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

  return (
    <SafeAreaProvider>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header
          title={isEditMode ? "Edit Task" : "New Task"}
          variant="modal"
          stackIndex={isAIFlow ? currentTaskIndex : undefined}
          stackTotal={isAIFlow ? totalTasks : undefined}
        />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <TitleInput control={control} name="title" error={errors.title} />
          <ClientAutocompleteInput control={control} name="client" error={errors.client} />
          <DateTimeInput control={control} name="datetime" error={errors.datetime} />
          <View style={isAIFlow ? styles.buttonRow : styles.buttonSingle}>
            <SaveButton onPress={handleSavePress} loading={isSubmitting} />
            {isAIFlow && <DiscardButton onPress={handleDiscardPress} loading={isSubmitting} />}
          </View>
          {isEditMode && <DeleteButton onPress={handleDeletePress} loading={isSubmitting} />}
        </ScrollView>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          style={{
            backgroundColor: snackbarMessage.includes("successfully")
              ? theme.colors.primary
              : theme.colors.error,
          }}>
          {snackbarMessage}
        </Snackbar>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
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
});
