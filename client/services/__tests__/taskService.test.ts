import { TaskService } from '../taskService';
import { supabase } from '../../utils/supabase';
import { TaskWithClient } from '../../types';

// Mock the supabase client
jest.mock('../../utils/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          ilike: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    })),
  },
}));

describe('TaskService', () => {
  const mockUser = { id: 'test-user-id' };
  const mockTaskFormData: TaskWithClient = {
    title: 'Test Court Hearing',
    client_name: 'Smith & Associates',
    event_time: '2025-09-05T09:00:00+08:00',
    location: 'Courtroom 5',
    note: 'Important case meeting',
    // Database fields (not used in form but required by type)
    id: 0,
    user_id: '',
    client_id: 0,
    source_type: 'manual',
    created_at: '',
    updated_at: null,
    completed_at: null,
    notification_sent: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create task successfully with new client', async () => {
      // Mock authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock client resolution (client doesn't exist)
      const mockClientQuery = {
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // Not found
        }),
      };
      
      const mockClientInsert = {
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 123 },
            error: null,
          }),
        }),
      };

      const mockClientFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            ilike: jest.fn().mockReturnValue(mockClientQuery),
          }),
        }),
        insert: jest.fn().mockReturnValue(mockClientInsert),
      };

      // Mock task creation
      const mockCreatedTask = {
        id: 456,
        user_id: mockUser.id,
        client_id: 123,
        title: mockTaskFormData.title,
        event_time: mockTaskFormData.event_time,
        location: mockTaskFormData.location,
        note: mockTaskFormData.note,
        source_type: 'manual',
        created_at: '2025-08-30T12:00:00Z',
        updated_at: null,
        completed_at: null,
        notification_sent: false,
        clients: {
          id: 123,
          client_name: mockTaskFormData.client_name,
          created_at: '2025-08-30T12:00:00Z',
        },
      };

      const mockTaskInsert = {
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockCreatedTask,
            error: null,
          }),
        }),
      };

      const mockTaskFrom = {
        insert: jest.fn().mockReturnValue(mockTaskInsert),
      };

      // Setup the from mock to return different objects based on table name
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'clients') return mockClientFrom;
        if (table === 'tasks') return mockTaskFrom;
        throw new Error(`Unexpected table: ${table}`);
      });

      // Execute the test
      const result = await TaskService.createTask(mockTaskFormData);

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.task).toBeDefined();
      expect(result.task?.title).toBe(mockTaskFormData.title);
      expect(result.task?.client_name).toBe(mockTaskFormData.client_name);
      expect(result.error).toBeUndefined();

      // Verify the service called the correct methods
      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('clients');
      expect(supabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should return error when user is not authenticated', async () => {
      // Mock failed authentication
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const result = await TaskService.createTask(mockTaskFormData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required. Please log in again.');
      expect(result.task).toBeUndefined();
    });
  });

  describe('resolveClient', () => {
    it('should return null for empty client name', async () => {
      const result = await TaskService.resolveClient('', 'user-id');
      expect(result).toBeNull();
    });

    it('should return null for null client name', async () => {
      const result = await TaskService.resolveClient(null, 'user-id');
      expect(result).toBeNull();
    });

    it('should find existing client', async () => {
      const mockClientQuery = {
        single: jest.fn().mockResolvedValue({
          data: { id: 789 },
          error: null,
        }),
      };

      const mockClientFrom = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            ilike: jest.fn().mockReturnValue(mockClientQuery),
          }),
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockClientFrom);

      const result = await TaskService.resolveClient('Existing Client', 'user-id');

      expect(result).toBe(789);
      expect(mockClientFrom.select).toHaveBeenCalledWith('id');
    });
  });
});