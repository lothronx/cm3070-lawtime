import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskFileService } from '@/services/taskFileService';
import { fileStorageService } from '@/services/fileStorageService';
import { supabase } from '@/utils/supabase';
import { TaskFile, Attachment, PermanentAttachment, TempAttachment } from '@/types';
import { generateUploadBatchId, processPickerFile } from '@/utils/fileUploadUtils';

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
  const uploadToTemp = useCallback(async (files: { uri: string; fileName?: string | null; mimeType?: string | null; fileSize?: number | null }[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    const processedFiles = files.map(processPickerFile);

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
  }, [uploadBatchId]);

  // Move temp files to permanent when saving task
  const commitTempFiles = useCallback(async (taskId: number): Promise<TaskFile[]> => {
    if (tempFiles.length === 0) return [];

    const tempFilesToMove = tempFiles.filter(f => !f.isUploading && f.path);
    if (tempFilesToMove.length === 0) return [];

    const createdFiles: TaskFile[] = [];

    try {
      // Move files and create DB records
      for (const tempFile of tempFilesToMove) {
        if (!tempFile.path) continue;

        // Move file to permanent storage
        const permanentResult = await fileStorageService.moveToTaskFiles(
          tempFile.path,
          taskId,
          tempFile.originalName
        );

        // Create database record (user_id handled by service)
        const dbRecord = await taskFileService.createTaskFile({
          task_id: taskId,
          file_name: tempFile.originalName,
          storage_path: permanentResult.path,
          mime_type: tempFile.mimeType,
          role: 'attachment'
        });

        createdFiles.push(dbRecord);
      }

      // Clear temp files after successful commit
      setTempFiles([]);

      // Update cache with new files
      queryClient.setQueryData(['task-files', taskId], (old: TaskFile[] = []) =>
        [...old, ...createdFiles]
      );

      return createdFiles;
    } catch (error) {
      // Clean up any uploaded temp files on error
      try {
        const pathsToClean = tempFilesToMove.map(f => f.path!).filter(Boolean);
        if (pathsToClean.length > 0) {
          await fileStorageService.deleteFromTemp(pathsToClean);
        }
      } catch (cleanupError) {
        console.warn('Cleanup failed:', cleanupError);
      }

      throw error;
    }
  }, [tempFiles, queryClient]);

  // Delete permanent file
  const deleteTaskFile = useMutation({
    mutationFn: async (fileId: number) => {
      const file = taskFilesQuery.data?.find(f => f.id === fileId);
      if (!file) throw new Error('File not found');

      await taskFileService.deleteTaskFile(fileId);
      if (file.storage_path) {
        await fileStorageService.deleteFromTaskFiles(file.storage_path);
      }
    },
    onSuccess: (_, fileId) => {
      queryClient.setQueryData(['task-files', taskId], (old: TaskFile[] = []) =>
        old.filter(f => f.id !== fileId)
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['task-files', taskId] });
    }
  });

  // Delete temp file
  const deleteTempFile = useCallback((fileName: string) => {
    setTempFiles(prev => prev.filter(f => f.fileName !== fileName));
  }, []);

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

  // Combined files for display - properly typed as Attachment[]
  const allFiles: Attachment[] = [
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
  ];

  return {
    // Data
    files: taskFilesQuery.data || [],
    tempFiles,
    allFiles, // Combined for display

    // State
    isLoading: taskFilesQuery.isLoading || isUploading,
    isError: taskFilesQuery.isError,
    error: taskFilesQuery.error,
    isUploading,
    hasTempFiles: tempFiles.length > 0,

    // Actions
    uploadToTemp,
    commitTempFiles,
    deleteTaskFile: deleteTaskFile.mutate,
    deleteTempFile,
    clearTempFiles,

    // Utils
    refetch: taskFilesQuery.refetch,
  };
};