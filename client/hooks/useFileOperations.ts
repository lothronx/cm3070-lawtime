import { useState, useCallback, useMemo } from 'react';
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

interface UseFileOperationsParams {
  taskFiles: TaskFile[];
  onCreateTaskFiles: (params: { taskId: number; files: Omit<TaskFileInsert, 'user_id' | 'task_id'>[] }) => void;
  onDeleteTaskFile: (fileId: number) => void;
}

/**
 * Business logic hook for file operations
 * Responsibilities:
 * - File upload workflow (temp -> permanent)
 * - Temp file state management
 * - File commitment and rollback logic
 * - Preview URL generation
 * - Delete operations coordination
 */
export function useFileOperations({ taskFiles, onCreateTaskFiles, onDeleteTaskFile }: UseFileOperationsParams) {
  const [tempFiles, setTempFiles] = useState<TempFile[]>([]);
  const [uploadBatchId] = useState(() => generateUploadBatchId());
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string | number>>(new Set());

  // Upload files directly to permanent storage (for edit mode)
  const uploadToPerm = useCallback(async (files: { uri: string; fileName: string; originalName: string; mimeType: string; size: number }[], taskId: number) => {
    if (files.length === 0) return;
    if (!taskId) throw new Error('Task ID is required for permanent uploads');

    setIsUploading(true);

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
        onCreateTaskFiles({ taskId, files: filesToCreate });
      }
    } finally {
      setIsUploading(false);
    }
  }, [onCreateTaskFiles]);

  // Upload files to temp storage
  const uploadToTemp = useCallback(async (files: { uri: string; fileName: string; originalName: string; mimeType: string; size: number }[]) => {
    if (files.length === 0) return;

    // Prevent uploads while committing files to avoid race conditions
    if (isCommitting) {
      throw new Error('Cannot upload files while saving is in progress. Please wait and try again.');
    }

    setIsUploading(true);

    // Update UI immediately with uploading state
    setTempFiles(prev => [...prev, ...files.map(f => ({ ...f, isUploading: true }))]);

    try {
      // Upload files sequentially to avoid overwhelming API
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          const result = await fileStorageService.uploadToTemp(file, uploadBatchId);

          // Update this specific file's state
          setTempFiles(prev => prev.map(tf =>
            tf.fileName === file.fileName ? { ...tf, ...result, isUploading: false } : tf
          ));
        } catch (error) {
          console.error(`Upload failed for ${file.originalName}:`, error);

          // Remove failed file from temp files
          setTempFiles(prev => prev.filter(tf => tf.fileName !== file.fileName));
          throw new Error(`Failed to upload ${file.originalName}`);
        }
      }
    } finally {
      setIsUploading(false);
    }
  }, [uploadBatchId, isCommitting]);

  // Move temp files to permanent when saving task
  const commitTempFiles = useCallback(async (taskId: number, clearTempAfterCommit: boolean = true): Promise<TaskFile[]> => {
    if (tempFiles.length === 0) return [];

    const tempFilesToMove = tempFiles.filter(f => !f.isUploading && f.path);
    if (tempFilesToMove.length === 0) return [];

    setIsCommitting(true);
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
      onCreateTaskFiles({ taskId, files: filesToCreate });

      // Step 3: Clear temp files after successful commit (if requested)
      if (clearTempAfterCommit) {
        setTempFiles([]);
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
          await fileStorageService.deleteFromPerm(permanentPath);
        } catch (cleanupError) {
          console.warn(`Failed to cleanup file ${permanentPath}:`, cleanupError);
        }
      });

      await Promise.allSettled(cleanupPromises);

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to commit ${tempFilesToMove.length} file(s): ${errorMessage}`);
    } finally {
      setIsCommitting(false);
    }
  }, [tempFiles, onCreateTaskFiles]);

  // Clear temp files
  const clearTempFiles = useCallback(async () => {
    const pathsToClean = tempFiles.map(f => f.path).filter(Boolean) as string[];
    if (pathsToClean.length > 0) {
      try {
        await fileStorageService.deleteFromTemp(pathsToClean);
      } catch (error) {
        console.warn('Failed to clean temp files:', error);
      }
    }
    setTempFiles([]);
  }, [tempFiles]);

  // Delete temp file
  const deleteTempFile = useCallback((fileName: string) => {
    setDeletingIds(prev => new Set(prev).add(fileName));
    setTempFiles(prev => prev.filter(f => f.fileName !== fileName));
    setDeletingIds(prev => {
      const next = new Set(prev);
      next.delete(fileName);
      return next;
    });
  }, []);

  // Delete permanent file (coordinates with data layer)
  const deletePermanentFile = useCallback(async (fileId: number) => {
    const file = taskFiles.find(f => f.id === fileId);
    if (!file) throw new Error('File not found');

    setDeletingIds(prev => new Set(prev).add(fileId));

    try {
      // Delete from storage first
      if (file.storage_path) {
        await fileStorageService.deleteFromPerm(file.storage_path);
      }
      // Then delete from database via data layer
      onDeleteTaskFile(fileId);
    } catch (error) {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
      throw error;
    }
  }, [taskFiles, onDeleteTaskFile]);

  // Unified delete operation
  const deleteAttachment = useCallback((id: string | number) => {
    const tempFile = tempFiles.find(f => f.fileName === id);
    if (tempFile) {
      deleteTempFile(id as string);
    } else {
      deletePermanentFile(id as number);
    }
  }, [tempFiles, deleteTempFile, deletePermanentFile]);

  // Get preview URL for attachment
  const getPreviewUrl = useCallback(async (attachment: Attachment): Promise<string> => {
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
  }, []);

  // Combined files for display
  const allAttachments: Attachment[] = useMemo(() => [
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
  ], [taskFiles, tempFiles]);

  // Helper functions
  const isAttachmentDeleting = useCallback((id: string | number) => {
    return deletingIds.has(id);
  }, [deletingIds]);

  const isAttachmentUploading = useCallback((id: string | number) => {
    const tempFile = tempFiles.find(f => f.fileName === id);
    return tempFile?.isUploading || false;
  }, [tempFiles]);

  return {
    // Data
    attachments: allAttachments,

    // State
    isUploading,
    isCommitting,

    // Actions
    uploadToTemp,
    uploadToPerm,
    commitTempFiles,
    clearTempFiles,
    deleteAttachment,
    getPreviewUrl,

    // Helpers
    isAttachmentDeleting,
    isAttachmentUploading,
  };
}