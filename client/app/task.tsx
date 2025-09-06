import React, { useRef, useState } from "react";
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
import { useTaskOperations } from "@/hooks/useTaskOperations";

// Types for component hooks to improve readability
type AttachmentHooks = {
  commitTempFiles: (taskId: number, clearTempAfterCommit?: boolean) => Promise<any[]>;
  clearTempFiles: () => Promise<void>;
  uploading: boolean;
  committing: boolean;
};

type FormHooks = {
  saveForm: () => Promise<void>;
  isSubmitting: boolean;
  isDirty: boolean;
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
  const [attachmentHooks, setAttachmentHooks] = useState<AttachmentHooks | null>(null);
  const [formHooks, setFormHooks] = useState<FormHooks | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // === Data & Loading ===
  const { isLoading: initialLoading } = useTasks();
  const { isLoading: submitLoading } = useTaskLoading({ formHooks, attachmentHooks });

  // === AI Flow State ===
  const { isAIFlow, currentTaskIndex, totalTasks } = useAITaskFlow({
    stackIndex,
    stackTotal,
  });

  // === Business Logic & UI Navigation ===
  const taskOperations = useTaskOperations({
    taskId,
    isEditMode,
    isAIFlow,
    currentTaskIndex,
    totalTasks,
    attachmentHooks,
  });

  // === Event Handlers ===
  const handleSaveClick = async () => {
    if (!formHooks?.saveForm) {
      taskOperations.showMessage("Form not ready. Please try again.");
      return;
    }

    await formHooks.saveForm();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title={isEditMode ? "Edit Task" : "New Task"}
        variant="modal"
        stackIndex={isAIFlow ? currentTaskIndex : undefined}
        stackTotal={isAIFlow ? totalTasks : undefined}
        onClose={taskOperations.handleClose}
      />

      {initialLoading ? (
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
            onSnackbar={taskOperations.showMessage}
            onFormHooksChange={setFormHooks}
            onSave={taskOperations.handleSave}
          />

          <AttachmentsSection
            taskId={taskId ? parseInt(taskId, 10) : undefined}
            onSnackbar={taskOperations.showMessage}
            onHooksChange={setAttachmentHooks}
            externalLoading={formHooks?.isSubmitting || false}
          />

          <View style={isAIFlow ? styles.buttonRow : styles.buttonSingle}>
            <SaveButton
              onPress={handleSaveClick}
              loading={submitLoading}
              title={isEditMode ? "Update" : "Save"}
            />
            {isAIFlow && (
              <DiscardButton onPress={taskOperations.handleDiscard} loading={submitLoading} />
            )}
          </View>
          {isEditMode && (
            <View style={styles.deleteButtonContainer}>
              <DeleteButton onPress={taskOperations.handleDelete} loading={submitLoading} />
            </View>
          )}
        </ScrollView>
      )}

      <Snackbar
        visible={taskOperations.snackbarVisible}
        onDismiss={() => taskOperations.setSnackbarVisible(false)}
        duration={1000}
        style={{
          backgroundColor: taskOperations.snackbarMessage.includes("successfully")
            ? theme.colors.secondary
            : theme.colors.error,
        }}>
        {taskOperations.snackbarMessage}
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
