import { useEffect } from 'react';
import { TaskWithClient } from '@/types';
import { taskToFormValues } from '@/utils/taskFormUtils';

interface UseTaskFormInitParams {
  taskId?: string;
  isEditMode: boolean;
  tasks: TaskWithClient[];
  tasksLoading: boolean;
  reset: ((values?: Partial<TaskWithClient>) => void) | undefined;
  onMessage?: (message: string) => void;
}

/**
 * Task form initialization hook
 * Responsibilities:
 * - Loading existing task data in edit mode
 * - Form reset with task data
 * - Error handling for missing tasks
 * - Edit mode data coordination
 */
export function useTaskFormInit({
  taskId,
  isEditMode,
  tasks,
  tasksLoading,
  reset,
  onMessage,
}: UseTaskFormInitParams) {

  // Load existing task data for edit mode using cache-first approach
  useEffect(() => {
    if (!isEditMode || !taskId || !reset || tasksLoading) {
      return;
    }

    try {
      // Find task directly from tasks array
      const task = tasks.find((t) => t.id === parseInt(taskId, 10));
      console.log("Loading task data:", {
        taskId,
        tasks: tasks.length,
        foundTask: !!task
      });

      if (task) {
        const formValues = taskToFormValues(task);
        console.log("Resetting form with task data:", formValues);
        
        reset(formValues);
      } else if (tasks.length > 0) {
        // Tasks are loaded but specific task not found
        console.warn(
          "Task not found in cache:",
          taskId,
          "Available tasks:",
          tasks.map((t) => t.id)
        );
        onMessage?.("Task not found");
      }
      // If tasks.length === 0, we're still waiting for data to load
    } catch (error) {
      console.error("Failed to load task:", error);
      onMessage?.("Failed to load task data");
    }
  }, [isEditMode, taskId, tasks, tasksLoading, reset, onMessage]);
}