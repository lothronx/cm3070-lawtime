import { create } from 'zustand';
import { ProposedTask } from '@/types';

interface AIWorkflowState {
  // Data
  tasks: ProposedTask[];
  sourceType: 'ocr' | 'asr' | null;
  currentIndex: number;

  // Status
  isProcessing: boolean;
}

interface AIWorkflowActions {
  // Task management
  setTasks: (tasks: ProposedTask[], sourceType: 'ocr' | 'asr') => void;

  // Navigation
  setCurrentIndex: (index: number) => void;

  // Processing status
  setProcessing: (isProcessing: boolean) => void;

  // State reset
  reset: () => void;
}

type AIWorkflowStore = AIWorkflowState & AIWorkflowActions;

export const useAIWorkflowStore = create<AIWorkflowStore>((set) => ({
  // Initial State
  tasks: [],
  sourceType: null,
  currentIndex: 1,
  isProcessing: false,

  // Task Management
  setTasks: (tasks: ProposedTask[], sourceType: 'ocr' | 'asr') => {
    set({
      tasks,
      sourceType,
      currentIndex: 1 // Reset to first task when new tasks arrive
    });
  },

  // Navigation
  setCurrentIndex: (currentIndex: number) => {
    set({ currentIndex });
  },

  // Processing Status
  setProcessing: (isProcessing: boolean) => {
    set({ isProcessing });
  },

  // State Reset
  reset: () => {
    set({
      tasks: [],
      sourceType: null,
      currentIndex: 1,
      isProcessing: false,
    });
  },
}));