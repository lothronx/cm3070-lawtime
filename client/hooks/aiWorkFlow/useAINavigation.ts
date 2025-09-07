import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAIWorkflowStore } from '@/stores/useAIWorkflowStore';

/**
 * Navigation hook for AI workflow multi-task flows
 * Responsibilities:
 * - Task flow navigation logic
 * - Route parameter management
 * - Workflow completion handling
 * - Navigation state synchronization
 */
export function useAINavigation() {
  const router = useRouter();
  const {
    tasks,
    currentIndex,
    setCurrentIndex,
    reset
  } = useAIWorkflowStore();

  /**
   * Navigate to the next task in the workflow or complete the flow
   */
  const continueFlow = useCallback(async (onComplete?: () => void): Promise<string> => {
    const nextIndex = currentIndex + 1;
    const totalTasks = tasks.length;

    // More tasks remaining - navigate to next
    if (nextIndex <= totalTasks) {
      setCurrentIndex(nextIndex);
      router.replace({
        pathname: '/task',
        params: {
          mode: 'ai-flow',
          stackIndex: nextIndex.toString(),
          stackTotal: totalTasks.toString()
        }
      });
      return `Task ${currentIndex} processed! Showing task ${nextIndex} of ${totalTasks}`;
    }

    // All tasks completed - clean up and navigate back
    reset();
    await onComplete?.();

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }

    return "All tasks completed successfully!";
  }, [currentIndex, tasks.length, setCurrentIndex, reset, router]);

  /**
   * Navigate to a specific task in the workflow
   */
  const navigateToTask = useCallback((taskIndex: number) => {
    if (taskIndex >= 1 && taskIndex <= tasks.length) {
      setCurrentIndex(taskIndex);
      router.replace({
        pathname: '/task',
        params: {
          mode: 'ai-flow',
          stackIndex: taskIndex.toString(),
          stackTotal: tasks.length.toString()
        }
      });
    }
  }, [tasks.length, setCurrentIndex, router]);

  /**
   * Exit the AI workflow and return to previous screen
   */
  const exitFlow = useCallback(() => {
    reset();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [reset, router]);

  return {
    continueFlow,
    navigateToTask,
    exitFlow,
  };
}