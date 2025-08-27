import React, { useRef, useState, useCallback } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Snackbar } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import Header from "@/components/Header";
import LoadingComponent from "@/components/LoadingComponent";
import TaskFormSection from "@/components/task/TaskFormSection";
import AttachmentsSection from "@/components/task/AttachmentsSection";
import SaveButton from "@/components/task/SaveButton";
import DiscardButton from "@/components/task/DiscardButton";
import DeleteButton from "@/components/task/DeleteButton";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import { useTasks } from "@/hooks/useTasks";
import { useTaskLoading } from "@/hooks/useTaskLoading";
import { useAITaskFlow } from "@/hooks/useAITaskFlow";
import { useTaskForm } from "@/hooks/useTaskForm";
import { useTaskNavigation } from "@/hooks/useTaskNavigation";
import { useTaskOperations } from "@/hooks/useTaskOperations";

export default function Task() {
  const { theme } = useAppTheme();
  const { taskId, stackIndex, stackTotal } = useLocalSearchParams<{
    mode?: string;
    taskId?: string;
    stackIndex?: string;
    stackTotal?: string;
  }>();

  // Refs for scroll control
  const scrollViewRef = useRef<ScrollView>(null);

  // Determine screen mode based on URL parameters
  const isEditMode = !!taskId;

  // Use extracted custom hooks
  const { tasks, isLoading: tasksLoading } = useTasks();

  const { isAIFlow, currentTaskIndex, totalTasks } = useAITaskFlow({
    stackIndex,
    stackTotal,
  });

  const { formState, handleFormStateChange, handleSavePress } = useTaskForm();

  // Simple state for file operations (managed by AttachmentsSection now)
  const [attachmentHooks, setAttachmentHooks] = useState<{
    commitTempFiles: (taskId: number, clearTempAfterCommit?: boolean) => Promise<any[]>;
    clearTempFiles: () => Promise<void>;
    uploading: boolean;
    committing: boolean;
  } | null>(null);
  const [hasUploadedFiles, setHasUploadedFiles] = useState(false);

  // Use navigation hook for UI state management
  const {
    snackbarVisible,
    snackbarMessage,
    showMessage,
    handleCloseWithUnsavedChanges,
    setSnackbarVisible,
  } = useTaskNavigation({
    hasUploadedFiles,
    onDiscard: async () => {}, // Will be set properly by task operations
  });

  // Use task operations hook for business logic
  const { handleSave, handleDelete, handleDiscard } = useTaskOperations({
    taskId,
    isEditMode,
    isAIFlow,
    currentTaskIndex,
    totalTasks,
    attachmentHooks,
    onMessage: showMessage,
  });

  // Use loading hook to consolidate loading states
  const { isLoading } = useTaskLoading({ formState, attachmentHooks });

  // Handler for attachment hooks changes from AttachmentsSection
  const handleAttachmentHooksChange = useCallback((hooks: {
    commitTempFiles: (taskId: number, clearTempAfterCommit?: boolean) => Promise<any[]>;
    clearTempFiles: () => Promise<void>;
    uploading: boolean;
    committing: boolean;
  }) => {
    setAttachmentHooks(hooks);
  }, []);

  // Custom save handler that integrates with form validation
  const handleSaveClick = () => {
    handleSavePress(handleSave, showMessage);
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
          <TaskFormSection
            taskId={taskId}
            tasks={tasks}
            tasksLoading={tasksLoading}
            isEditMode={isEditMode}
            scrollViewRef={scrollViewRef}
            onFormStateChange={handleFormStateChange}
            onSnackbar={showMessage}
          />

          <AttachmentsSection
            taskId={taskId ? parseInt(taskId, 10) : undefined}
            onFileUpload={() => setHasUploadedFiles(true)}
            onSnackbar={showMessage}
            onHooksChange={handleAttachmentHooksChange}
            externalLoading={formState?.isSubmitting || false}
          />

          <View style={isAIFlow ? styles.buttonRow : styles.buttonSingle}>
            <SaveButton
              onPress={handleSaveClick}
              loading={isLoading}
              title={isEditMode ? "Update" : "Save"}
            />
            {isAIFlow && <DiscardButton onPress={handleDiscard} loading={isLoading} />}
          </View>
          {isEditMode && (
            <View style={styles.deleteButtonContainer}>
              <DeleteButton onPress={handleDelete} loading={isLoading} />
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
