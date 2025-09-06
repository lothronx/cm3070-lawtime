import { useCallback, useState, useEffect, useRef } from 'react';
import { useClients } from '@/hooks/useClients';
import { Attachment } from '@/types';
import AIService from '@/services/aiService';

interface UseAIProcessingParams {
  attachments: Attachment[];
  sourceType?: 'ocr' | 'asr';
}

interface AIProcessingState {
  isProcessing: boolean;
  progress: string;
}

/**
 * AI Processing Hook
 *
 * Responsibilities:
 * - Monitor temp attachments for AI processing triggers
 * - Extract URLs from uploaded files
 * - Call AI service with OCR processing
 * - Handle AI processing state and errors
 */
export function useAIProcessing({ attachments, sourceType = 'ocr' }: UseAIProcessingParams) {
  const [pendingProcessing, setPendingProcessing] = useState(false);
  const [processingState, setProcessingState] = useState<AIProcessingState>({
    isProcessing: false,
    progress: ''
  });
  const previousAttachmentCount = useRef(0);

  // Get clients for AI context
  const { clients } = useClients();

  // Core AI processing logic
  const processWithAI = useCallback(async () => {
    try {
      setProcessingState({
        isProcessing: true,
        progress: 'Processing files with AI...'
      });

      // Extract URLs from temp attachments
      const tempAttachments = attachments.filter(att => att.isTemporary);
      const sourceFileUrls = tempAttachments
        .filter(att => (att as any).publicUrl)
        .map(att => (att as any).publicUrl!);

      if (sourceFileUrls.length === 0) {
        console.warn('No valid URLs found from uploaded files');
        return;
      }

      console.log(`Calling AI backend: {"client_count": ${clients.length}, "file_count": ${tempAttachments.length}, "source_type": "${sourceType}"}`);

      // Prepare client context
      const clientList = clients.map(client => ({
        id: client.id,
        client_name: client.client_name
      }));

      // Call AI service
      const aiService = AIService.getInstance();
      const response = await aiService.proposeTasks({
        source_type: sourceType,
        source_file_urls: sourceFileUrls,
        client_list: clientList
      });

      console.log('AI Processing Response:', JSON.stringify(response, null, 2));

    } catch (error) {
      console.error('AI processing failed:', error);
    } finally {
      setProcessingState({
        isProcessing: false,
        progress: ''
      });
    }
  }, [attachments, clients]);

  // Watch for new temp attachments and trigger processing
  useEffect(() => {
    const tempAttachments = attachments.filter(att => att.isTemporary);
    const currentCount = tempAttachments.length;

    // Trigger processing if pending and we have attachments
    if (pendingProcessing && currentCount > 0) {
      setPendingProcessing(false);
      processWithAI();
    }

    // Update count for future comparisons
    previousAttachmentCount.current = currentCount;
  }, [attachments, pendingProcessing, processWithAI]);

  // Public API
  const triggerProcessing = useCallback(() => {
    setPendingProcessing(true);
  }, []);

  return {
    ...processingState,
    triggerProcessing
  };
}