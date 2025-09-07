import { useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { TaskWithClient } from '@/types';
import { useTasks } from '@/hooks/data/useTasks';
import { useTaskStore, OperationResult, NavigationIntent } from '@/stores/useTaskStore';

// Navigation utility function
const handleNavigationIntent = (intent: NavigationIntent, router: any) => {
  switch (intent) {
    case 'back':
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
      break;
    case 'home':
      router.replace('/(tabs)');
      break;
    case 'stay':
    default:
      break;
  }
};

interface UseTaskOperationsParams {
  taskId?: string;
  isEditMode: boolean;
  isAIFlow: boolean;
  currentTaskIndex: number;
  totalTasks: number;
}

interface UseTaskOperationsReturn {
  // Task operations
  handleSave: (data: TaskWithClient) => Promise<void>;
  handleDelete: () => Promise<void>;
  handleDiscard: () => Promise<void>;
  handleClose: () => void;

  // Form operations
  saveForm: () => Promise<void>;
  isSubmitting: boolean;
  setFormState: (state: { isSubmitting?: boolean; isDirty?: boolean; formSaveCallback?: (() => Promise<void>) | null }) => void;

  // UI feedback
  snackbarVisible: boolean;
  snackbarMessage: string;
  showMessage: (message: string) => void;
  setSnackbarVisible: (value: boolean) => void;
}

/**
 * Task operations hook with consolidated data and business logic
 * Responsibilities:
 * - File operations workflow integration
 * - AI flow navigation logic
 * - Success/error message handling
 */
export function useTaskOperations({
  taskId,
  isEditMode,
  isAIFlow,
  currentTaskIndex,
  totalTasks,
}: UseTaskOperationsParams): UseTaskOperationsReturn {
  const router = useRouter();
  const { createTask, updateTask, deleteTask } = useTasks();
  const store = useTaskStore();

  // Configure the store with current parameters
  useEffect(() => {
    store.setConfig({
      taskId,
      isEditMode,
      isAIFlow,
      currentTaskIndex,
      totalTasks,
    });
  }, [taskId, isEditMode, isAIFlow, currentTaskIndex, totalTasks]);

  // Configure the store with dependencies (no router needed)
  useEffect(() => {
    store.setDependencies({
      taskAPI: {
        createTask,
        updateTask,
        deleteTask,
      },
    });
  }, [createTask, updateTask, deleteTask]);

  // Wrapper functions that handle navigation intents
  const handleSaveWithNavigation = useCallback(async (data: TaskWithClient) => {
    const result = await store.handleSave(data);
    if (result.navigationIntent) {
      handleNavigationIntent(result.navigationIntent, router);
    }
  }, [router]);

  const handleDeleteWithNavigation = useCallback(async () => {
    const result = await store.handleDelete();
    if (result.navigationIntent) {
      handleNavigationIntent(result.navigationIntent, router);
    }
  }, [router]);

  const handleDiscardWithNavigation = useCallback(async () => {
    const result = await store.handleDiscard();
    if (result.navigationIntent) {
      handleNavigationIntent(result.navigationIntent, router);
    }
  }, [router]);

  const handleCloseWithNavigation = useCallback(() => {
    const result = store.handleClose();
    if (result.navigationIntent) {
      handleNavigationIntent(result.navigationIntent, router);
    }
  }, [router]);

  const saveFormWithNavigation = useCallback(async () => {
    const result = await store.saveForm();
    if (result.navigationIntent) {
      handleNavigationIntent(result.navigationIntent, router);
    }
  }, [router]);

  return {
    // Task operations (with navigation handling)
    handleSave: handleSaveWithNavigation,
    handleDelete: handleDeleteWithNavigation,
    handleDiscard: handleDiscardWithNavigation,
    handleClose: handleCloseWithNavigation,

    // Form operations (with navigation handling)
    saveForm: saveFormWithNavigation,
    isSubmitting: store.isSubmitting,
    setFormState: store.setFormState,

    // UI feedback
    snackbarVisible: store.snackbarVisible,
    snackbarMessage: store.snackbarMessage,
    showMessage: store.showMessage,
    setSnackbarVisible: store.setSnackbarVisible,
  };
}