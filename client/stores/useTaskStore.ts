import { create } from 'zustand';
import { Alert } from 'react-native';
import { TaskWithClient } from '@/types';
import { useTaskFilesStore } from './useTaskFilesStore';

// Navigation intents that components should handle
export type NavigationIntent = 'back' | 'stay' | 'home';

// Result type for operations that may trigger navigation
export interface OperationResult {
  success: boolean;
  message?: string;
  navigationIntent?: NavigationIntent;
}

// Dependencies that need to be injected
interface TaskDependencies {
  taskAPI: {
    createTask: (data: TaskWithClient) => Promise<{ id: number }>;
    updateTask: (id: number, data: Partial<TaskWithClient>) => Promise<TaskWithClient>;
    deleteTask: (id: number) => Promise<void>;
  };
}

export interface TaskConfig {
  taskId?: string;
  isEditMode: boolean;
  isAIFlow: boolean;
  currentTaskIndex: number;
  totalTasks: number;
}

interface TaskState {
  // UI feedback state
  snackbarVisible: boolean;
  snackbarMessage: string;

  // Form state
  isSubmitting: boolean;
  isDirty: boolean;
  formSaveCallback: (() => Promise<void>) | null;

  // Configuration (set by components)
  config: TaskConfig | null;
  dependencies: TaskDependencies | null;
}

interface TaskActions {
  // Configuration
  setConfig: (config: TaskConfig) => void;
  setDependencies: (dependencies: TaskDependencies) => void;

  // Form management
  setFormState: (state: { isSubmitting?: boolean; isDirty?: boolean; formSaveCallback?: (() => Promise<void>) | null }) => void;
  saveForm: () => Promise<OperationResult>;

  // UI feedback
  showMessage: (message: string) => void;
  setSnackbarVisible: (visible: boolean) => void;

  // Task operations
  handleSave: (data: TaskWithClient) => Promise<OperationResult>;
  handleDelete: () => Promise<OperationResult>;
  handleDiscard: () => Promise<OperationResult>;
  handleClose: () => OperationResult;

  // State reset
  reset: () => void;
}

type TaskStore = TaskState & TaskActions;

export const useTaskStore = create<TaskStore>((set, get) => ({
  // Initial State
  snackbarVisible: false,
  snackbarMessage: '',
  isSubmitting: false,
  isDirty: false,
  formSaveCallback: null,
  config: null,
  dependencies: null,

  // Configuration
  setConfig: (config: TaskConfig) => {
    set({ config });
  },

  setDependencies: (dependencies: TaskDependencies) => {
    set({ dependencies });
  },

  // Form management
  setFormState: (state: { isSubmitting?: boolean; isDirty?: boolean; formSaveCallback?: (() => Promise<void>) | null }) => {
    set((current) => ({
      ...current,
      ...(state.isSubmitting !== undefined && { isSubmitting: state.isSubmitting }),
      ...(state.isDirty !== undefined && { isDirty: state.isDirty }),
      ...(state.formSaveCallback !== undefined && { formSaveCallback: state.formSaveCallback }),
    }));
  },

  saveForm: async (): Promise<OperationResult> => {
    const { formSaveCallback, showMessage } = get();

    if (!formSaveCallback) {
      const message = "Form not ready. Please try again.";
      showMessage(message);
      return { success: false, message, navigationIntent: 'stay' };
    }

    await formSaveCallback();
    return { success: true, navigationIntent: 'stay' };
  },

  // UI feedback
  showMessage: (message: string) => {
    set({
      snackbarMessage: message,
      snackbarVisible: true,
    });
  },

  setSnackbarVisible: (visible: boolean) => {
    set({ snackbarVisible: visible });
  },

  // Task operations
  handleSave: async (data: TaskWithClient): Promise<OperationResult> => {
    const { config, dependencies, showMessage } = get();

    if (!config || !dependencies) {
      throw new Error('Store not properly configured');
    }

    console.log("Form submitted:", data);

    try {
      let savedTaskId: number;

      if (config.isEditMode && config.taskId) {
        await dependencies.taskAPI.updateTask(parseInt(config.taskId, 10), data);
        savedTaskId = parseInt(config.taskId, 10);
      } else {
        const newTask = await dependencies.taskAPI.createTask(data);
        savedTaskId = newTask.id;
      }

      // Commit temp files to permanent storage after successful task save
      const fileStore = useTaskFilesStore.getState();
      if (fileStore.tempFiles.length > 0) {
        try {
          const shouldClearTempFiles = !config.isAIFlow || config.currentTaskIndex === config.totalTasks;
          await fileStore.commitTempFiles(savedTaskId, shouldClearTempFiles);
          console.log("Temp files committed successfully for task:", savedTaskId);
        } catch (fileError) {
          console.error("File commitment failed:", fileError);
          const message = "Task saved but some files failed to attach. Please try re-uploading them.";
          showMessage(message);
          return { success: false, message, navigationIntent: 'stay' };
        }
      }

      // Success handling
      if (config.isAIFlow) {
        if (config.currentTaskIndex < config.totalTasks) {
          const message = `Task ${config.currentTaskIndex} saved! Showing task ${config.currentTaskIndex + 1} of ${config.totalTasks}`;
          showMessage(message);
          return { success: true, message, navigationIntent: 'stay' };
        } else {
          const message = "All tasks saved successfully!";
          showMessage(message);
          // Clear temp files when completing the entire AI flow
          const fileStore = useTaskFilesStore.getState();
          try {
            await fileStore.clearTempFiles();
            console.log("Temp files cleared after completing AI flow");
          } catch (error) {
            console.warn("Failed to clear temp files after AI flow completion:", error);
          }
          return { success: true, message, navigationIntent: 'back' };
        }
      } else {
        const action = config.isEditMode ? "updated" : "saved";
        const message = `Task ${action} successfully!`;
        showMessage(message);
        return { success: true, message, navigationIntent: 'back' };
      }
    } catch (error) {
      console.error("Unexpected error in handleSave:", error);
      const action = config.isEditMode ? "update" : "save";
      const message = `Failed to ${action} task. Please try again.`;
      showMessage(message);
      return { success: false, message, navigationIntent: 'stay' };
    }
  },

  handleDelete: async (): Promise<OperationResult> => {
    const { config, dependencies, showMessage } = get();

    if (!config || !dependencies) {
      throw new Error('Store not properly configured');
    }

    if (!config.isEditMode || !config.taskId) {
      console.log("Cannot delete: not in edit mode or no task ID");
      const message = "Cannot delete task";
      showMessage(message);
      return { success: false, message, navigationIntent: 'stay' };
    }

    console.log("Deleting task:", config.taskId);

    try {
      await dependencies.taskAPI.deleteTask(parseInt(config.taskId, 10));
      const message = "Task deleted successfully";
      showMessage(message);
      return { success: true, message, navigationIntent: 'back' };
    } catch (error) {
      console.error("Failed to delete task:", error);
      const message = "Failed to delete task. Please try again.";
      showMessage(message);
      return { success: false, message, navigationIntent: 'stay' };
    }
  },

  handleDiscard: async (): Promise<OperationResult> => {
    const { config, dependencies, showMessage } = get();

    if (!config || !dependencies) {
      throw new Error('Store not properly configured');
    }

    console.log("Task discarded");

    const shouldCleanupTempFiles = !config.isAIFlow || config.currentTaskIndex === config.totalTasks;

    if (shouldCleanupTempFiles) {
      const fileStore = useTaskFilesStore.getState();
      try {
        await fileStore.clearTempFiles();
        console.log("Temp files cleared on discard");
      } catch (error) {
        console.warn("Failed to clear temp files on discard:", error);
      }
    }

    if (config.isAIFlow) {
      if (config.currentTaskIndex < config.totalTasks) {
        const message = `Task ${config.currentTaskIndex} discarded. Showing task ${config.currentTaskIndex + 1} of ${config.totalTasks}`;
        showMessage(message);
        return { success: true, message, navigationIntent: 'stay' };
      } else {
        const message = "AI flow completed!";
        showMessage(message);
        return { success: true, message, navigationIntent: 'back' };
      }
    } else {
      const message = "Changes discarded";
      showMessage(message);
      return { success: true, message, navigationIntent: 'back' };
    }
  },

  handleClose: (): OperationResult => {
    const { config, dependencies, handleDiscard, isDirty } = get();

    if (!config || !dependencies) {
      throw new Error('Store not properly configured');
    }

    // Check if there are unsaved changes (only form dirty now - files are auto-committed)
    const hasUnsavedChanges = isDirty;

    if (hasUnsavedChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved form changes that will be lost. Are you sure you want to close?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Close Without Saving",
            style: "destructive",
            onPress: async () => {
              // Handle cleanup before closing - the component will handle navigation
              await handleDiscard();
            },
          },
        ]
      );
      return { success: true, navigationIntent: 'stay' };
    } else {
      // No unsaved changes, but still need to clean up temp files before closing
      const shouldCleanupTempFiles = !config.isAIFlow || config.currentTaskIndex === config.totalTasks;

      if (shouldCleanupTempFiles) {
        const fileStore = useTaskFilesStore.getState();
        fileStore.clearTempFiles()
          .then(() => {
            console.log("Temp files cleared on close without unsaved changes");
          })
          .catch((error) => {
            console.warn("Failed to clear temp files on close:", error);
          });
      }

      return { success: true, navigationIntent: 'back' };
    }
  },

  // Reset store state
  reset: () => {
    set({
      snackbarVisible: false,
      snackbarMessage: '',
      isSubmitting: false,
      isDirty: false,
      formSaveCallback: null,
      config: null,
      dependencies: null,
    });
  },
}));