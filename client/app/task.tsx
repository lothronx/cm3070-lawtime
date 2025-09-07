import { useRef, useCallback } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Snackbar } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import Header from "@/components/Header";
import TaskFormSection from "@/components/task/TaskFormSection";
import AttachmentsSection from "@/components/task/AttachmentsSection";
import SaveButton from "@/components/task/SaveButton";
import DiscardButton from "@/components/task/DiscardButton";
import DeleteButton from "@/components/task/DeleteButton";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import { useAIWorkflow } from "@/hooks/aiWorkFlow/useAIWorkflow";
import { useTaskOperations } from "@/hooks/operations/useTaskOperations";

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

  // === Business Logic & UI Navigation ===
  const taskOperations = useTaskOperations({
    taskId,
    isEditMode,
    isAIFlow: isAIFlowActive,
    currentTaskIndex: currentTaskIndex,
    totalTasks: totalTasks,
  });

  // === Data & Loading ===
  const submitLoading = taskOperations.isSubmitting || false;

  // Get current proposed task if in AI flow
  const currentProposedTask = isAIFlowMode ? workflow.currentTask : null;

  // Create a close handler that passes the current form state
  const handleHeaderClose = useCallback(() => {
    taskOperations.handleClose();
  }, [taskOperations]);

  // === Event Handlers ===
  const handleSaveClick = async () => {
    await taskOperations.saveForm();

    // If in AI flow, advance to next task after successful save
    if (isAIFlowActive) {
      const message = await workflow.continueFlow();
      console.log(message);
    }
  };

  const handleDiscardClick = async () => {
    if (isAIFlowActive) {
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
        stackIndex={isAIFlowActive ? currentTaskIndex : undefined}
        stackTotal={isAIFlowActive ? totalTasks : undefined}
        onClose={handleHeaderClose}
      />

      {/* Task content - processing overlay handles AI loading states globally */}
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
          onSave={taskOperations.handleSave}
          proposedTask={currentProposedTask}
        />

        <AttachmentsSection
          taskId={taskId ? parseInt(taskId, 10) : undefined}
          onSnackbar={taskOperations.showMessage}
          externalLoading={taskOperations.isSubmitting || false}
        />

        <View style={isAIFlowActive ? styles.buttonRow : styles.buttonSingle}>
          <SaveButton
            onPress={handleSaveClick}
            loading={submitLoading}
            title={isEditMode ? "Update" : "Save"}
          />
          {isAIFlowActive && <DiscardButton onPress={handleDiscardClick} loading={submitLoading} />}
        </View>
        {isEditMode && (
          <View style={styles.deleteButtonContainer}>
            <DeleteButton onPress={taskOperations.handleDelete} loading={submitLoading} />
          </View>
        )}
      </ScrollView>

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
