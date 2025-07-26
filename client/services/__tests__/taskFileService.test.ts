import { taskFileService } from '../taskFileService';
import { supabase } from '../../utils/supabase';
import { TaskFile } from '../../types';

// Mock the auth store
jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

// Import the mocked auth store after mocking
const { useAuthStore } = require('@/stores/useAuthStore');

// Mock the supabase client
jest.mock('../../utils/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            maybeSingle: jest.fn(),
          })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
  },
}));

describe('taskFileService', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2025-08-30T10:00:00Z',
  };

  const mockTaskFileData: TaskFile = {
    id: 123,
    task_id: 456,
    user_id: 'test-user-id',
    role: 'attachment',
    file_name: 'document.pdf',
    storage_path: 'test-user-id/456/document.pdf',
    mime_type: 'application/pdf',
    created_at: '2025-08-31T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTaskFiles', () => {
    it('should fetch all files for a task', async () => {
      const mockTaskFiles = [
        mockTaskFileData,
        {
          ...mockTaskFileData,
          id: 124,
          file_name: 'image.jpg',
          storage_path: 'test-user-id/456/image.jpg',
          mime_type: 'image/jpeg',
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
      expect(result[0].file_name).toBe('document.pdf');
      expect(result[1].file_name).toBe('image.jpg');
    });

    it('should handle empty result', async () => {
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
        error: { message: 'Database error' },
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

      await expect(taskFileService.getTaskFiles(456)).rejects.toThrow('Failed to fetch task files: Database error');
    });
  });

  describe('createTaskFile', () => {
    it('should create task file successfully', async () => {
      // Mock authentication
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        session: { user: mockUser },
      });

      const fileData = {
        task_id: 456,
        role: 'attachment' as const,
        file_name: 'new_document.pdf',
        storage_path: 'test-user-id/456/new_document.pdf',
        mime_type: 'application/pdf',
      };

      const mockCreatedFile = {
        ...mockTaskFileData,
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

      expect(mockInsert).toHaveBeenCalledWith({
        ...fileData,
        user_id: 'test-user-id',
      });

      expect(result.file_name).toBe('new_document.pdf');
      expect(result.role).toBe('attachment');
    });

    it('should throw error when user is not authenticated', async () => {
      // Mock failed authentication
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        session: null,
      });

      const fileData = {
        task_id: 456,
        role: 'attachment' as const,
        file_name: 'new_document.pdf',
        storage_path: 'test-user-id/456/new_document.pdf',
        mime_type: 'application/pdf',
      };

      await expect(taskFileService.createTaskFile(fileData)).rejects.toThrow('Authentication required. Please log in again.');
    });

    it('should throw error on database error', async () => {
      // Mock authentication
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        session: { user: mockUser },
      });

      const fileData = {
        task_id: 456,
        role: 'attachment' as const,
        file_name: 'new_document.pdf',
        storage_path: 'test-user-id/456/new_document.pdf',
        mime_type: 'application/pdf',
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
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

      await expect(taskFileService.createTaskFile(fileData)).rejects.toThrow('Failed to create task file: Insert failed');
    });
  });

  describe('deleteTaskFile', () => {
    it('should delete task file successfully', async () => {
      // Mock authentication
      (useAuthStore.getState as jest.Mock).mockReturnValue({
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

      await taskFileService.deleteTaskFile(123);

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 123);
    });

    it('should throw error when user is not authenticated', async () => {
      // Mock failed authentication
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        session: null,
      });

      await expect(taskFileService.deleteTaskFile(123)).rejects.toThrow('Authentication required. Please log in again.');
    });

    it('should throw error on delete failure', async () => {
      // Mock authentication
      (useAuthStore.getState as jest.Mock).mockReturnValue({
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

      await expect(taskFileService.deleteTaskFile(123)).rejects.toThrow('Failed to delete task file: Delete failed');
    });
  });

  describe('getTaskFileById', () => {
    it('should return task file when found', async () => {
      // Mock authentication
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        session: { user: mockUser },
      });

      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: mockTaskFileData,
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

      expect(mockEq).toHaveBeenCalledWith('id', 123);
      expect(result).toBeTruthy();
      expect(result?.file_name).toBe('document.pdf');
    });

    it('should return null when not found', async () => {
      // Mock authentication
      (useAuthStore.getState as jest.Mock).mockReturnValue({
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

      const result = await taskFileService.getTaskFileById(123);

      expect(result).toBeNull();
    });

    it('should throw error when user is not authenticated', async () => {
      // Mock failed authentication
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        session: null,
      });

      await expect(taskFileService.getTaskFileById(123)).rejects.toThrow('Authentication required. Please log in again.');
    });
  });
});