import { create } from 'zustand';
import { fileStorageService } from '@/services/fileStorageService';
import { generateUploadBatchId } from '@/utils/fileUploadUtils';
import { TaskFile, TaskFileInsert, Attachment, PermanentAttachment, TempAttachment } from '@/types';

// Internal temp file interface for business logic
interface TempFile {
  uri: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path?: string;
  publicUrl?: string;
  isUploading?: boolean;
}

interface FileOperationCallbacks {
  onCreateTaskFiles: (params: { taskId: number; files: Omit<TaskFileInsert, 'user_id' | 'task_id'>[] }) => void;
  onDeleteTaskFile: (fileId: number) => void;
}

interface TaskFilesState {
  // File operation state
  tempFiles: TempFile[];
  uploadBatchId: string;
  isUploading: boolean;
  isCommitting: boolean;
  deletingIds: Set<string | number>;

  // Callbacks for database operations
  callbacks: FileOperationCallbacks | null;
}

interface TaskFilesActions {
  // Callback management
  setCallbacks: (callbacks: FileOperationCallbacks) => void;

  // File upload operations
  uploadToTemp: (files: { uri: string; fileName: string; originalName: string; mimeType: string; size: number }[]) => Promise<void>;
  uploadToPerm: (files: { uri: string; fileName: string; originalName: string; mimeType: string; size: number }[], taskId: number) => Promise<void>;

  // File lifecycle operations
  commitTempFiles: (taskId: number, clearTempAfterCommit?: boolean) => Promise<TaskFile[]>;
  clearTempFiles: () => Promise<void>;

  // File deletion operations
  deleteTempFile: (fileName: string) => void;
  deletePermanentFile: (fileId: number, taskFiles: TaskFile[]) => Promise<void>;
  deleteAttachment: (id: string | number, taskFiles: TaskFile[]) => void;

  // Utility operations
  getPreviewUrl: (attachment: Attachment) => Promise<string>;
  getAllAttachments: (taskFiles: TaskFile[]) => Attachment[];
  isAttachmentDeleting: (id: string | number) => boolean;
  isAttachmentUploading: (id: string | number) => boolean;

  // State reset
  reset: () => void;
}

type TaskFilesStore = TaskFilesState & TaskFilesActions;

export const useTaskFilesStore = create<TaskFilesStore>((set, get) => ({
  // Initial State
  tempFiles: [],
  uploadBatchId: generateUploadBatchId(),
  isUploading: false,
  isCommitting: false,
  deletingIds: new Set(),
  callbacks: null,

  // Callback management
  setCallbacks: (callbacks: FileOperationCallbacks) => {
    set({ callbacks });
  },

  // Upload files to temp storage
  uploadToTemp: async (files: { uri: string; fileName: string; originalName: string; mimeType: string; size: number }[]) => {
    if (files.length === 0) return;

    const { isCommitting } = get();

    // Prevent uploads while committing files to avoid race conditions
    if (isCommitting) {
      throw new Error('Cannot upload files while saving is in progress. Please wait and try again.');
    }

    // Clean up all existing temp files for user before starting new batch
    try {
      await fileStorageService.clearAllTempFiles();
    } catch (error) {
      console.warn('Failed to clean previous temp files:', error);
    }

    // Generate new batch ID and clear state for new task
    const newBatchId = generateUploadBatchId();
    set({
      uploadBatchId: newBatchId,
      tempFiles: files.map(f => ({ ...f, isUploading: true })),
      isUploading: true
    });

    try {
      // Upload files sequentially to avoid overwhelming API
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          const result = await fileStorageService.uploadToTemp(file, newBatchId);

          // Update this specific file's state
          set(state => ({
            tempFiles: state.tempFiles.map(tf =>
              tf.fileName === file.fileName ? { ...tf, ...result, isUploading: false } : tf
            )
          }));
        } catch (error) {
          console.error(`Upload failed for ${file.originalName}:`, error);

          // Remove failed file from temp files
          set(state => ({
            tempFiles: state.tempFiles.filter(tf => tf.fileName !== file.fileName)
          }));
          throw new Error(`Failed to upload ${file.originalName}`);
        }
      }
    } finally {
      set({ isUploading: false });
    }
  },

  // Upload files directly to permanent storage (for edit mode)
  uploadToPerm: async (files: { uri: string; fileName: string; originalName: string; mimeType: string; size: number }[], taskId: number) => {
    if (files.length === 0) return;
    if (!taskId) throw new Error('Task ID is required for permanent uploads');

    const { callbacks } = get();
    if (!callbacks) throw new Error('Callbacks not set');

    set({ isUploading: true });

    try {
      const filesToCreate: Omit<TaskFileInsert, 'user_id' | 'task_id'>[] = [];

      // Upload files sequentially to avoid overwhelming API
      for (const file of files) {
        try {
          const result = await fileStorageService.uploadToPerm(file, taskId);

          filesToCreate.push({
            file_name: file.originalName,
            storage_path: result.path,
            mime_type: file.mimeType,
            role: 'attachment'
          });
        } catch (error) {
          console.error(`Permanent upload failed for ${file.originalName}:`, error);
          throw new Error(`Failed to upload ${file.originalName}`);
        }
      }

      // Create database records
      if (filesToCreate.length > 0) {
        callbacks.onCreateTaskFiles({ taskId, files: filesToCreate });
      }
    } finally {
      set({ isUploading: false });
    }
  },

  // Move temp files to permanent when saving task
  commitTempFiles: async (taskId: number, clearTempAfterCommit: boolean = true): Promise<TaskFile[]> => {
    const { tempFiles, callbacks } = get();

    if (tempFiles.length === 0) return [];
    if (!callbacks) throw new Error('Callbacks not set');

    const tempFilesToMove = tempFiles.filter(f => !f.isUploading && f.path);
    if (tempFilesToMove.length === 0) return [];

    set({ isCommitting: true });
    const copiedFiles: {tempFile: TempFile; permanentPath: string}[] = [];
    const filesToCreate: Omit<TaskFileInsert, 'user_id' | 'task_id'>[] = [];

    try {
      // Step 1: Copy files to permanent storage
      for (const tempFile of tempFilesToMove) {
        if (!tempFile.path) continue;

        const permanentResult = await fileStorageService.copyFromTempToPerm(tempFile.path, taskId);

        copiedFiles.push({
          tempFile,
          permanentPath: permanentResult.path
        });

        filesToCreate.push({
          file_name: tempFile.originalName,
          storage_path: permanentResult.path,
          mime_type: tempFile.mimeType,
          role: 'attachment'
        });
      }

      // Step 2: Create database records
      callbacks.onCreateTaskFiles({ taskId, files: filesToCreate });

      // Step 3: Clear temp files after successful commit (if requested)
      if (clearTempAfterCommit) {
        set({ tempFiles: [] });
      }

      // Return placeholder - actual files will come from data layer
      return filesToCreate.map((file, index) => ({
        id: Date.now() + index, // Temporary ID
        file_name: file.file_name,
        storage_path: file.storage_path,
        mime_type: file.mime_type,
        role: file.role,
        created_at: new Date().toISOString(),
        task_id: taskId,
        user_id: '', // Will be set by service
      })) as TaskFile[];
    } catch (error) {
      console.error('File commitment failed:', error);

      // Rollback: Clean up any files that were copied to permanent storage
      const cleanupPromises = copiedFiles.map(async ({ permanentPath }) => {
        try {
          await fileStorageService.deleteFromPerm([permanentPath]);
        } catch (cleanupError) {
          console.warn(`Failed to cleanup file ${permanentPath}:`, cleanupError);
        }
      });

      await Promise.allSettled(cleanupPromises);

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to commit ${tempFilesToMove.length} file(s): ${errorMessage}`);
    } finally {
      set({ isCommitting: false });
    }
  },

  // Clear temp files
  clearTempFiles: async () => {
    try {
      await fileStorageService.clearAllTempFiles();
    } catch (error) {
      console.warn('Failed to clean temp files:', error);
    }
    set({ tempFiles: [] });
  },

  // Delete temp file
  deleteTempFile: (fileName: string) => {
    set(state => {
      const newTempFiles = state.tempFiles.filter(f => f.fileName !== fileName);
      const newDeletingIds = new Set(state.deletingIds);
      newDeletingIds.delete(fileName);
      return { tempFiles: newTempFiles, deletingIds: newDeletingIds };
    });
  },

  // Delete permanent file (coordinates with data layer)
  deletePermanentFile: async (fileId: number, taskFiles: TaskFile[]) => {
    const { callbacks } = get();
    if (!callbacks) throw new Error('Callbacks not set');

    const file = taskFiles.find(f => f.id === fileId);
    if (!file) throw new Error('File not found');

    set(state => ({
      deletingIds: new Set(state.deletingIds).add(fileId),
    }));

    try {
      // Delete from storage first
      if (file.storage_path) {
        await fileStorageService.deleteFromPerm([file.storage_path]);
      }
      // Then delete from database via data layer
      callbacks.onDeleteTaskFile(fileId);
    } catch (error) {
      set(state => {
        const newDeletingIds = new Set(state.deletingIds);
        newDeletingIds.delete(fileId);
        return { deletingIds: newDeletingIds };
      });
      throw error;
    }
  },

  // Unified delete operation
  deleteAttachment: (id: string | number, taskFiles: TaskFile[]) => {
    const { tempFiles, deleteTempFile, deletePermanentFile } = get();
    const tempFile = tempFiles.find(f => f.fileName === id);
    if (tempFile) {
      deleteTempFile(id as string);
    } else {
      deletePermanentFile(id as number, taskFiles);
    }
  },

  // Get preview URL for attachment
  getPreviewUrl: async (attachment: Attachment): Promise<string> => {
    if (attachment.isTemporary) {
      const tempAttachment = attachment as TempAttachment;
      if (!tempAttachment.publicUrl) {
        throw new Error('Public URL not available for temporary file');
      }
      return tempAttachment.publicUrl;
    } else {
      const permAttachment = attachment as PermanentAttachment;
      if (!permAttachment.storage_path) {
        throw new Error('Storage path not available for permanent file');
      }
      return await fileStorageService.getSignedUrl(permAttachment.storage_path);
    }
  },

  // Combined files for display
  getAllAttachments: (taskFiles: TaskFile[]): Attachment[] => {
    const { tempFiles } = get();

    return [
      // Permanent files
      ...taskFiles.map(f => ({
        ...f,
        isTemporary: false as const
      } as PermanentAttachment)),

      // Temp files
      ...tempFiles.map(f => ({
        id: f.fileName,
        file_name: f.originalName,
        mime_type: f.mimeType,
        created_at: new Date().toISOString(),
        fileName: f.fileName,
        originalName: f.originalName,
        uri: f.uri,
        size: f.size,
        path: f.path,
        publicUrl: f.publicUrl,
        isUploading: f.isUploading,
        isTemporary: true as const
      } as TempAttachment))
    ];
  },

  // Helper functions
  isAttachmentDeleting: (id: string | number): boolean => {
    const { deletingIds } = get();
    return deletingIds.has(id);
  },

  isAttachmentUploading: (id: string | number): boolean => {
    const { tempFiles } = get();
    const tempFile = tempFiles.find(f => f.fileName === id);
    return tempFile?.isUploading || false;
  },

  // Reset store state
  reset: () => {
    set({
      tempFiles: [],
      uploadBatchId: generateUploadBatchId(),
      isUploading: false,
      isCommitting: false,
      deletingIds: new Set(),
      callbacks: null,
    });
  },
}));