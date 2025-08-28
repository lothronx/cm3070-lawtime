import { useMemo } from 'react';

interface TaskLoadingState {
  formHooks?: {
    isSubmitting?: boolean;
  } | null;
  attachmentHooks?: {
    uploading?: boolean;
    committing?: boolean;
  } | null;
}

interface UseTaskLoadingReturn {
  isLoading: boolean;
  isFormSubmitting: boolean;
  isAttachmentUploading: boolean;
  isAttachmentCommitting: boolean;
}

export function useTaskLoading({ formHooks, attachmentHooks }: TaskLoadingState): UseTaskLoadingReturn {
  const isFormSubmitting = formHooks?.isSubmitting || false;
  const isAttachmentUploading = attachmentHooks?.uploading || false;
  const isAttachmentCommitting = attachmentHooks?.committing || false;

  const isLoading = useMemo(() => {
    return isFormSubmitting || isAttachmentUploading || isAttachmentCommitting;
  }, [isFormSubmitting, isAttachmentUploading, isAttachmentCommitting]);

  return {
    isLoading,
    isFormSubmitting,
    isAttachmentUploading,
    isAttachmentCommitting,
  };
}