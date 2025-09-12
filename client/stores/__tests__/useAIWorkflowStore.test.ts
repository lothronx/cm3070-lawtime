import { useAIWorkflowStore } from '../useAIWorkflowStore';
import { ProposedTask } from '@/types';

describe('useAIWorkflowStore', () => {
  const mockProposedTasks: ProposedTask[] = [
    {
      title: 'Court Hearing',
      event_time: '2025-09-15T09:00:00+08:00',
      location: 'Court Room 3',
      note: 'Bring all documents',
      client_resolution: {
        status: 'MATCH_FOUND',
        client_id: 1,
        client_name: 'ACME Corp',
      },
    },
    {
      title: 'Contract Review',
      event_time: '2025-09-20T14:00:00+08:00',
      location: null,
      note: 'Review merger agreement',
      client_resolution: {
        status: 'NEW_CLIENT_PROPOSED',
        client_id: null,
        client_name: 'New Client Inc',
      },
    },
  ];

  beforeEach(() => {
    // Reset store state
    useAIWorkflowStore.setState({
      tasks: [],
      sourceType: null,
      currentIndex: 1,
      isProcessing: false,
    });
  });

  describe('Initial State', () => {
    it('should have correct default state', () => {
      const state = useAIWorkflowStore.getState();

      expect(state.tasks).toEqual([]);
      expect(state.sourceType).toBeNull();
      expect(state.currentIndex).toBe(1);
      expect(state.isProcessing).toBe(false);
    });
  });

  describe('setTasks', () => {
    it('should set tasks with OCR source type', () => {
      const { setTasks } = useAIWorkflowStore.getState();

      setTasks(mockProposedTasks, 'ocr');

      const state = useAIWorkflowStore.getState();
      expect(state.tasks).toEqual(mockProposedTasks);
      expect(state.sourceType).toBe('ocr');
      expect(state.currentIndex).toBe(1);
    });

    it('should set tasks with ASR source type', () => {
      const { setTasks } = useAIWorkflowStore.getState();

      setTasks(mockProposedTasks, 'asr');

      const state = useAIWorkflowStore.getState();
      expect(state.tasks).toEqual(mockProposedTasks);
      expect(state.sourceType).toBe('asr');
      expect(state.currentIndex).toBe(1);
    });

    it('should handle empty tasks array', () => {
      const { setTasks } = useAIWorkflowStore.getState();

      setTasks([], 'ocr');

      const state = useAIWorkflowStore.getState();
      expect(state.tasks).toEqual([]);
      expect(state.sourceType).toBe('ocr');
      expect(state.currentIndex).toBe(1);
    });

    it('should reset currentIndex when setting new tasks', () => {
      // Set initial state with different index
      useAIWorkflowStore.setState({ currentIndex: 5 });

      const { setTasks } = useAIWorkflowStore.getState();
      setTasks(mockProposedTasks, 'ocr');

      const state = useAIWorkflowStore.getState();
      expect(state.currentIndex).toBe(1);
    });
  });

  describe('setCurrentIndex', () => {
    it('should set current index', () => {
      const { setCurrentIndex } = useAIWorkflowStore.getState();

      setCurrentIndex(3);

      const state = useAIWorkflowStore.getState();
      expect(state.currentIndex).toBe(3);
    });

    it('should handle index 0', () => {
      const { setCurrentIndex } = useAIWorkflowStore.getState();

      setCurrentIndex(0);

      const state = useAIWorkflowStore.getState();
      expect(state.currentIndex).toBe(0);
    });
  });

  describe('setProcessing', () => {
    it('should set processing state to true', () => {
      const { setProcessing } = useAIWorkflowStore.getState();

      setProcessing(true);

      const state = useAIWorkflowStore.getState();
      expect(state.isProcessing).toBe(true);
    });

    it('should set processing state to false', () => {
      useAIWorkflowStore.setState({ isProcessing: true });

      const { setProcessing } = useAIWorkflowStore.getState();
      setProcessing(false);

      const state = useAIWorkflowStore.getState();
      expect(state.isProcessing).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      useAIWorkflowStore.setState({
        tasks: mockProposedTasks,
        sourceType: 'ocr',
        currentIndex: 5,
        isProcessing: true,
      });

      const { reset } = useAIWorkflowStore.getState();
      reset();

      const state = useAIWorkflowStore.getState();
      expect(state.tasks).toEqual([]);
      expect(state.sourceType).toBeNull();
      expect(state.currentIndex).toBe(1);
      expect(state.isProcessing).toBe(false);
    });

    it('should reset when already in initial state', () => {
      const { reset } = useAIWorkflowStore.getState();
      reset();

      const state = useAIWorkflowStore.getState();
      expect(state.tasks).toEqual([]);
      expect(state.sourceType).toBeNull();
      expect(state.currentIndex).toBe(1);
      expect(state.isProcessing).toBe(false);
    });
  });

  describe('Store Integration', () => {
    it('should handle typical AI workflow states', () => {
      const {
        setProcessing,
        setTasks,
        setCurrentIndex,
        reset,
      } = useAIWorkflowStore.getState();

      // Start processing
      setProcessing(true);
      expect(useAIWorkflowStore.getState().isProcessing).toBe(true);

      // Successful processing
      setProcessing(false);
      setTasks(mockProposedTasks, 'ocr');

      let state = useAIWorkflowStore.getState();
      expect(state.isProcessing).toBe(false);
      expect(state.tasks).toEqual(mockProposedTasks);
      expect(state.sourceType).toBe('ocr');
      expect(state.currentIndex).toBe(1);

      // Navigate through tasks
      setCurrentIndex(2);
      expect(useAIWorkflowStore.getState().currentIndex).toBe(2);

      // Reset for new workflow
      reset();
      state = useAIWorkflowStore.getState();
      expect(state.tasks).toEqual([]);
      expect(state.sourceType).toBeNull();
      expect(state.currentIndex).toBe(1);
      expect(state.isProcessing).toBe(false);
    });

    it('should maintain state consistency during multiple operations', () => {
      const {
        setTasks,
        setProcessing,
        setCurrentIndex,
      } = useAIWorkflowStore.getState();

      // Simulate multiple rapid state changes
      setProcessing(true);
      setTasks(mockProposedTasks, 'asr');
      setCurrentIndex(2);
      setProcessing(false);

      const state = useAIWorkflowStore.getState();
      expect(state.isProcessing).toBe(false);
      expect(state.tasks).toEqual(mockProposedTasks);
      expect(state.sourceType).toBe('asr');
      expect(state.currentIndex).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tasks with different client resolution statuses', () => {
      const mixedTasks: ProposedTask[] = [
        {
          title: 'Task 1',
          event_time: '2025-09-15T09:00:00+08:00',
          location: 'Location 1',
          note: 'Note 1',
          client_resolution: {
            status: 'MATCH_FOUND',
            client_id: 1,
            client_name: 'Client 1',
          },
        },
        {
          title: 'Task 2',
          event_time: '2025-09-16T10:00:00+08:00',
          location: 'Location 2',
          note: 'Note 2',
          client_resolution: {
            status: 'NEW_CLIENT_PROPOSED',
            client_id: null,
            client_name: 'New Client',
          },
        },
        {
          title: 'Task 3',
          event_time: '2025-09-17T11:00:00+08:00',
          location: 'Location 3',
          note: 'Note 3',
          client_resolution: {
            status: 'NO_CLIENT_IDENTIFIED',
            client_id: null,
            client_name: null,
          },
        },
      ];

      const { setTasks } = useAIWorkflowStore.getState();
      setTasks(mixedTasks, 'ocr');

      const state = useAIWorkflowStore.getState();
      expect(state.tasks).toEqual(mixedTasks);
      expect(state.tasks).toHaveLength(3);
    });

    it('should handle tasks with null/undefined fields', () => {
      const tasksWithNulls: ProposedTask[] = [
        {
          title: 'Task with nulls',
          event_time: '2025-09-15T09:00:00+08:00',
          location: null,
          note: null,
          client_resolution: {
            status: 'NO_CLIENT_IDENTIFIED',
            client_id: null,
            client_name: null,
          },
        },
      ];

      const { setTasks } = useAIWorkflowStore.getState();
      setTasks(tasksWithNulls, 'asr');

      const state = useAIWorkflowStore.getState();
      expect(state.tasks).toEqual(tasksWithNulls);
      expect(state.sourceType).toBe('asr');
    });
  });
});