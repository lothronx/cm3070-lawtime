import { useEffect, useMemo } from 'react';
import { useTaskFilesStore } from '@/stores/useTaskFilesStore';
import { TaskFile, TaskFileInsert } from '@/types';

interface UseFileOperationsParams {
  taskFiles: TaskFile[];
  onCreateTaskFiles: (params: { taskId: number; files: Omit<TaskFileInsert, 'user_id' | 'task_id'>[] }) => void;
  onDeleteTaskFile: (fileId: number) => void;
}

/**
 * Business logic hook for file operations using Zustand store
 * Responsibilities:
 * - File upload workflow (temp -> permanent)
 * - Temp file state management
 * - File commitment and rollback logic
 * - Preview URL generation
 * - Delete operations coordination
 */
export function useFileOperations({ taskFiles, onCreateTaskFiles, onDeleteTaskFile }: UseFileOperationsParams) {
  const store = useTaskFilesStore();

  // Set callbacks on the store when they change
  useEffect(() => {
    store.setCallbacks({
      onCreateTaskFiles,
      onDeleteTaskFile,
    });
  }, [onCreateTaskFiles, onDeleteTaskFile]);

  // Memoize attachments to trigger re-renders when store state changes
  const attachments = useMemo(() =>
    store.getAllAttachments(taskFiles),
    [store, taskFiles]
  );

  // Create wrapper functions that pass taskFiles when needed
  const deleteAttachment = (id: string | number) => {
    store.deleteAttachment(id, taskFiles);
  };

  return {
    // Data
    attachments,

    // State
    isUploading: store.isUploading,
    isCommitting: store.isCommitting,

    // Actions
    uploadToTemp: store.uploadToTemp,
    uploadToPerm: store.uploadToPerm,
    commitTempFiles: store.commitTempFiles,
    clearTempFiles: store.clearTempFiles,
    deleteAttachment,
    getPreviewUrl: store.getPreviewUrl,

    // Helpers
    isAttachmentDeleting: store.isAttachmentDeleting,
    isAttachmentUploading: store.isAttachmentUploading,
  };
}