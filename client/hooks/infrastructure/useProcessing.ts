import { useCallback, useEffect, useRef } from 'react';
import { create } from 'zustand';

/**
 * Dynamic Processing Messages
 * AI messages rotate to keep users engaged during longer operations
 */
const AI_MESSAGES = [
  'AI analyzing your document...',
  'Extracting key information...',
  'Identifying important dates...',
  'Understanding document context...',
  'Processing legal terminology...',
  'Validating extracted details...',
  'Organizing task information...',
  'Finalizing analysis...',
  'Almost ready...',
  'Preparing results...'
];

const GENERIC_MESSAGES = [
  'Loading...',
  'Working on it...',
  'Almost done...',
  'Just a moment...'
];

/**
 * Processing Store
 */
interface ProcessingStore {
  isProcessing: boolean;
  currentMessage: string;
  setProcessing: (isProcessing: boolean, message?: string) => void;
}

const useProcessingStore = create<ProcessingStore>((set) => ({
  isProcessing: false,
  currentMessage: '',
  setProcessing: (isProcessing: boolean, message = '') => {
    set({ isProcessing, currentMessage: message });
  },
}));

/**
 * Main Processing Hook with Dynamic Message Support
 */
export function useProcessing() {
  const { isProcessing, currentMessage, setProcessing } = useProcessingStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageIndexRef = useRef(0);
  const currentMessagesRef = useRef<string[]>([]);

  // Start dynamic message rotation
  const startDynamicMessages = useCallback((messages: string[]) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    currentMessagesRef.current = messages;
    messageIndexRef.current = 0;
    setProcessing(true, messages[0]);

    intervalRef.current = setInterval(() => {
      messageIndexRef.current = (messageIndexRef.current + 1) % messages.length;
      setProcessing(true, messages[messageIndexRef.current]);
    }, 3000);
  }, [setProcessing]);

  // Stop processing and cleanup
  const stopProcessing = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProcessing(false, '');
  }, [setProcessing]);

  // Start AI processing with dynamic messages
  const startAIProcessing = useCallback(() => {
    startDynamicMessages(AI_MESSAGES);
  }, [startDynamicMessages]);

  // Start generic processing with dynamic messages
  const startGenericProcessing = useCallback(() => {
    startDynamicMessages(GENERIC_MESSAGES);
  }, [startDynamicMessages]);

  // Start processing with static message
  const startProcessing = useCallback((message: string) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProcessing(true, message);
  }, [setProcessing]);

  // Wrapper function for async operations
  const withProcessing = useCallback(async <T>(
    operation: () => Promise<T>,
    useAIDynamic = false,
    staticMessage?: string
  ): Promise<T> => {
    try {
      if (staticMessage) {
        startProcessing(staticMessage);
      } else if (useAIDynamic) {
        startAIProcessing();
      } else {
        startGenericProcessing();
      }
      return await operation();
    } finally {
      stopProcessing();
    }
  }, [startProcessing, startAIProcessing, startGenericProcessing, stopProcessing]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isProcessing,
    currentMessage,
    startProcessing,
    startAIProcessing,
    startGenericProcessing,
    stopProcessing,
    withProcessing,
  };
}

