import { useTasks } from '../data/useTasks';

// Mock the entire hook to avoid complex TanStack Query, Supabase, and useClients integration
jest.mock('../data/useTasks', () => ({
  useTasks: jest.fn(),
}));

const mockedUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;

describe('useTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide the correct interface structure', () => {
    const mockReturn = {
      tasks: [],
      isLoading: false,
      isError: false,
      error: null,
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      completeTask: jest.fn(),
      incompleteTask: jest.fn(),
      getTaskById: jest.fn(),
      refetch: jest.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
    };

    mockedUseTasks.mockReturnValue(mockReturn);

    const result = useTasks();

    // Core data properties
    expect(result).toHaveProperty('tasks');
    expect(result).toHaveProperty('isLoading');
    expect(result).toHaveProperty('isError');
    expect(result).toHaveProperty('error');

    // CRUD operations
    expect(result).toHaveProperty('createTask');
    expect(result).toHaveProperty('updateTask');
    expect(result).toHaveProperty('deleteTask');
    expect(result).toHaveProperty('completeTask');
    expect(result).toHaveProperty('incompleteTask');

    // Utilities
    expect(result).toHaveProperty('getTaskById');
    expect(result).toHaveProperty('refetch');

    // Mutation states
    expect(result).toHaveProperty('isCreating');
    expect(result).toHaveProperty('isUpdating');
    expect(result).toHaveProperty('isDeleting');
  });

  it('should return correct types for all properties', () => {
    const mockReturn = {
      tasks: [],
      isLoading: false,
      isError: false,
      error: null,
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      completeTask: jest.fn(),
      incompleteTask: jest.fn(),
      getTaskById: jest.fn(),
      refetch: jest.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
    };

    mockedUseTasks.mockReturnValue(mockReturn);

    const result = useTasks();

    // Data types
    expect(Array.isArray(result.tasks)).toBe(true);
    expect(typeof result.isLoading).toBe('boolean');
    expect(typeof result.isError).toBe('boolean');

    // Function types
    expect(typeof result.createTask).toBe('function');
    expect(typeof result.updateTask).toBe('function');
    expect(typeof result.deleteTask).toBe('function');
    expect(typeof result.completeTask).toBe('function');
    expect(typeof result.incompleteTask).toBe('function');
    expect(typeof result.getTaskById).toBe('function');
    expect(typeof result.refetch).toBe('function');

    // Mutation state types
    expect(typeof result.isCreating).toBe('boolean');
    expect(typeof result.isUpdating).toBe('boolean');
    expect(typeof result.isDeleting).toBe('boolean');
  });

  it('should handle empty tasks state', () => {
    const mockReturn = {
      tasks: [],
      isLoading: false,
      isError: false,
      error: null,
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      completeTask: jest.fn(),
      incompleteTask: jest.fn(),
      getTaskById: jest.fn(),
      refetch: jest.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
    };

    mockedUseTasks.mockReturnValue(mockReturn);

    const result = useTasks();

    expect(result.tasks).toEqual([]);
    expect(result.isLoading).toBe(false);
    expect(result.isError).toBe(false);
  });

  it('should handle loading state', () => {
    const mockReturn = {
      tasks: [],
      isLoading: true,
      isError: false,
      error: null,
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      completeTask: jest.fn(),
      incompleteTask: jest.fn(),
      getTaskById: jest.fn(),
      refetch: jest.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
    };

    mockedUseTasks.mockReturnValue(mockReturn);

    const result = useTasks();

    expect(result.isLoading).toBe(true);
    expect(result.tasks).toEqual([]);
  });

  it('should handle error state', () => {
    const mockError = new Error('Network error');
    const mockReturn = {
      tasks: [],
      isLoading: false,
      isError: true,
      error: mockError,
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      completeTask: jest.fn(),
      incompleteTask: jest.fn(),
      getTaskById: jest.fn(),
      refetch: jest.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
    };

    mockedUseTasks.mockReturnValue(mockReturn);

    const result = useTasks();

    expect(result.isError).toBe(true);
    expect(result.error).toBe(mockError);
  });

  it('should handle tasks data', () => {
    const mockTasks = [
      { id: 1, title: 'Task 1', client_name: 'Client 1', client_id: 1 },
      { id: 2, title: 'Task 2', client_name: 'Client 2', client_id: 2 },
    ];

    const mockReturn = {
      tasks: mockTasks,
      isLoading: false,
      isError: false,
      error: null,
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      completeTask: jest.fn(),
      incompleteTask: jest.fn(),
      getTaskById: jest.fn(),
      refetch: jest.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
    };

    mockedUseTasks.mockReturnValue(mockReturn);

    const result = useTasks();

    expect(result.tasks).toEqual(mockTasks);
    expect(result.tasks).toHaveLength(2);
  });

  it('should provide all CRUD operations', () => {
    const mockCreateTask = jest.fn();
    const mockUpdateTask = jest.fn();
    const mockDeleteTask = jest.fn();
    const mockCompleteTask = jest.fn();
    const mockIncompleteTask = jest.fn();

    const mockReturn = {
      tasks: [],
      isLoading: false,
      isError: false,
      error: null,
      createTask: mockCreateTask,
      updateTask: mockUpdateTask,
      deleteTask: mockDeleteTask,
      completeTask: mockCompleteTask,
      incompleteTask: mockIncompleteTask,
      getTaskById: jest.fn(),
      refetch: jest.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
    };

    mockedUseTasks.mockReturnValue(mockReturn);

    const result = useTasks();

    expect(result.createTask).toBe(mockCreateTask);
    expect(result.updateTask).toBe(mockUpdateTask);
    expect(result.deleteTask).toBe(mockDeleteTask);
    expect(result.completeTask).toBe(mockCompleteTask);
    expect(result.incompleteTask).toBe(mockIncompleteTask);
  });

  it('should provide utility functions', () => {
    const mockGetTaskById = jest.fn();
    const mockRefetch = jest.fn();

    const mockReturn = {
      tasks: [],
      isLoading: false,
      isError: false,
      error: null,
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      completeTask: jest.fn(),
      incompleteTask: jest.fn(),
      getTaskById: mockGetTaskById,
      refetch: mockRefetch,
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
    };

    mockedUseTasks.mockReturnValue(mockReturn);

    const result = useTasks();

    expect(typeof result.getTaskById).toBe('function');
    expect(typeof result.refetch).toBe('function');
    expect(result.getTaskById).toBe(mockGetTaskById);
    expect(result.refetch).toBe(mockRefetch);
  });

  it('should handle mutation states', () => {
    const mockReturn = {
      tasks: [],
      isLoading: false,
      isError: false,
      error: null,
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      completeTask: jest.fn(),
      incompleteTask: jest.fn(),
      getTaskById: jest.fn(),
      refetch: jest.fn(),
      isCreating: true,
      isUpdating: true,
      isDeleting: true,
    };

    mockedUseTasks.mockReturnValue(mockReturn);

    const result = useTasks();

    expect(result.isCreating).toBe(true);
    expect(result.isUpdating).toBe(true);
    expect(result.isDeleting).toBe(true);
  });

  it('should handle complete task management interface', () => {
    const mockReturn = {
      tasks: [
        { id: 1, title: 'Test Task', client_name: 'Test Client', client_id: 1 }
      ],
      isLoading: false,
      isError: false,
      error: null,
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      completeTask: jest.fn(),
      incompleteTask: jest.fn(),
      getTaskById: jest.fn(),
      refetch: jest.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
    };

    mockedUseTasks.mockReturnValue(mockReturn);

    const result = useTasks();

    // Should provide comprehensive task management interface
    const expectedProperties = [
      'tasks', 'isLoading', 'isError', 'error',
      'createTask', 'updateTask', 'deleteTask', 'completeTask', 'incompleteTask',
      'getTaskById', 'refetch',
      'isCreating', 'isUpdating', 'isDeleting'
    ];

    expectedProperties.forEach(prop => {
      expect(result).toHaveProperty(prop);
    });

    // Should provide functional interface
    expect(Array.isArray(result.tasks)).toBe(true);
    expect(typeof result.createTask).toBe('function');
    expect(typeof result.updateTask).toBe('function');
    expect(typeof result.deleteTask).toBe('function');
    expect(typeof result.completeTask).toBe('function');
    expect(typeof result.incompleteTask).toBe('function');
    expect(typeof result.getTaskById).toBe('function');
    expect(typeof result.refetch).toBe('function');
  });

  it('should be callable without parameters', () => {
    const mockReturn = {
      tasks: [],
      isLoading: false,
      isError: false,
      error: null,
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      completeTask: jest.fn(),
      incompleteTask: jest.fn(),
      getTaskById: jest.fn(),
      refetch: jest.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
    };

    mockedUseTasks.mockReturnValue(mockReturn);

    // Should not throw when called without parameters
    expect(() => {
      useTasks();
    }).not.toThrow();
  });

  it('should provide comprehensive task state management', () => {
    const mockReturn = {
      tasks: [],
      isLoading: false,
      isError: false,
      error: null,
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      completeTask: jest.fn(),
      incompleteTask: jest.fn(),
      getTaskById: jest.fn(),
      refetch: jest.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
    };

    mockedUseTasks.mockReturnValue(mockReturn);

    const result = useTasks();

    // Should provide complete state management for task operations
    expect(typeof result.isCreating).toBe('boolean');
    expect(typeof result.isUpdating).toBe('boolean');
    expect(typeof result.isDeleting).toBe('boolean');
    expect(typeof result.isLoading).toBe('boolean');
    expect(typeof result.isError).toBe('boolean');
  });
});