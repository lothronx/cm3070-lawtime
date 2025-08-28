import { useState } from 'react';
import { useRouter } from 'expo-router';

interface UseAITaskFlowParams {
  stackIndex?: string;
  stackTotal?: string;
}

interface UseAITaskFlowReturn {
  isAIFlow: boolean;
  currentTaskIndex: number;
  totalTasks: number;
  setCurrentTaskIndex: (index: number) => void;
  navigateToNextTask: (onComplete: () => void) => Promise<string>;
  handleFlowCompletion: (onComplete: () => void) => Promise<void>;
}

export function useAITaskFlow({
  stackIndex,
  stackTotal
}: UseAITaskFlowParams): UseAITaskFlowReturn {
  const router = useRouter();

  const isAIFlow = !!(stackIndex && stackTotal);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(
    stackIndex ? parseInt(stackIndex, 10) : 1
  );
  const [totalTasks] = useState(stackTotal ? parseInt(stackTotal, 10) : 1);

  const navigateToNextTask = async (onComplete: () => void): Promise<string> => {
    if (currentTaskIndex < totalTasks) {
      setCurrentTaskIndex(currentTaskIndex + 1);
      return `Task ${currentTaskIndex} saved! Showing task ${currentTaskIndex + 1} of ${totalTasks}`;
    } else {
      await onComplete();
      router.back();
      return "All tasks saved successfully!";
    }
  };

  const handleFlowCompletion = async (onComplete: () => void): Promise<void> => {
    if (currentTaskIndex < totalTasks) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    } else {
      await onComplete();
      router.back();
    }
  };

  return {
    isAIFlow,
    currentTaskIndex,
    totalTasks,
    setCurrentTaskIndex,
    navigateToNextTask,
    handleFlowCompletion,
  };
}