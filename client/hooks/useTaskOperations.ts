import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { TaskWithClient, TaskFile } from '@/types';
import { useTasks } from '@/hooks/useTasks';

interface AttachmentHooks {
  commitTempFiles: (taskId: number, clearTempAfterCommit?: boolean) => Promise<TaskFile[]>;
  clearTempFiles: () => Promise<void>;
  uploading: boolean;
  committing: boolean;
}

interface UseTaskOperationsParams {
  taskId?: string;
  isEditMode: boolean;
  isAIFlow: boolean;
  currentTaskIndex: number;
  totalTasks: number;
  attachmentHooks?: AttachmentHooks | null;
  onMessage: (message: string) => void;
}

interface UseTaskOperationsReturn {
  handleSave: (data: TaskWithClient) => Promise<void>;
  handleDelete: () => Promise<void>;
  handleDiscard: () => Promise<void>;
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
  attachmentHooks,
  onMessage,
}: UseTaskOperationsParams): UseTaskOperationsReturn {
  const router = useRouter();

  // Consolidated data and business logic layer
  const { createTask, updateTask, deleteTask } = useTasks();

  const handleSave = useCallback(async (data: TaskWithClient) => {
    console.log("Form submitted:", data);

    try {
      let savedTaskId: number;

      if (isEditMode && taskId) {
        await updateTask(parseInt(taskId, 10), data);
        savedTaskId = parseInt(taskId, 10);
      } else {
        const newTask = await createTask(data);
        savedTaskId = newTask.id;
      }

      // Commit temp files to permanent storage after successful task save
      if (attachmentHooks?.commitTempFiles) {
        try {
          const shouldClearTempFiles = !isAIFlow || currentTaskIndex === totalTasks;
          await attachmentHooks.commitTempFiles(savedTaskId, shouldClearTempFiles);
          console.log("Temp files committed successfully for task:", savedTaskId);
        } catch (fileError) {
          console.error("File commitment failed:", fileError);
          onMessage("Task saved but some files failed to attach. Please try re-uploading them.");
          return;
        }
      }

      // Success handling
      if (isAIFlow) {
        if (currentTaskIndex < totalTasks) {
          onMessage(`Task ${currentTaskIndex} saved! Showing task ${currentTaskIndex + 1} of ${totalTasks}`);
        } else {
          onMessage("All tasks saved successfully!");
          // Clear temp files when completing the entire AI flow
          if (attachmentHooks?.clearTempFiles) {
            try {
              await attachmentHooks.clearTempFiles();
              console.log("Temp files cleared after completing AI flow");
            } catch (error) {
              console.warn("Failed to clear temp files after AI flow completion:", error);
            }
          }
          router.back();
        }
      } else {
        const action = isEditMode ? "updated" : "saved";
        onMessage(`Task ${action} successfully!`);
        setTimeout(() => router.back(), 1000);
      }
    } catch (error) {
      console.error("Unexpected error in handleSave:", error);
      const action = isEditMode ? "update" : "save";
      onMessage(`Failed to ${action} task. Please try again.`);
    }
  }, [taskId, isEditMode, isAIFlow, currentTaskIndex, totalTasks, attachmentHooks, onMessage, createTask, updateTask, router]);

  const handleDelete = useCallback(async () => {
    if (!isEditMode || !taskId) {
      console.log("Cannot delete: not in edit mode or no task ID");
      return;
    }

    console.log("Deleting task:", taskId);

    try {
      await deleteTask(parseInt(taskId, 10));

      // Clean up any temp files
      if (attachmentHooks?.clearTempFiles) {
        try {
          await attachmentHooks.clearTempFiles();
          console.log("Temp files cleared after task deletion");
        } catch (error) {
          console.warn("Failed to clear temp files after task deletion:", error);
        }
      }

      onMessage("Task deleted successfully");
      setTimeout(() => router.back(), 1000);
    } catch (error) {
      console.error("Failed to delete task:", error);
      onMessage("Failed to delete task. Please try again.");
    }
  }, [isEditMode, taskId, attachmentHooks, onMessage, deleteTask, router]);

  const handleDiscard = useCallback(async () => {
    console.log("Task discarded");

    const shouldCleanupTempFiles = !isAIFlow || currentTaskIndex === totalTasks;

    if (shouldCleanupTempFiles && attachmentHooks?.clearTempFiles) {
      try {
        await attachmentHooks.clearTempFiles();
        console.log("Temp files cleared on discard");
      } catch (error) {
        console.warn("Failed to clear temp files on discard:", error);
      }
    }

    if (isAIFlow) {
      if (currentTaskIndex < totalTasks) {
        onMessage(`Task ${currentTaskIndex} discarded. Showing task ${currentTaskIndex + 1} of ${totalTasks}`);
      } else {
        onMessage("AI flow completed!");
        router.back();
      }
    } else {
      onMessage("Changes discarded");
      router.back();
    }
  }, [isAIFlow, currentTaskIndex, totalTasks, attachmentHooks, onMessage, router]);

  return {
    handleSave,
    handleDelete,
    handleDiscard,
  };
}