import { taskService } from '../taskService';
import { supabase } from '../../utils/supabase';
import { clientService } from '../clientService';
import { TaskWithClient } from '../../types';

// Mock the clientService
jest.mock('../clientService', () => ({
  clientService: {
    findClientByName: jest.fn(),
    createClient: jest.fn(),
  },
}));

// Mock the auth store
const mockUseAuthStore = {
  getState: jest.fn(),
};

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: mockUseAuthStore,
}));

// Mock the supabase client
jest.mock('../../utils/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          // Mock chain for getTasks
        })),
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(),
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
  },
}));

describe('taskService', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2025-08-30T10:00:00Z',
  };

  const mockTaskData: TaskWithClient = {
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
  });

  describe('getTasks', () => {
    it('should fetch all tasks with client information', async () => {
      const mockTasksWithClients = [
        {
          ...mockTaskData,
          clients: {
            client_name: 'ACME Corporation',
          },
        },
        {
          ...mockTaskData,
          id: 457,
          client_name: 'Beta Corp',
          clients: {
            client_name: 'Beta Corp',
          },
        },
      ];

      const mockOrder = jest.fn().mockResolvedValue({
        data: mockTasksWithClients,
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
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('clients!inner'));
      expect(mockOrder).toHaveBeenCalledWith('event_time', { ascending: true });
      
      expect(result).toHaveLength(2);
      expect(result[0].client_name).toBe('ACME Corporation');
      expect(result[1].client_name).toBe('Beta Corp');
    });

    it('should handle empty result', async () => {
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
        error: { message: 'Database error' },
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      await expect(taskService.getTasks()).rejects.toThrow('Failed to fetch tasks: Database error');
    });
  });

  describe('createTask', () => {
    it('should create task with new client', async () => {
      // Mock authentication
      (mockUseAuthStore.getState as jest.Mock).mockReturnValue({
        session: { user: mockUser },
      });

      // Mock clientService - client doesn't exist, create new one
      (clientService.findClientByName as jest.Mock).mockResolvedValue(null);
      (clientService.createClient as jest.Mock).mockResolvedValue({
        id: 123,
        client_name: 'ACME Corporation',
        user_id: 'test-user-id',
        created_at: '2025-08-31T09:00:00Z',
      });

      const mockCreatedTask = {
        ...mockTaskData,
        clients: {
          client_name: 'ACME Corporation',
        },
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockCreatedTask,
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

      const result = await taskService.createTask(mockTaskData);

      expect(clientService.findClientByName).toHaveBeenCalledWith('ACME Corporation');
      expect(clientService.createClient).toHaveBeenCalledWith('ACME Corporation');
      
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        client_id: 123,
        title: 'Court Hearing',
        event_time: '2025-09-05T09:00:00+08:00',
        location: 'Court Room 3',
        note: 'Bring all documents',
        source_type: 'manual',
      });

      expect(result.client_name).toBe('ACME Corporation');
      expect(result.title).toBe('Court Hearing');
    });

    it('should create task with existing client', async () => {
      // Mock authentication
      (mockUseAuthStore.getState as jest.Mock).mockReturnValue({
        session: { user: mockUser },
      });

      // Mock clientService - client exists
      (clientService.findClientByName as jest.Mock).mockResolvedValue({
        id: 789,
        client_name: 'ACME Corporation',
        user_id: 'test-user-id',
        created_at: '2025-08-30T09:00:00Z',
      });

      const mockCreatedTask = {
        ...mockTaskData,
        client_id: 789,
        clients: {
          client_name: 'ACME Corporation',
        },
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockCreatedTask,
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

      const result = await taskService.createTask(mockTaskData);

      expect(clientService.findClientByName).toHaveBeenCalledWith('ACME Corporation');
      expect(clientService.createClient).not.toHaveBeenCalled();
      
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        client_id: 789,
        title: 'Court Hearing',
        event_time: '2025-09-05T09:00:00+08:00',
        location: 'Court Room 3',
        note: 'Bring all documents',
        source_type: 'manual',
      });

      expect(result.client_name).toBe('ACME Corporation');
    });

    it('should create task without client', async () => {
      // Mock authentication
      (mockUseAuthStore.getState as jest.Mock).mockReturnValue({
        session: { user: mockUser },
      });

      const taskDataWithoutClient = {
        ...mockTaskData,
        client_name: '',
        client_id: null,
      };

      const mockCreatedTask = {
        ...taskDataWithoutClient,
        clients: null,
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockCreatedTask,
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

      expect(clientService.findClientByName).not.toHaveBeenCalled();
      expect(clientService.createClient).not.toHaveBeenCalled();
      
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

    it('should throw error when user is not authenticated', async () => {
      // Mock failed authentication
      (mockUseAuthStore.getState as jest.Mock).mockReturnValue({
        session: null,
      });

      await expect(taskService.createTask(mockTaskData)).rejects.toThrow('Authentication required. Please log in again.');
      
      // Verify no client operations were called
      expect(clientService.findClientByName).not.toHaveBeenCalled();
      expect(clientService.createClient).not.toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      // Mock authentication
      (mockUseAuthStore.getState as jest.Mock).mockReturnValue({
        session: { user: mockUser },
      });

      const updates = {
        title: 'Updated Hearing',
        location: 'Court Room 5',
      };

      const mockUpdatedTask = {
        ...mockTaskData,
        ...updates,
        clients: {
          client_name: 'ACME Corporation',
        },
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockUpdatedTask,
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

      expect(mockUpdate).toHaveBeenCalledWith({
        title: 'Updated Hearing',
        location: 'Court Room 5',
        client_id: null,
      });
      expect(mockEq).toHaveBeenCalledWith('id', 456);
      expect(result.title).toBe('Updated Hearing');
      expect(result.location).toBe('Court Room 5');
    });

    it('should throw error when user is not authenticated', async () => {
      // Mock failed authentication
      (mockUseAuthStore.getState as jest.Mock).mockReturnValue({
        session: null,
      });

      await expect(taskService.updateTask(456, {})).rejects.toThrow('Authentication required. Please log in again.');
    });
  });

  describe('completeTask', () => {
    it('should mark task as completed', async () => {
      // Mock authentication
      (mockUseAuthStore.getState as jest.Mock).mockReturnValue({
        session: { user: mockUser },
      });

      const mockCompletedTask = {
        ...mockTaskData,
        completed_at: '2025-08-31T15:00:00Z',
        clients: {
          client_name: 'ACME Corporation',
        },
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockCompletedTask,
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
        client_id: null,
      });
      expect(result.completed_at).toBeTruthy();
    });

    it('should throw error when user is not authenticated', async () => {
      // Mock failed authentication
      (mockUseAuthStore.getState as jest.Mock).mockReturnValue({
        session: null,
      });

      await expect(taskService.completeTask(456)).rejects.toThrow('Authentication required. Please log in again.');
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      // Mock authentication
      (mockUseAuthStore.getState as jest.Mock).mockReturnValue({
        session: { user: mockUser },
      });

      const mockEq = jest.fn().mockResolvedValue({
        error: null,
      });

      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
      });

      await taskService.deleteTask(456);

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 456);
    });

    it('should throw error on delete failure', async () => {
      // Mock authentication
      (mockUseAuthStore.getState as jest.Mock).mockReturnValue({
        session: { user: mockUser },
      });

      const mockEq = jest.fn().mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
      });

      await expect(taskService.deleteTask(456)).rejects.toThrow('Failed to delete task: Delete failed');
    });

    it('should throw error when user is not authenticated', async () => {
      // Mock failed authentication
      (mockUseAuthStore.getState as jest.Mock).mockReturnValue({
        session: null,
      });

      await expect(taskService.deleteTask(456)).rejects.toThrow('Authentication required. Please log in again.');
    });
  });

  describe('getTaskById', () => {
    it('should return task when found', async () => {
      // Mock authentication
      (mockUseAuthStore.getState as jest.Mock).mockReturnValue({
        session: { user: mockUser },
      });

      const mockTaskWithClient = {
        ...mockTaskData,
        clients: {
          client_name: 'ACME Corporation',
        },
      };

      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: mockTaskWithClient,
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

      expect(mockEq).toHaveBeenCalledWith('id', 456);
      expect(result).toBeTruthy();
      expect(result?.client_name).toBe('ACME Corporation');
    });

    it('should return null when not found', async () => {
      // Mock authentication
      (mockUseAuthStore.getState as jest.Mock).mockReturnValue({
        session: { user: mockUser },
      });

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

      const result = await taskService.getTaskById(456);

      expect(result).toBeNull();
    });

    it('should throw error when user is not authenticated', async () => {
      // Mock failed authentication
      (mockUseAuthStore.getState as jest.Mock).mockReturnValue({
        session: null,
      });

      await expect(taskService.getTaskById(456)).rejects.toThrow('Authentication required. Please log in again.');
    });
  });
});