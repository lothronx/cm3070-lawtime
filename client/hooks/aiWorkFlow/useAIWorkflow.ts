import { useState, useEffect } from 'react';
import { Attachment, ProposedTask } from '@/types';
import { useAINavigation } from './useAINavigation';
import { useAIProcessing } from './useAIProcessing';
import { useAIWorkflowStore } from '@/stores/useAIWorkflowStore';

interface AIWorkflowParams {
  attachments?: Attachment[];
  sourceType?: 'ocr' | 'asr';
  stackIndex?: string;
  stackTotal?: string;
}

interface AIWorkflowState {
  // Status
  isActive: boolean;

  // Current task context
  currentTask: ProposedTask | null;
  currentIndex: number;
  totalTasks: number;

  // Actions
  startProcessing: () => void;
  continueFlow: (onComplete?: () => void) => Promise<string>;
}

/**
 * AI Workflow Hook
 *
 * Coordinates AI-powered task processing and navigation flow.
 * Acts as a facade that combines useAIProcessing and useAINavigation.
 */
export function useAIWorkflow({
  attachments = [],
  sourceType = 'ocr',
  stackIndex,
  stackTotal
}: AIWorkflowParams = {}): AIWorkflowState {
  const [triggerProcessing, setTriggerProcessing] = useState(false);
  
  // Use the new modular hooks
  const { processFiles } = useAIProcessing({
    onSuccess: (taskCount) => {
      if (taskCount === 0) {
        console.log('No tasks extracted - user will manually enter task details');
      } else {
        console.log(`AI generated ${taskCount} tasks`);
      }
    },
    onError: (error) => {
      console.error('AI processing failed:', error);
    }
  });
  
  const { continueFlow } = useAINavigation();
  
  // Get state from the store
  const { tasks } = useAIWorkflowStore();

  // Auto-process when triggered and files are available
  useEffect(() => {
    if (triggerProcessing && attachments.some(att => att.isTemporary)) {
      setTriggerProcessing(false);
      processFiles(attachments, sourceType);
    }
  }, [triggerProcessing, attachments, sourceType, processFiles]);

  // Compute current workflow context
  const hasActiveTasks = tasks.length > 0;
  const isFlowActive = hasActiveTasks || !!(stackIndex && stackTotal);
  const currentIndexFromParams = stackIndex ? parseInt(stackIndex, 10) : 1;
  const totalTasks = hasActiveTasks ? tasks.length : (stackTotal ? parseInt(stackTotal, 10) : 1);

  // Get current task for display
  const currentTask = (() => {
    const index = currentIndexFromParams - 1; // Convert to 0-based
    return (index >= 0 && index < tasks.length)
      ? tasks[index]
      : null;
  })();

  return {
    // Status
    isActive: isFlowActive,

    // Current context
    currentTask,
    currentIndex: currentIndexFromParams,
    totalTasks,

    // Actions
    startProcessing: () => setTriggerProcessing(true),
    continueFlow,
  };
}