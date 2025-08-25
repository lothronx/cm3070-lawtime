import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskFileService } from '@/services/taskFileService';
import { fileStorageService } from '@/services/fileStorageService';
import { supabase } from '@/utils/supabase';
import { TaskFile, TaskFileInsert, Attachment, PermanentAttachment, TempAttachment } from '@/types';
import { generateUploadBatchId } from '@/utils/fileUploadUtils';

// Internal temp file interface for hook state management
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

/**
 * Main business logic hook for task file management
 * Handles both permanent files and temporary upload workflow
 */
export const useTaskFiles = (taskId: number | null) => {
  const queryClient = useQueryClient();
  const [tempFiles, setTempFiles] = useState<TempFile[]>([]);
  const [uploadBatchId] = useState(() => generateUploadBatchId());
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string | number>>(new Set());

  // Query for permanent task files
  const taskFilesQuery = useQuery({
    queryKey: ['task-files', taskId],
    queryFn: () => taskId ? taskFileService.getTaskFiles(taskId) : [],
    enabled: !!taskId,
  });

  // Auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        queryClient.invalidateQueries({ queryKey: ['task-files'] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // Upload to temp storage
  const uploadToTemp = useCallback(async (files: { uri: string; fileName: string; originalName: string; mimeType: string; size: number }[]) => {
    if (files.length === 0) return;

    // Prevent uploads while committing files to avoid race conditions
    if (isCommitting) {
      throw new Error('Cannot upload files while saving is in progress. Please wait and try again.');
    }

    setIsUploading(true);
    // Files are already processed, no need to process again
    const processedFiles = files;

    // Update UI immediately with uploading state
    setTempFiles(prev => [...prev, ...processedFiles.map(f => ({ ...f, isUploading: true }))]);

    try {
      // Upload files sequentially to avoid overwhelming API
      for (let i = 0; i < processedFiles.length; i++) {
        const file = processedFiles[i];

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
      // Step 1: Copy files to permanent storage (always use copy for predictable behavior)
      for (const tempFile of tempFilesToMove) {
        if (!tempFile.path) continue;

        // Always copy files to permanent storage - temp cleanup handled separately
        const permanentResult = await fileStorageService.copyToPerm(tempFile.path, taskId, tempFile.originalName);

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

      // Step 2: Create all database records in a single batch operation
      const createdFiles = await taskFileService.createMultipleTaskFiles(taskId, filesToCreate);

      // Step 3: Clear temp files after successful commit (if requested)
      if (clearTempAfterCommit) {
        setTempFiles([]);
      }

      // Step 4: Update cache with new files
      queryClient.setQueryData(['task-files', taskId], (old: TaskFile[] = []) =>
        [...old, ...createdFiles]
      );

      return createdFiles;
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

      // Note: Temp files are preserved since we only copy - they can be retried or cleaned up later

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to commit ${tempFilesToMove.length} file(s): ${errorMessage}`);
    } finally {
      setIsCommitting(false);
    }
  }, [tempFiles, queryClient]);

  // Combined files for display - properly typed as Attachment[]
  const allFiles: Attachment[] = useMemo(() => [
    // Permanent files
    ...(taskFilesQuery.data || []).map(f => ({
      ...f,
      isTemporary: false as const
    } as PermanentAttachment)),

    // Temp files
    ...tempFiles.map(f => ({
      id: f.fileName, // Use fileName as temp ID
      file_name: f.originalName, // Display original name to user
      mime_type: f.mimeType,
      created_at: new Date().toISOString(),
      fileName: f.fileName, // Keep for operations
      originalName: f.originalName,
      uri: f.uri,
      size: f.size,
      path: f.path,
      publicUrl: f.publicUrl,
      isUploading: f.isUploading,
      isTemporary: true as const
    } as TempAttachment))
  ], [taskFilesQuery.data, tempFiles]);

  // Delete permanent file
  const deleteTaskFile = useMutation({
    mutationFn: async (fileId: number) => {
      const file = taskFilesQuery.data?.find(f => f.id === fileId);
      if (!file) throw new Error('File not found');

      setDeletingIds(prev => new Set(prev).add(fileId));

      await taskFileService.deleteTaskFile(fileId);
      if (file.storage_path) {
        await fileStorageService.deleteFromPerm(file.storage_path);
      }
    },
    onSuccess: (_, fileId) => {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
      queryClient.setQueryData(['task-files', taskId], (old: TaskFile[] = []) =>
        old.filter(f => f.id !== fileId)
      );
    },
    onError: (_, fileId) => {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['task-files', taskId] });
    }
  });

  // Delete temp file
  const deleteTempFile = useCallback((fileName: string) => {
    setDeletingIds(prev => new Set(prev).add(fileName));

    // Remove immediately for temp files (instant operation)
    setTempFiles(prev => prev.filter(f => f.fileName !== fileName));

    setDeletingIds(prev => {
      const next = new Set(prev);
      next.delete(fileName);
      return next;
    });
  }, []);

 // Unified delete action that handles both temp and permanent files
  const deleteAttachment = useCallback((id: string | number) => {
    const attachment = allFiles.find(att => att.id === id);
    if (!attachment) return;

    if (attachment.isTemporary) {
      deleteTempFile((attachment as TempAttachment).fileName);
    } else {
      deleteTaskFile.mutate(id as number);
    }
  }, [allFiles, deleteTempFile, deleteTaskFile]);

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

  // Get preview URL for attachment (business logic in hook)
  const getPreviewUrl = useCallback(async (attachment: Attachment): Promise<string> => {
    if (attachment.isTemporary) {
      // Temp files use public URLs
      const tempAttachment = attachment as TempAttachment;
      if (!tempAttachment.publicUrl) {
        throw new Error('Public URL not available for temporary file');
      }
      return tempAttachment.publicUrl;
    } else {
      // Permanent files use signed URLs
      const permAttachment = attachment as PermanentAttachment;
      if (!permAttachment.storage_path) {
        throw new Error('Storage path not available for permanent file');
      }
      return await fileStorageService.getSignedUrl(permAttachment.storage_path);
    }
  }, []);

  // Helper functions to check attachment states
  const isAttachmentDeleting = useCallback((id: string | number) => {
    return deletingIds.has(id);
  }, [deletingIds]);

  const isAttachmentUploading = useCallback((id: string | number) => {
    const tempFile = tempFiles.find(f => f.fileName === id);
    return tempFile?.isUploading || false;
  }, [tempFiles]);

  return {
    // Core data - single source of truth
    attachments: allFiles,

    // Essential state
    isLoading: taskFilesQuery.isLoading || isUploading || isCommitting,
    error: taskFilesQuery.isError ? taskFilesQuery.error : null,
    uploading: isUploading, // Separate boolean for upload state
    committing: isCommitting, // Separate boolean for file commitment state

    // Core actions - simplified method names
    upload: uploadToTemp,
    delete: deleteAttachment,
    preview: getPreviewUrl,

    // State helpers - consolidated functions
    isDeleting: isAttachmentDeleting,
    isUploading: isAttachmentUploading,

    // Complex operations
    commitTempFiles: commitTempFiles,
    clearTempFiles: clearTempFiles,
    refetch: taskFilesQuery.refetch,
  };
};