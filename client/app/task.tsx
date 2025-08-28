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
import { useTaskNavigation } from "@/hooks/useTaskNavigation";
import { useTaskOperations } from "@/hooks/useTaskOperations";

// Type for attachment hooks to improve readability
type AttachmentHooks = {
  commitTempFiles: (taskId: number, clearTempAfterCommit?: boolean) => Promise<any[]>;
  clearTempFiles: () => Promise<void>;
  uploading: boolean;
  committing: boolean;
};

export default function Task() {
  const { theme } = useAppTheme();

  // === Route Parameters & Mode ===
  const { taskId, stackIndex, stackTotal } = useLocalSearchParams<{
    mode?: string;
    taskId?: string;
    stackIndex?: string;
    stackTotal?: string;
  }>();
  const isEditMode = !!taskId;

  // === Component State ===
  const [hasUploadedFiles, setHasUploadedFiles] = useState(false);
  const [attachmentHooks, setAttachmentHooks] = useState<AttachmentHooks | null>(null);
  const [formSave, setFormSave] = useState<(() => Promise<void>) | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // === Data & Loading ===
  const { isLoading: tasksLoading } = useTasks();
  const { isLoading } = useTaskLoading({ formState: null, attachmentHooks });

  // === AI Flow State ===
  const { isAIFlow, currentTaskIndex, totalTasks } = useAITaskFlow({
    stackIndex,
    stackTotal,
  });

  // === UI Navigation & Feedback ===
  const navigation = useTaskNavigation({
    hasUploadedFiles,
    onDiscard: async () => {}, // Will be set by task operations
  });

  // === Business Logic ===
  const taskOperations = useTaskOperations({
    taskId,
    isEditMode,
    isAIFlow,
    currentTaskIndex,
    totalTasks,
    attachmentHooks,
    onMessage: navigation.showMessage,
  });

  // === Event Handlers ===
  const handleAttachmentHooksChange = useCallback((hooks: AttachmentHooks) => {
    setAttachmentHooks(hooks);
  }, []);

  const handleSaveClick = async () => {
    if (!formSave) {
      navigation.showMessage("Form not ready. Please try again.");
      return;
    }

    // Delegate to form's internal save logic
    await formSave();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title={isEditMode ? "Edit Task" : "New Task"}
        variant="modal"
        stackIndex={isAIFlow ? currentTaskIndex : undefined}
        stackTotal={isAIFlow ? totalTasks : undefined}
        onClose={navigation.handleCloseWithUnsavedChanges}
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
            isEditMode={isEditMode}
            scrollViewRef={scrollViewRef}
            onSnackbar={navigation.showMessage}
            onFormReady={setFormSave}
            onSave={taskOperations.handleSave}
          />

          <AttachmentsSection
            taskId={taskId ? parseInt(taskId, 10) : undefined}
            onFileUpload={() => setHasUploadedFiles(true)}
            onSnackbar={navigation.showMessage}
            onHooksChange={handleAttachmentHooksChange}
            externalLoading={false}
          />

          <View style={isAIFlow ? styles.buttonRow : styles.buttonSingle}>
            <SaveButton
              onPress={handleSaveClick}
              loading={isLoading}
              title={isEditMode ? "Update" : "Save"}
            />
            {isAIFlow && <DiscardButton onPress={taskOperations.handleDiscard} loading={isLoading} />}
          </View>
          {isEditMode && (
            <View style={styles.deleteButtonContainer}>
              <DeleteButton onPress={taskOperations.handleDelete} loading={isLoading} />
            </View>
          )}
        </ScrollView>
      )}

      <Snackbar
        visible={navigation.snackbarVisible}
        onDismiss={() => navigation.setSnackbarVisible(false)}
        duration={1000}
        style={{
          backgroundColor: navigation.snackbarMessage.includes("successfully")
            ? theme.colors.secondary
            : theme.colors.error,
        }}>
        {navigation.snackbarMessage}
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
