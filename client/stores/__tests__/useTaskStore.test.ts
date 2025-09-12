import { useTaskStore, TaskConfig, OperationResult } from '../useTaskStore';
import { TaskWithClient } from '@/types';

// Mock useTaskFilesStore
jest.mock('../useTaskFilesStore', () => ({
  useTaskFilesStore: {
    getState: jest.fn(() => ({
      tempFiles: [],
      commitTempFiles: jest.fn(),
      clearTempFiles: jest.fn(),
    })),
  },
}));

describe('useTaskStore', () => {
  const mockTaskAPI = {
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
  };

  const mockConfig: TaskConfig = {
    taskId: '1',
    isEditMode: false,
    isAIFlow: false,
    currentTaskIndex: 1,
    totalTasks: 1,
  };

  const mockTaskData: TaskWithClient = {
    title: 'Court Hearing',
    event_time: '2025-09-15T09:00:00+08:00',
    location: 'Court Room 3',
    note: 'Bring all documents',
    client_id: 1,
    client_name: 'ACME Corp',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useTaskStore.setState({
      snackbarVisible: false,
      snackbarMessage: '',
      isSubmitting: false,
      isDirty: false,
      formSaveCallback: null,
      config: null,
      dependencies: null,
    });
  });

  describe('Initial State', () => {
    it('should have correct default state', () => {
      const state = useTaskStore.getState();

      expect(state.snackbarVisible).toBe(false);
      expect(state.snackbarMessage).toBe('');
      expect(state.isSubmitting).toBe(false);
      expect(state.isDirty).toBe(false);
      expect(state.formSaveCallback).toBeNull();
      expect(state.config).toBeNull();
      expect(state.dependencies).toBeNull();
    });
  });

  describe('setConfig', () => {
    it('should set configuration', () => {
      const { setConfig } = useTaskStore.getState();

      setConfig(mockConfig);

      const state = useTaskStore.getState();
      expect(state.config).toEqual(mockConfig);
    });
  });

  describe('setDependencies', () => {
    it('should set dependencies', () => {
      const { setDependencies } = useTaskStore.getState();
      const dependencies = { taskAPI: mockTaskAPI };

      setDependencies(dependencies);

      const state = useTaskStore.getState();
      expect(state.dependencies).toEqual(dependencies);
    });
  });

  describe('setFormState', () => {
    it('should update form state fields', () => {
      const { setFormState } = useTaskStore.getState();
      const mockCallback = jest.fn();

      setFormState({
        isSubmitting: true,
        isDirty: true,
        formSaveCallback: mockCallback,
      });

      const state = useTaskStore.getState();
      expect(state.isSubmitting).toBe(true);
      expect(state.isDirty).toBe(true);
      expect(state.formSaveCallback).toBe(mockCallback);
    });

    it('should update partial form state', () => {
      useTaskStore.setState({ isDirty: false, isSubmitting: false });

      const { setFormState } = useTaskStore.getState();
      setFormState({ isDirty: true });

      const state = useTaskStore.getState();
      expect(state.isDirty).toBe(true);
      expect(state.isSubmitting).toBe(false);
    });
  });

  describe('showMessage', () => {
    it('should set snackbar message and visibility', () => {
      const { showMessage } = useTaskStore.getState();

      showMessage('Test message');

      const state = useTaskStore.getState();
      expect(state.snackbarMessage).toBe('Test message');
      expect(state.snackbarVisible).toBe(true);
    });
  });

  describe('setSnackbarVisible', () => {
    it('should set snackbar visibility', () => {
      useTaskStore.setState({ snackbarVisible: true });

      const { setSnackbarVisible } = useTaskStore.getState();
      setSnackbarVisible(false);

      const state = useTaskStore.getState();
      expect(state.snackbarVisible).toBe(false);
    });
  });

  describe('saveForm', () => {
    it('should call form save callback when available', async () => {
      const mockCallback = jest.fn().mockResolvedValue(undefined);
      useTaskStore.setState({ formSaveCallback: mockCallback });

      const { saveForm } = useTaskStore.getState();
      const result = await saveForm();

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true, navigationIntent: 'stay' });
    });

    it('should show error when no form callback available', async () => {
      const { saveForm } = useTaskStore.getState();
      const result = await saveForm();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Form not ready. Please try again.');
      expect(result.navigationIntent).toBe('stay');

      const state = useTaskStore.getState();
      expect(state.snackbarVisible).toBe(true);
      expect(state.snackbarMessage).toBe('Form not ready. Please try again.');
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      useTaskStore.setState({
        snackbarVisible: true,
        snackbarMessage: 'Test message',
        isSubmitting: true,
        isDirty: true,
        formSaveCallback: jest.fn(),
        config: mockConfig,
        dependencies: { taskAPI: mockTaskAPI },
      });

      const { reset } = useTaskStore.getState();
      reset();

      const state = useTaskStore.getState();
      expect(state.snackbarVisible).toBe(false);
      expect(state.snackbarMessage).toBe('');
      expect(state.isSubmitting).toBe(false);
      expect(state.isDirty).toBe(false);
      expect(state.formSaveCallback).toBeNull();
      expect(state.config).toBeNull();
      expect(state.dependencies).toBeNull();
    });
  });

  describe('Store Integration', () => {
    it('should handle basic configuration workflow', () => {
      const { setConfig, setDependencies, setFormState, reset } = useTaskStore.getState();

      // Configure store
      setConfig(mockConfig);
      setDependencies({ taskAPI: mockTaskAPI });
      setFormState({ isDirty: true });

      let state = useTaskStore.getState();
      expect(state.config).toEqual(mockConfig);
      expect(state.dependencies).toEqual({ taskAPI: mockTaskAPI });
      expect(state.isDirty).toBe(true);

      // Reset
      reset();
      state = useTaskStore.getState();
      expect(state.config).toBeNull();
      expect(state.dependencies).toBeNull();
      expect(state.isDirty).toBe(false);
    });

    it('should handle snackbar message workflow', () => {
      const { showMessage, setSnackbarVisible } = useTaskStore.getState();

      // Show message
      showMessage('Success message');
      let state = useTaskStore.getState();
      expect(state.snackbarVisible).toBe(true);
      expect(state.snackbarMessage).toBe('Success message');

      // Hide snackbar
      setSnackbarVisible(false);
      state = useTaskStore.getState();
      expect(state.snackbarVisible).toBe(false);
    });
  });
});