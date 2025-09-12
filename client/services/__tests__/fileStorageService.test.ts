import { fileStorageService } from '../fileStorageService';
import { supabase } from '@/utils/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

// Mock the supabase client
jest.mock('@/utils/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        copy: jest.fn(),
        remove: jest.fn(),
        list: jest.fn(),
        getPublicUrl: jest.fn(),
        createSignedUrl: jest.fn(),
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

// Mock fetch for file reading
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
const mockUseAuthStore = useAuthStore.getState as jest.MockedFunction<typeof useAuthStore.getState>;

describe('fileStorageService', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2025-08-30T10:00:00Z',
  };

  const mockSession = {
    user: mockUser,
    access_token: 'mock-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
  };

  const mockFile = {
    uri: 'file:///local/path/document.pdf',
    fileName: 'document.pdf',
    mimeType: 'application/pdf',
  };

  const mockArrayBuffer = new ArrayBuffer(1024);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      session: mockSession,
      isAuthenticated: true,
      isLoading: false,
      setSession: jest.fn(),
      checkSession: jest.fn(),
      logout: jest.fn(),
    });
    
    // Mock fetch to return array buffer
    mockFetch.mockResolvedValue({
      arrayBuffer: async () => mockArrayBuffer,
    } as Response);
  });

  describe('uploadToTemp', () => {
    it('should upload file to temp folder successfully', async () => {
      const batchId = 'batch-123';
      const expectedPath = `temp/${mockUser.id}/${batchId}/${mockFile.fileName}`;
      const expectedPublicUrl = `https://storage.com/public/${expectedPath}`;

      const mockUpload = jest.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: expectedPublicUrl },
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });

      const result = await fileStorageService.uploadToTemp(mockFile, batchId);

      expect(mockFetch).toHaveBeenCalledWith(mockFile.uri);
      expect(supabase.storage.from).toHaveBeenCalledWith('file_storage');
      expect(mockUpload).toHaveBeenCalledWith(expectedPath, mockArrayBuffer, {
        contentType: mockFile.mimeType,
      });
      expect(mockGetPublicUrl).toHaveBeenCalledWith(expectedPath);

      expect(result).toEqual({
        path: expectedPath,
        publicUrl: expectedPublicUrl,
      });
    });

    it('should throw error when not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({
        session: null,
        isAuthenticated: false,
        isLoading: false,
        setSession: jest.fn(),
        checkSession: jest.fn(),
        logout: jest.fn(),
      });

      await expect(fileStorageService.uploadToTemp(mockFile, 'batch-123')).rejects.toThrow(
        'Not authenticated'
      );
    });

    it('should throw error on upload failure', async () => {
      const mockUpload = jest.fn().mockResolvedValue({
        error: new Error('Upload failed'),
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: mockUpload,
      });

      await expect(fileStorageService.uploadToTemp(mockFile, 'batch-123')).rejects.toThrow(
        'Upload failed'
      );
    });

    it('should handle different file types', async () => {
      const imageFile = {
        uri: 'file:///local/path/image.jpg',
        fileName: 'image.jpg',
        mimeType: 'image/jpeg',
      };

      const mockUpload = jest.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://storage.com/public/temp/test-user-id/batch-123/image.jpg' },
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });

      await fileStorageService.uploadToTemp(imageFile, 'batch-123');

      expect(mockUpload).toHaveBeenCalledWith(
        'temp/test-user-id/batch-123/image.jpg',
        mockArrayBuffer,
        { contentType: 'image/jpeg' }
      );
    });
  });

  describe('uploadToPerm', () => {
    it('should upload file directly to permanent folder', async () => {
      const taskId = 456;
      const expectedPath = `perm/${mockUser.id}/${taskId}/${mockFile.fileName}`;
      const expectedSignedUrl = 'https://storage.com/signed/url';

      const mockUpload = jest.fn().mockResolvedValue({ error: null });
      const mockCreateSignedUrl = jest.fn().mockResolvedValue({
        data: { signedUrl: expectedSignedUrl },
        error: null,
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
      });

      const result = await fileStorageService.uploadToPerm(mockFile, taskId);

      expect(mockUpload).toHaveBeenCalledWith(expectedPath, mockArrayBuffer, {
        contentType: mockFile.mimeType,
      });
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(expectedPath, 3600);

      expect(result).toEqual({
        path: expectedPath,
        publicUrl: expectedSignedUrl,
      });
    });

    it('should throw error when not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({
        session: null,
        isAuthenticated: false,
        isLoading: false,
        setSession: jest.fn(),
        checkSession: jest.fn(),
        logout: jest.fn(),
      });

      await expect(fileStorageService.uploadToPerm(mockFile, 456)).rejects.toThrow(
        'Not authenticated'
      );
    });
  });

  describe('copyFromTempToPerm', () => {
    it('should copy file from temp to permanent folder', async () => {
      const tempPath = 'temp/test-user-id/batch-123/document.pdf';
      const taskId = 456;
      const expectedPermPath = `perm/${mockUser.id}/${taskId}/document.pdf`;
      const expectedSignedUrl = 'https://storage.com/signed/url';

      const mockCopy = jest.fn().mockResolvedValue({ error: null });
      const mockCreateSignedUrl = jest.fn().mockResolvedValue({
        data: { signedUrl: expectedSignedUrl },
        error: null,
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        copy: mockCopy,
        createSignedUrl: mockCreateSignedUrl,
      });

      const result = await fileStorageService.copyFromTempToPerm(tempPath, taskId);

      expect(mockCopy).toHaveBeenCalledWith(tempPath, expectedPermPath);
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(expectedPermPath, 3600);

      expect(result).toEqual({
        path: expectedPermPath,
        publicUrl: expectedSignedUrl,
      });
    });

    it('should extract filename correctly from temp path', async () => {
      const tempPath = 'temp/test-user-id/batch-456/complex_file_name.123.pdf';
      const taskId = 789;

      const mockCopy = jest.fn().mockResolvedValue({ error: null });
      const mockCreateSignedUrl = jest.fn().mockResolvedValue({
        data: { signedUrl: 'https://storage.com/signed/url' },
        error: null,
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        copy: mockCopy,
        createSignedUrl: mockCreateSignedUrl,
      });

      await fileStorageService.copyFromTempToPerm(tempPath, taskId);

      expect(mockCopy).toHaveBeenCalledWith(
        tempPath,
        'perm/test-user-id/789/complex_file_name.123.pdf'
      );
    });

    it('should throw error on copy failure', async () => {
      const mockCopy = jest.fn().mockResolvedValue({
        error: new Error('Copy failed'),
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        copy: mockCopy,
      });

      await expect(
        fileStorageService.copyFromTempToPerm('temp/path/file.pdf', 456)
      ).rejects.toThrow('Copy failed');
    });
  });

  describe('deleteFromTemp', () => {
    it('should delete files from temp folder', async () => {
      const paths = ['temp/user/batch1/file1.pdf', 'temp/user/batch1/file2.jpg'];

      const mockRemove = jest.fn().mockResolvedValue({ error: null });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        remove: mockRemove,
      });

      await fileStorageService.deleteFromTemp(paths);

      expect(supabase.storage.from).toHaveBeenCalledWith('file_storage');
      expect(mockRemove).toHaveBeenCalledWith(paths);
    });

    it('should throw error on delete failure', async () => {
      const mockRemove = jest.fn().mockResolvedValue({
        error: new Error('Delete failed'),
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        remove: mockRemove,
      });

      await expect(fileStorageService.deleteFromTemp(['path/file.pdf'])).rejects.toThrow(
        'Delete failed'
      );
    });
  });

  describe('deleteFromPerm', () => {
    it('should delete files from permanent folder', async () => {
      const paths = ['perm/user/task1/file1.pdf', 'perm/user/task2/file2.jpg'];

      const mockRemove = jest.fn().mockResolvedValue({ error: null });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        remove: mockRemove,
      });

      await fileStorageService.deleteFromPerm(paths);

      expect(mockRemove).toHaveBeenCalledWith(paths);
    });
  });

  describe('clearAllTempFiles', () => {
    it('should clear all temp files for current user', async () => {
      const mockFiles = [
        { name: 'batch1' },
        { name: 'batch2' },
      ];

      const mockBatch1Files = [
        { name: 'file1.pdf' },
        { name: 'file2.jpg' },
      ];

      const mockBatch2Files = [
        { name: 'file3.png' },
      ];

      const mockList = jest.fn()
        .mockResolvedValueOnce({ data: mockFiles }) // First call for batches
        .mockResolvedValueOnce({ data: mockBatch1Files }) // Second call for batch1
        .mockResolvedValueOnce({ data: mockBatch2Files }); // Third call for batch2

      const mockRemove = jest.fn().mockResolvedValue({ error: null });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        list: mockList,
        remove: mockRemove,
      });

      await fileStorageService.clearAllTempFiles();

      expect(mockList).toHaveBeenCalledWith('temp/test-user-id', {
        sortBy: { column: 'name', order: 'asc' },
      });
      expect(mockList).toHaveBeenCalledWith('temp/test-user-id/batch1');
      expect(mockList).toHaveBeenCalledWith('temp/test-user-id/batch2');

      expect(mockRemove).toHaveBeenCalledWith([
        'temp/test-user-id/batch1/file1.pdf',
        'temp/test-user-id/batch1/file2.jpg',
        'temp/test-user-id/batch2/file3.png',
      ]);
    });

    it('should handle no temp files', async () => {
      const mockList = jest.fn().mockResolvedValue({ data: [] });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        list: mockList,
      });

      await fileStorageService.clearAllTempFiles();

      expect(mockList).toHaveBeenCalledTimes(1);
    });

    it('should handle not authenticated user', async () => {
      mockUseAuthStore.mockReturnValue({
        session: null,
        isAuthenticated: false,
        isLoading: false,
        setSession: jest.fn(),
        checkSession: jest.fn(),
        logout: jest.fn(),
      });

      await fileStorageService.clearAllTempFiles();

      // Should not throw error, just return early
      expect(supabase.storage.from).not.toHaveBeenCalled();
    });

    it('should handle null files data', async () => {
      const mockList = jest.fn().mockResolvedValue({ data: null });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        list: mockList,
      });

      await fileStorageService.clearAllTempFiles();

      expect(mockList).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL with default expiration', async () => {
      const path = 'perm/user/task/file.pdf';
      const expectedUrl = 'https://storage.com/signed/url';

      const mockCreateSignedUrl = jest.fn().mockResolvedValue({
        data: { signedUrl: expectedUrl },
        error: null,
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl,
      });

      const result = await fileStorageService.getSignedUrl(path);

      expect(mockCreateSignedUrl).toHaveBeenCalledWith(path, 3600);
      expect(result).toBe(expectedUrl);
    });

    it('should generate signed URL with custom expiration', async () => {
      const path = 'perm/user/task/file.pdf';
      const expiresIn = 7200;
      const expectedUrl = 'https://storage.com/signed/url';

      const mockCreateSignedUrl = jest.fn().mockResolvedValue({
        data: { signedUrl: expectedUrl },
        error: null,
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl,
      });

      const result = await fileStorageService.getSignedUrl(path, expiresIn);

      expect(mockCreateSignedUrl).toHaveBeenCalledWith(path, 7200);
      expect(result).toBe(expectedUrl);
    });

    it('should throw error on signed URL failure', async () => {
      const mockCreateSignedUrl = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Signed URL failed'),
      });

      (supabase.storage.from as jest.Mock).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl,
      });

      await expect(fileStorageService.getSignedUrl('path/file.pdf')).rejects.toThrow(
        'Signed URL failed'
      );
    });
  });
});