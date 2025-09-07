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
import { useTasks } from "@/hooks/data/useTasks";
import { useTaskLoading } from "@/hooks/useTaskLoading";
import { useAIWorkflow } from "@/hooks/aiWorkFlow/useAIWorkflow";
import { useTaskOperations } from "@/hooks/form/useTaskOperations";

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
  const { taskId, mode, stackIndex, stackTotal } = useLocalSearchParams<{
    mode?: string;
    taskId?: string;
    stackIndex?: string;
    stackTotal?: string;
  }>();
  const isEditMode = !!taskId;
  const isAIFlowMode = mode === "ai-flow";

  // === Component State ===
  const [attachmentHooks, setAttachmentHooks] = useState<AttachmentHooks | null>(null);
  const [formHooks, setFormHooks] = useState<FormHooks | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // === AI Workflow State ===
  const workflow = useAIWorkflow({
    stackIndex,
    stackTotal,
  });

  // Use workflow state
  const isAIFlowActive = workflow.isActive || isAIFlowMode;
  const currentTaskIndex = workflow.currentIndex;
  const totalTasks = workflow.totalTasks;

  // === Data & Loading ===
  const { isLoading: initialLoading } = useTasks();
  const { isLoading: submitLoading } = useTaskLoading({ formHooks, attachmentHooks });

  // Combined loading state includes AI processing
  const isLoading = initialLoading || workflow.isProcessing;

  // Get current proposed task if in AI flow
  const currentProposedTask = isAIFlowMode ? workflow.currentTask : null;

  // Use shared AI flow as source of truth
  const effectiveIsAIFlow = isAIFlowActive;
  const effectiveCurrentIndex = currentTaskIndex;
  const effectiveTotalTasks = totalTasks;

  // === Business Logic & UI Navigation ===
  const taskOperations = useTaskOperations({
    taskId,
    isEditMode,
    isAIFlow: effectiveIsAIFlow,
    currentTaskIndex: effectiveCurrentIndex,
    totalTasks: effectiveTotalTasks,
    attachmentHooks,
  });

  // Create a close handler that passes the current form state
  const handleHeaderClose = React.useCallback(() => {
    taskOperations.handleClose(formHooks);
  }, [taskOperations, formHooks]);

  // === Event Handlers ===
  const handleSaveClick = async () => {
    if (!formHooks?.saveForm) {
      taskOperations.showMessage("Form not ready. Please try again.");
      return;
    }

    await formHooks.saveForm();

    // If in AI flow, advance to next task after successful save
    if (effectiveIsAIFlow) {
      const message = await workflow.continueFlow();
      console.log(message);
    }
  };

  const handleDiscardClick = async () => {
    if (effectiveIsAIFlow) {
      const message = await workflow.continueFlow();
      console.log(message);
    } else {
      taskOperations.handleDiscard();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title={isEditMode ? "Edit Task" : "New Task"}
        variant="modal"
        stackIndex={effectiveIsAIFlow ? effectiveCurrentIndex : undefined}
        stackTotal={effectiveIsAIFlow ? effectiveTotalTasks : undefined}
        onClose={handleHeaderClose}
      />

      {isLoading ? (
        <LoadingComponent
          message={workflow.isProcessing ? workflow.processingMessage : "Loading task data..."}
          variant={workflow.isProcessing ? "processing" : "default"}
        />
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
            proposedTask={currentProposedTask}
          />

          <AttachmentsSection
            taskId={taskId ? parseInt(taskId, 10) : undefined}
            onSnackbar={taskOperations.showMessage}
            onHooksChange={setAttachmentHooks}
            externalLoading={formHooks?.isSubmitting || false}
          />

          <View style={effectiveIsAIFlow ? styles.buttonRow : styles.buttonSingle}>
            <SaveButton
              onPress={handleSaveClick}
              loading={submitLoading}
              title={isEditMode ? "Update" : "Save"}
            />
            {effectiveIsAIFlow && (
              <DiscardButton onPress={handleDiscardClick} loading={submitLoading} />
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
