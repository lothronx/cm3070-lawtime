import { create } from 'zustand';
import { ProposedTask } from '@/types';

interface PendingMessage {
  text: string;
  type: 'success' | 'error';
}

interface AIWorkflowState {
  // Data
  tasks: ProposedTask[];
  sourceType: 'ocr' | 'asr' | null;
  currentIndex: number;

  // Status
  isProcessing: boolean;
  pendingMessage: PendingMessage | null;
}

interface AIWorkflowActions {
  // Task management
  setTasks: (tasks: ProposedTask[], sourceType: 'ocr' | 'asr') => void;

  // Navigation
  setCurrentIndex: (index: number) => void;

  // Processing status
  setProcessing: (isProcessing: boolean) => void;

  // Messages
  setPendingMessage: (message: PendingMessage | null) => void;

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
  pendingMessage: null,

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

  // Messages
  setPendingMessage: (pendingMessage: PendingMessage | null) => {
    set({ pendingMessage });
  },

  // State Reset
  reset: () => {
    set({
      tasks: [],
      sourceType: null,
      currentIndex: 1,
      isProcessing: false,
      pendingMessage: null,
    });
  },
}));