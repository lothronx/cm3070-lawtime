import { taskService } from '../taskService';
import { supabase } from '@/utils/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { TaskWithClient, TaskInsert } from '@/types';

// Mock the supabase client
jest.mock('@/utils/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
    })),
    storage: {
      from: jest.fn(() => ({
        remove: jest.fn(() => Promise.resolve({ error: null })),
      })),
    },
  },
}));

// Mock auth store
jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

const mockUseAuthStore = useAuthStore.getState as jest.MockedFunction<typeof useAuthStore.getState>;

describe('taskService', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  const mockSession = {
    user: mockUser,
    access_token: 'mock-token',
  };

  const mockTaskWithClient: TaskWithClient = {
    id: 456,
    user_id: 'test-user-id',
    client_id: 123,
    client_name: 'ACME Corporation',
    title: 'Court Hearing',
    event_time: '2025-09-05T09:00:00+08:00',
    location: 'Court Room 3',
    note: 'Bring all documents',
    source_type: 'manual',
    created_at: '2025-08-31T10:00:00Z',
    completed_at: null,
    notification_sent: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ session: mockSession });
  });

  describe('getTasks', () => {
    it('should fetch all tasks with client information', async () => {
      const mockTasksData = [
        {
          ...mockTaskWithClient,
          clients: {
            client_name: 'ACME Corporation',
          },
        },
        {
          ...mockTaskWithClient,
          id: 457,
          client_id: 124,
          clients: {
            client_name: 'Beta LLC',
          },
        },
      ];

      const mockOrder = jest.fn().mockResolvedValue({
        data: mockTasksData,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await taskService.getTasks();

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(mockSelect).toHaveBeenCalledWith(`
        *,
        clients(
          client_name
        )
      `);
      expect(mockOrder).toHaveBeenCalledWith('event_time', { ascending: true });
      
      expect(result).toHaveLength(2);
      expect(result[0].client_name).toBe('ACME Corporation');
      expect(result[1].client_name).toBe('Beta LLC');
    });

    it('should handle tasks without clients', async () => {
      const mockTasksData = [
        {
          ...mockTaskWithClient,
          client_id: null,
          clients: null,
        },
      ];

      const mockOrder = jest.fn().mockResolvedValue({
        data: mockTasksData,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await taskService.getTasks();

      expect(result).toHaveLength(1);
      expect(result[0].client_name).toBeNull();
      expect(result[0].client_id).toBeNull();
    });

    it('should return empty array when no tasks exist', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await taskService.getTasks();

      expect(result).toEqual([]);
    });

    it('should throw error on database error', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      await expect(taskService.getTasks()).rejects.toThrow(
        'Failed to fetch tasks: Database connection failed'
      );
    });

    it('should handle RLS filtering automatically', async () => {
      const userTasks = [mockTaskWithClient];
      
      const mockOrder = jest.fn().mockResolvedValue({
        data: userTasks.map(task => ({
          ...task,
          clients: { client_name: task.client_name },
        })),
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await taskService.getTasks();

      expect(result.every(task => task.user_id === 'test-user-id')).toBe(true);
    });
  });

  describe('createTask', () => {
    it('should create task successfully', async () => {
      const taskData: TaskWithClient = {
        ...mockTaskWithClient,
        id: 0, // Will be set by database
        created_at: '', // Will be set by database
      };

      const mockCreatedTaskData = {
        ...mockTaskWithClient,
        clients: {
          client_name: 'ACME Corporation',
        },
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockCreatedTaskData,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const result = await taskService.createTask(taskData);

      const expectedInsert: TaskInsert = {
        user_id: 'test-user-id',
        client_id: 123,
        title: 'Court Hearing',
        event_time: '2025-09-05T09:00:00+08:00',
        location: 'Court Room 3',
        note: 'Bring all documents',
        source_type: 'manual',
      };

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(mockInsert).toHaveBeenCalledWith(expectedInsert);
      expect(mockSelect).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();

      expect(result).toEqual({
        ...mockCreatedTaskData,
        client_name: 'ACME Corporation',
      });
    });

    it('should create task without client', async () => {
      const taskDataWithoutClient: TaskWithClient = {
        ...mockTaskWithClient,
        client_id: null,
        client_name: null,
      };

      const mockCreatedTaskData = {
        ...taskDataWithoutClient,
        clients: null,
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockCreatedTaskData,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const result = await taskService.createTask(taskDataWithoutClient);

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        client_id: null,
        title: 'Court Hearing',
        event_time: '2025-09-05T09:00:00+08:00',
        location: 'Court Room 3',
        note: 'Bring all documents',
        source_type: 'manual',
      });

      expect(result.client_name).toBeNull();
    });

    it('should handle different source types', async () => {
      const ocrTask: TaskWithClient = {
        ...mockTaskWithClient,
        source_type: 'ocr',
        note: 'Extracted from court notice',
      };

      const mockCreatedTaskData = {
        ...ocrTask,
        clients: { client_name: 'ACME Corporation' },
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockCreatedTaskData,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const result = await taskService.createTask(ocrTask);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          source_type: 'ocr',
          note: 'Extracted from court notice',
        })
      );

      expect(result.source_type).toBe('ocr');
    });

    it('should throw error when user is not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({ session: null });

      await expect(taskService.createTask(mockTaskWithClient)).rejects.toThrow(
        'Authentication required. Please log in again.'
      );

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should throw error on database insert failure', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Foreign key constraint violation' },
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      await expect(taskService.createTask(mockTaskWithClient)).rejects.toThrow(
        'Failed to create task: Foreign key constraint violation'
      );
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const updates: Partial<TaskWithClient> = {
        title: 'Updated Hearing',
        location: 'Court Room 5',
        note: 'Updated notes',
      };

      const mockUpdatedTaskData = {
        ...mockTaskWithClient,
        ...updates,
        clients: { client_name: 'ACME Corporation' },
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockUpdatedTaskData,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      const result = await taskService.updateTask(456, updates);

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(mockUpdate).toHaveBeenCalledWith({
        title: 'Updated Hearing',
        location: 'Court Room 5',
        note: 'Updated notes',
      });
      expect(mockEq).toHaveBeenCalledWith('id', 456);

      expect(result.title).toBe('Updated Hearing');
      expect(result.location).toBe('Court Room 5');
    });

    it('should filter out client_name from updates', async () => {
      const updates: Partial<TaskWithClient> = {
        title: 'Updated Title',
        client_name: 'Should be ignored', // This should be filtered out
        client_id: 999,
      };

      const mockUpdatedTaskData = {
        ...mockTaskWithClient,
        title: 'Updated Title',
        client_id: 999,
        clients: { client_name: 'Different Client' },
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockUpdatedTaskData,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      await taskService.updateTask(456, updates);

      expect(mockUpdate).toHaveBeenCalledWith({
        title: 'Updated Title',
        client_id: 999,
      });
      expect(mockUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({ client_name: 'Should be ignored' })
      );
    });

    it('should throw error when user is not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({ session: null });

      await expect(taskService.updateTask(456, {})).rejects.toThrow(
        'Authentication required. Please log in again.'
      );
    });

    it('should throw error on update failure', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Permission denied' },
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      await expect(taskService.updateTask(456, { title: 'Test' })).rejects.toThrow(
        'Failed to update task: Permission denied'
      );
    });
  });

  describe('deleteTask', () => {

    it('should handle task with no files', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockEq = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockDeleteEq = jest.fn().mockResolvedValue({
        error: null,
      });

      const mockDelete = jest.fn().mockReturnValue({
        eq: mockDeleteEq,
      });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: mockEq,
          }),
        })
        .mockReturnValueOnce({
          delete: mockDelete,
        });

      await taskService.deleteTask(456);

      expect(supabase.storage.from).not.toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalled();
    });


    it('should throw error when user is not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({ session: null });

      await expect(taskService.deleteTask(456)).rejects.toThrow(
        'Authentication required. Please log in again.'
      );
    });

    it('should throw error on task delete failure', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockEq = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockDeleteEq = jest.fn().mockResolvedValue({
        error: { message: 'Permission denied' },
      });

      const mockDelete = jest.fn().mockReturnValue({
        eq: mockDeleteEq,
      });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: mockEq,
          }),
        })
        .mockReturnValueOnce({
          delete: mockDelete,
        });

      await expect(taskService.deleteTask(456)).rejects.toThrow(
        'Failed to delete task: Permission denied'
      );
    });
  });

  describe('completeTask', () => {
    it('should mark task as completed', async () => {
      const mockCompletedTaskData = {
        ...mockTaskWithClient,
        completed_at: '2025-08-31T15:00:00.000Z',
        clients: { client_name: 'ACME Corporation' },
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockCompletedTaskData,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      const result = await taskService.completeTask(456);

      expect(mockUpdate).toHaveBeenCalledWith({
        completed_at: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
      });
      expect(mockEq).toHaveBeenCalledWith('id', 456);
      expect(result.completed_at).toBeTruthy();
    });
  });

  describe('uncompleteTask', () => {
    it('should mark task as incomplete', async () => {
      const mockIncompletedTaskData = {
        ...mockTaskWithClient,
        completed_at: null,
        clients: { client_name: 'ACME Corporation' },
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockIncompletedTaskData,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      });

      const result = await taskService.uncompleteTask(456);

      expect(mockUpdate).toHaveBeenCalledWith({
        completed_at: null,
      });
      expect(result.completed_at).toBeNull();
    });
  });

  describe('getTaskById', () => {
    it('should return task when found', async () => {
      const mockTaskData = {
        ...mockTaskWithClient,
        clients: { client_name: 'ACME Corporation' },
      };

      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: mockTaskData,
        error: null,
      });

      const mockEq = jest.fn().mockReturnValue({
        maybeSingle: mockMaybeSingle,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await taskService.getTaskById(456);

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(mockSelect).toHaveBeenCalledWith(`
        *,
        clients(
          client_name
        )
      `);
      expect(mockEq).toHaveBeenCalledWith('id', 456);
      expect(mockMaybeSingle).toHaveBeenCalled();

      expect(result).toEqual({
        ...mockTaskData,
        client_name: 'ACME Corporation',
      });
    });

    it('should return null when task not found', async () => {
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockEq = jest.fn().mockReturnValue({
        maybeSingle: mockMaybeSingle,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await taskService.getTaskById(999);

      expect(result).toBeNull();
    });

    it('should throw error when user is not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({ session: null });

      await expect(taskService.getTaskById(456)).rejects.toThrow(
        'Authentication required. Please log in again.'
      );
    });

    it('should throw error on database error', async () => {
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection lost' },
      });

      const mockEq = jest.fn().mockReturnValue({
        maybeSingle: mockMaybeSingle,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      await expect(taskService.getTaskById(456)).rejects.toThrow(
        'Failed to fetch task: Database connection lost'
      );
    });
  });
});