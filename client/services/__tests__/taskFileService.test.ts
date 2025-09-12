import { taskFileService } from '../taskFileService';
import { supabase } from '@/utils/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { TaskFile, TaskFileInsert } from '@/types';

// Mock the supabase client
jest.mock('@/utils/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
          maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

// Mock auth store
jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

const mockUseAuthStore = useAuthStore.getState as jest.MockedFunction<typeof useAuthStore.getState>;

describe('taskFileService', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  const mockSession = {
    user: mockUser,
    access_token: 'mock-token',
  };

  const mockTaskFile: TaskFile = {
    id: 123,
    task_id: 456,
    user_id: 'test-user-id',
    role: 'attachment',
    file_name: 'document.pdf',
    storage_path: 'perm/test-user-id/456/document.pdf',
    mime_type: 'application/pdf',
    created_at: '2025-08-31T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ session: mockSession });
  });

  describe('getTaskFiles', () => {
    it('should fetch all files for a task with correct ordering', async () => {
      const mockTaskFiles: TaskFile[] = [
        mockTaskFile,
        {
          ...mockTaskFile,
          id: 124,
          role: 'source',
          file_name: 'source_document.jpg',
          storage_path: 'perm/test-user-id/456/source_document.jpg',
          mime_type: 'image/jpeg',
          created_at: '2025-08-31T09:00:00Z',
        },
      ];

      const mockOrder = jest.fn().mockResolvedValue({
        data: mockTaskFiles,
        error: null,
      });

      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await taskFileService.getTaskFiles(456);

      expect(supabase.from).toHaveBeenCalledWith('task_files');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('task_id', 456);
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true });
      
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('attachment');
      expect(result[1].role).toBe('source');
    });

    it('should return empty array when no files exist', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await taskFileService.getTaskFiles(456);

      expect(result).toEqual([]);
    });

    it('should throw error on database error', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      await expect(taskFileService.getTaskFiles(456)).rejects.toThrow(
        'Failed to fetch task files: Database connection failed'
      );
    });

    it('should handle RLS filtering automatically', async () => {
      // RLS ensures only user's task files are returned
      const userTaskFiles = [mockTaskFile];
      
      const mockOrder = jest.fn().mockResolvedValue({
        data: userTaskFiles,
        error: null,
      });

      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await taskFileService.getTaskFiles(456);

      expect(result.every(file => file.user_id === 'test-user-id')).toBe(true);
    });
  });

  describe('createTaskFile', () => {
    it('should create task file successfully', async () => {
      const fileData: Omit<TaskFileInsert, 'user_id'> = {
        task_id: 456,
        role: 'attachment',
        file_name: 'new_document.pdf',
        storage_path: 'perm/test-user-id/456/new_document.pdf',
        mime_type: 'application/pdf',
      };

      const mockCreatedFile: TaskFile = {
        id: 125,
        user_id: 'test-user-id',
        created_at: '2025-08-31T11:00:00Z',
        ...fileData,
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockCreatedFile,
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

      const result = await taskFileService.createTaskFile(fileData);

      expect(supabase.from).toHaveBeenCalledWith('task_files');
      expect(mockInsert).toHaveBeenCalledWith({
        ...fileData,
        user_id: 'test-user-id',
      });
      expect(mockSelect).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();

      expect(result).toEqual(mockCreatedFile);
      expect(result.file_name).toBe('new_document.pdf');
      expect(result.role).toBe('attachment');
    });

    it('should create source file from AI processing', async () => {
      const sourceFileData: Omit<TaskFileInsert, 'user_id'> = {
        task_id: 456,
        role: 'source',
        file_name: 'ai_processed_image.jpg',
        storage_path: 'perm/test-user-id/456/ai_processed_image.jpg',
        mime_type: 'image/jpeg',
      };

      const mockCreatedFile: TaskFile = {
        id: 126,
        user_id: 'test-user-id',
        created_at: '2025-08-31T11:00:00Z',
        ...sourceFileData,
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockCreatedFile,
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

      const result = await taskFileService.createTaskFile(sourceFileData);

      expect(mockInsert).toHaveBeenCalledWith({
        ...sourceFileData,
        user_id: 'test-user-id',
      });
      expect(result.role).toBe('source');
    });

    it('should throw error when user is not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({ session: null });

      const fileData: Omit<TaskFileInsert, 'user_id'> = {
        task_id: 456,
        role: 'attachment',
        file_name: 'document.pdf',
        storage_path: 'perm/test-user-id/456/document.pdf',
        mime_type: 'application/pdf',
      };

      await expect(taskFileService.createTaskFile(fileData)).rejects.toThrow(
        'Authentication required. Please log in again.'
      );

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should throw error when session has no user', async () => {
      mockUseAuthStore.mockReturnValue({ session: { user: null } });

      const fileData: Omit<TaskFileInsert, 'user_id'> = {
        task_id: 456,
        role: 'attachment',
        file_name: 'document.pdf',
        storage_path: 'perm/test-user-id/456/document.pdf',
        mime_type: 'application/pdf',
      };

      await expect(taskFileService.createTaskFile(fileData)).rejects.toThrow(
        'Authentication required. Please log in again.'
      );
    });

    it('should throw error on database insert failure', async () => {
      const fileData: Omit<TaskFileInsert, 'user_id'> = {
        task_id: 456,
        role: 'attachment',
        file_name: 'document.pdf',
        storage_path: 'perm/test-user-id/456/document.pdf',
        mime_type: 'application/pdf',
      };

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

      await expect(taskFileService.createTaskFile(fileData)).rejects.toThrow(
        'Failed to create task file: Foreign key constraint violation'
      );
    });
  });

  describe('deleteTaskFile', () => {
    it('should delete task file successfully', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        error: null,
      });

      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
      });

      await taskFileService.deleteTaskFile(123);

      expect(supabase.from).toHaveBeenCalledWith('task_files');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 123);
    });

    it('should throw error when user is not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({ session: null });

      await expect(taskFileService.deleteTaskFile(123)).rejects.toThrow(
        'Authentication required. Please log in again.'
      );

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should throw error on delete failure', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        error: { message: 'Permission denied' },
      });

      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
      });

      await expect(taskFileService.deleteTaskFile(123)).rejects.toThrow(
        'Failed to delete task file: Permission denied'
      );
    });

    it('should handle RLS preventing deletion of other users files', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        error: { message: 'Row level security policy violation' },
      });

      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
      });

      await expect(taskFileService.deleteTaskFile(999)).rejects.toThrow(
        'Failed to delete task file: Row level security policy violation'
      );
    });
  });

  describe('createMultipleTaskFiles', () => {
    it('should create multiple task files in batch', async () => {
      const taskId = 456;
      const filesData: Omit<TaskFileInsert, 'user_id' | 'task_id'>[] = [
        {
          role: 'source',
          file_name: 'source1.pdf',
          storage_path: 'perm/test-user-id/456/source1.pdf',
          mime_type: 'application/pdf',
        },
        {
          role: 'source',
          file_name: 'source2.jpg',
          storage_path: 'perm/test-user-id/456/source2.jpg',
          mime_type: 'image/jpeg',
        },
      ];

      const mockCreatedFiles: TaskFile[] = [
        {
          id: 127,
          task_id: taskId,
          user_id: 'test-user-id',
          created_at: '2025-08-31T11:00:00Z',
          ...filesData[0],
        },
        {
          id: 128,
          task_id: taskId,
          user_id: 'test-user-id',
          created_at: '2025-08-31T11:01:00Z',
          ...filesData[1],
        },
      ];

      const mockSelect = jest.fn().mockResolvedValue({
        data: mockCreatedFiles,
        error: null,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const result = await taskFileService.createMultipleTaskFiles(taskId, filesData);

      expect(mockInsert).toHaveBeenCalledWith([
        {
          task_id: taskId,
          user_id: 'test-user-id',
          ...filesData[0],
        },
        {
          task_id: taskId,
          user_id: 'test-user-id',
          ...filesData[1],
        },
      ]);

      expect(result).toEqual(mockCreatedFiles);
      expect(result).toHaveLength(2);
    });

    it('should handle empty files array', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const result = await taskFileService.createMultipleTaskFiles(456, []);

      expect(mockInsert).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });

    it('should throw error when user is not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({ session: null });

      await expect(
        taskFileService.createMultipleTaskFiles(456, [])
      ).rejects.toThrow('Authentication required. Please log in again.');
    });

    it('should throw error on batch insert failure', async () => {
      const filesData: Omit<TaskFileInsert, 'user_id' | 'task_id'>[] = [
        {
          role: 'source',
          file_name: 'source1.pdf',
          storage_path: 'perm/test-user-id/456/source1.pdf',
          mime_type: 'application/pdf',
        },
      ];

      const mockSelect = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Batch insert failed' },
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      await expect(
        taskFileService.createMultipleTaskFiles(456, filesData)
      ).rejects.toThrow('Failed to create task files: Batch insert failed');
    });
  });

  describe('getTaskFileById', () => {
    it('should return task file when found', async () => {
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: mockTaskFile,
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

      const result = await taskFileService.getTaskFileById(123);

      expect(supabase.from).toHaveBeenCalledWith('task_files');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', 123);
      expect(mockMaybeSingle).toHaveBeenCalled();

      expect(result).toEqual(mockTaskFile);
      expect(result?.file_name).toBe('document.pdf');
    });

    it('should return null when file not found', async () => {
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

      const result = await taskFileService.getTaskFileById(999);

      expect(result).toBeNull();
    });

    it('should throw error when user is not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({ session: null });

      await expect(taskFileService.getTaskFileById(123)).rejects.toThrow(
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

      await expect(taskFileService.getTaskFileById(123)).rejects.toThrow(
        'Failed to fetch task file: Database connection lost'
      );
    });

    it('should handle RLS preventing access to other users files', async () => {
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: null, // RLS returns null for inaccessible records
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

      const result = await taskFileService.getTaskFileById(999);

      expect(result).toBeNull();
    });
  });
});