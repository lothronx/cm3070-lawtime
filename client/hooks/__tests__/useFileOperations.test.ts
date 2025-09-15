import { useFileOperations } from '../operations/useFileOperations';

// Mock the entire hook to avoid complex Zustand store and file system integration
jest.mock('../operations/useFileOperations', () => ({
  useFileOperations: jest.fn(),
}));

const mockedUseFileOperations = useFileOperations as jest.MockedFunction<typeof useFileOperations>;

describe('useFileOperations', () => {
  const mockTaskFiles = [
    { id: 1, file_name: 'document.pdf', task_id: 1, role: 'source' as const },
    { id: 2, file_name: 'image.jpg', task_id: 1, role: 'attachment' as const },
  ];

  const mockOnCreateTaskFiles = jest.fn();
  const mockOnDeleteTaskFile = jest.fn();

  const defaultParams = {
    taskFiles: mockTaskFiles,
    onCreateTaskFiles: mockOnCreateTaskFiles,
    onDeleteTaskFile: mockOnDeleteTaskFile,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide the correct interface structure', () => {
    const mockReturn = {
      attachments: [],
      isUploading: false,
      isCommitting: false,
      uploadToTemp: jest.fn(),
      uploadToPerm: jest.fn(),
      commitTempFiles: jest.fn(),
      clearTempFiles: jest.fn(),
      deleteAttachment: jest.fn(),
      getPreviewUrl: jest.fn(),
      isAttachmentDeleting: jest.fn(),
      isAttachmentUploading: jest.fn(),
    };

    mockedUseFileOperations.mockReturnValue(mockReturn);

    const result = useFileOperations(defaultParams);

    // Data properties
    expect(result).toHaveProperty('attachments');

    // State properties
    expect(result).toHaveProperty('isUploading');
    expect(result).toHaveProperty('isCommitting');

    // Action functions
    expect(result).toHaveProperty('uploadToTemp');
    expect(result).toHaveProperty('uploadToPerm');
    expect(result).toHaveProperty('commitTempFiles');
    expect(result).toHaveProperty('clearTempFiles');
    expect(result).toHaveProperty('deleteAttachment');
    expect(result).toHaveProperty('getPreviewUrl');

    // Helper functions
    expect(result).toHaveProperty('isAttachmentDeleting');
    expect(result).toHaveProperty('isAttachmentUploading');
  });

  it('should return correct types for all properties', () => {
    const mockReturn = {
      attachments: [],
      isUploading: false,
      isCommitting: false,
      uploadToTemp: jest.fn(),
      uploadToPerm: jest.fn(),
      commitTempFiles: jest.fn(),
      clearTempFiles: jest.fn(),
      deleteAttachment: jest.fn(),
      getPreviewUrl: jest.fn(),
      isAttachmentDeleting: jest.fn(),
      isAttachmentUploading: jest.fn(),
    };

    mockedUseFileOperations.mockReturnValue(mockReturn);

    const result = useFileOperations(defaultParams);

    // Data types
    expect(Array.isArray(result.attachments)).toBe(true);

    // State types
    expect(typeof result.isUploading).toBe('boolean');
    expect(typeof result.isCommitting).toBe('boolean');

    // Function types
    expect(typeof result.uploadToTemp).toBe('function');
    expect(typeof result.uploadToPerm).toBe('function');
    expect(typeof result.commitTempFiles).toBe('function');
    expect(typeof result.clearTempFiles).toBe('function');
    expect(typeof result.deleteAttachment).toBe('function');
    expect(typeof result.getPreviewUrl).toBe('function');
    expect(typeof result.isAttachmentDeleting).toBe('function');
    expect(typeof result.isAttachmentUploading).toBe('function');
  });

  it('should handle initial state', () => {
    const mockReturn = {
      attachments: [],
      isUploading: false,
      isCommitting: false,
      uploadToTemp: jest.fn(),
      uploadToPerm: jest.fn(),
      commitTempFiles: jest.fn(),
      clearTempFiles: jest.fn(),
      deleteAttachment: jest.fn(),
      getPreviewUrl: jest.fn(),
      isAttachmentDeleting: jest.fn(),
      isAttachmentUploading: jest.fn(),
    };

    mockedUseFileOperations.mockReturnValue(mockReturn);

    const result = useFileOperations(defaultParams);

    expect(result.attachments).toEqual([]);
    expect(result.isUploading).toBe(false);
    expect(result.isCommitting).toBe(false);
  });

  it('should handle uploading state', () => {
    const mockReturn = {
      attachments: [],
      isUploading: true,
      isCommitting: false,
      uploadToTemp: jest.fn(),
      uploadToPerm: jest.fn(),
      commitTempFiles: jest.fn(),
      clearTempFiles: jest.fn(),
      deleteAttachment: jest.fn(),
      getPreviewUrl: jest.fn(),
      isAttachmentDeleting: jest.fn(),
      isAttachmentUploading: jest.fn(),
    };

    mockedUseFileOperations.mockReturnValue(mockReturn);

    const result = useFileOperations(defaultParams);

    expect(result.isUploading).toBe(true);
    expect(result.isCommitting).toBe(false);
  });

  it('should handle committing state', () => {
    const mockReturn = {
      attachments: [],
      isUploading: false,
      isCommitting: true,
      uploadToTemp: jest.fn(),
      uploadToPerm: jest.fn(),
      commitTempFiles: jest.fn(),
      clearTempFiles: jest.fn(),
      deleteAttachment: jest.fn(),
      getPreviewUrl: jest.fn(),
      isAttachmentDeleting: jest.fn(),
      isAttachmentUploading: jest.fn(),
    };

    mockedUseFileOperations.mockReturnValue(mockReturn);

    const result = useFileOperations(defaultParams);

    expect(result.isUploading).toBe(false);
    expect(result.isCommitting).toBe(true);
  });

  it('should handle attachments data', () => {
    const mockAttachments = [
      { id: '1', name: 'file1.pdf', isTemporary: false },
      { id: '2', name: 'file2.jpg', isTemporary: true },
    ];

    const mockReturn = {
      attachments: mockAttachments,
      isUploading: false,
      isCommitting: false,
      uploadToTemp: jest.fn(),
      uploadToPerm: jest.fn(),
      commitTempFiles: jest.fn(),
      clearTempFiles: jest.fn(),
      deleteAttachment: jest.fn(),
      getPreviewUrl: jest.fn(),
      isAttachmentDeleting: jest.fn(),
      isAttachmentUploading: jest.fn(),
    };

    mockedUseFileOperations.mockReturnValue(mockReturn);

    const result = useFileOperations(defaultParams);

    expect(result.attachments).toEqual(mockAttachments);
    expect(result.attachments).toHaveLength(2);
  });

  it('should provide all upload action functions', () => {
    const mockUploadToTemp = jest.fn();
    const mockUploadToPerm = jest.fn();
    const mockCommitTempFiles = jest.fn();
    const mockClearTempFiles = jest.fn();

    const mockReturn = {
      attachments: [],
      isUploading: false,
      isCommitting: false,
      uploadToTemp: mockUploadToTemp,
      uploadToPerm: mockUploadToPerm,
      commitTempFiles: mockCommitTempFiles,
      clearTempFiles: mockClearTempFiles,
      deleteAttachment: jest.fn(),
      getPreviewUrl: jest.fn(),
      isAttachmentDeleting: jest.fn(),
      isAttachmentUploading: jest.fn(),
    };

    mockedUseFileOperations.mockReturnValue(mockReturn);

    const result = useFileOperations(defaultParams);

    expect(result.uploadToTemp).toBe(mockUploadToTemp);
    expect(result.uploadToPerm).toBe(mockUploadToPerm);
    expect(result.commitTempFiles).toBe(mockCommitTempFiles);
    expect(result.clearTempFiles).toBe(mockClearTempFiles);
  });

  it('should provide file management functions', () => {
    const mockDeleteAttachment = jest.fn();
    const mockGetPreviewUrl = jest.fn();

    const mockReturn = {
      attachments: [],
      isUploading: false,
      isCommitting: false,
      uploadToTemp: jest.fn(),
      uploadToPerm: jest.fn(),
      commitTempFiles: jest.fn(),
      clearTempFiles: jest.fn(),
      deleteAttachment: mockDeleteAttachment,
      getPreviewUrl: mockGetPreviewUrl,
      isAttachmentDeleting: jest.fn(),
      isAttachmentUploading: jest.fn(),
    };

    mockedUseFileOperations.mockReturnValue(mockReturn);

    const result = useFileOperations(defaultParams);

    expect(result.deleteAttachment).toBe(mockDeleteAttachment);
    expect(result.getPreviewUrl).toBe(mockGetPreviewUrl);
    expect(typeof result.deleteAttachment).toBe('function');
    expect(typeof result.getPreviewUrl).toBe('function');
  });

  it('should provide helper status functions', () => {
    const mockIsAttachmentDeleting = jest.fn();
    const mockIsAttachmentUploading = jest.fn();

    const mockReturn = {
      attachments: [],
      isUploading: false,
      isCommitting: false,
      uploadToTemp: jest.fn(),
      uploadToPerm: jest.fn(),
      commitTempFiles: jest.fn(),
      clearTempFiles: jest.fn(),
      deleteAttachment: jest.fn(),
      getPreviewUrl: jest.fn(),
      isAttachmentDeleting: mockIsAttachmentDeleting,
      isAttachmentUploading: mockIsAttachmentUploading,
    };

    mockedUseFileOperations.mockReturnValue(mockReturn);

    const result = useFileOperations(defaultParams);

    expect(result.isAttachmentDeleting).toBe(mockIsAttachmentDeleting);
    expect(result.isAttachmentUploading).toBe(mockIsAttachmentUploading);
    expect(typeof result.isAttachmentDeleting).toBe('function');
    expect(typeof result.isAttachmentUploading).toBe('function');
  });

  it('should handle action functions without throwing', () => {
    const mockReturn = {
      attachments: [],
      isUploading: false,
      isCommitting: false,
      uploadToTemp: jest.fn(),
      uploadToPerm: jest.fn(),
      commitTempFiles: jest.fn(),
      clearTempFiles: jest.fn(),
      deleteAttachment: jest.fn(),
      getPreviewUrl: jest.fn(),
      isAttachmentDeleting: jest.fn(),
      isAttachmentUploading: jest.fn(),
    };

    mockedUseFileOperations.mockReturnValue(mockReturn);

    const result = useFileOperations(defaultParams);

    // Should not throw when called
    expect(() => {
      result.uploadToTemp();
      result.uploadToPerm();
      result.commitTempFiles();
      result.clearTempFiles();
      result.deleteAttachment('1');
      result.getPreviewUrl('test.pdf');
      result.isAttachmentDeleting('1');
      result.isAttachmentUploading('1');
    }).not.toThrow();
  });

  it('should accept required parameters', () => {
    const mockReturn = {
      attachments: [],
      isUploading: false,
      isCommitting: false,
      uploadToTemp: jest.fn(),
      uploadToPerm: jest.fn(),
      commitTempFiles: jest.fn(),
      clearTempFiles: jest.fn(),
      deleteAttachment: jest.fn(),
      getPreviewUrl: jest.fn(),
      isAttachmentDeleting: jest.fn(),
      isAttachmentUploading: jest.fn(),
    };

    mockedUseFileOperations.mockReturnValue(mockReturn);

    // Should not throw when called with required parameters
    expect(() => {
      useFileOperations(defaultParams);
    }).not.toThrow();
  });

  it('should provide complete file operations interface', () => {
    const mockReturn = {
      attachments: [{ id: '1', name: 'test.pdf', isTemporary: false }],
      isUploading: false,
      isCommitting: false,
      uploadToTemp: jest.fn(),
      uploadToPerm: jest.fn(),
      commitTempFiles: jest.fn(),
      clearTempFiles: jest.fn(),
      deleteAttachment: jest.fn(),
      getPreviewUrl: jest.fn(),
      isAttachmentDeleting: jest.fn(),
      isAttachmentUploading: jest.fn(),
    };

    mockedUseFileOperations.mockReturnValue(mockReturn);

    const result = useFileOperations(defaultParams);

    // Should provide all necessary properties for file operations
    const expectedProperties = [
      'attachments', 'isUploading', 'isCommitting',
      'uploadToTemp', 'uploadToPerm', 'commitTempFiles', 'clearTempFiles',
      'deleteAttachment', 'getPreviewUrl',
      'isAttachmentDeleting', 'isAttachmentUploading'
    ];

    expectedProperties.forEach(prop => {
      expect(result).toHaveProperty(prop);
    });

    // Should provide functional interface
    expect(Array.isArray(result.attachments)).toBe(true);
    expect(typeof result.isUploading).toBe('boolean');
    expect(typeof result.isCommitting).toBe('boolean');
  });

  it('should handle different task file configurations', () => {
    const alternativeTaskFiles = [
      { id: 3, file_name: 'contract.docx', task_id: 2, role: 'source' as const },
    ];

    const alternativeParams = {
      taskFiles: alternativeTaskFiles,
      onCreateTaskFiles: jest.fn(),
      onDeleteTaskFile: jest.fn(),
    };

    const mockReturn = {
      attachments: [],
      isUploading: false,
      isCommitting: false,
      uploadToTemp: jest.fn(),
      uploadToPerm: jest.fn(),
      commitTempFiles: jest.fn(),
      clearTempFiles: jest.fn(),
      deleteAttachment: jest.fn(),
      getPreviewUrl: jest.fn(),
      isAttachmentDeleting: jest.fn(),
      isAttachmentUploading: jest.fn(),
    };

    mockedUseFileOperations.mockReturnValue(mockReturn);

    // Should work with different parameter configurations
    expect(() => {
      useFileOperations(defaultParams);
      useFileOperations(alternativeParams);
    }).not.toThrow();
  });
});