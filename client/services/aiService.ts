// eslint-disable-next-line import/no-unresolved
import { API_BASE_URL } from "@env";
import { useAuthStore } from '@/stores/useAuthStore';
import { TaskProposalRequest, TaskProposalResponse } from '@/types';

/**
 * AI Service
 *
 * Handles AI task proposal operations:
 * - proposeTasks: Send files for OCR/ASR analysis and get task proposals
 *
 * Uses JWT authentication and structured error handling.
 */

class AIServiceError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AIServiceError';
    this.statusCode = statusCode;
  }
}

class AIService {
  private static instance: AIService;

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Propose tasks using AI processing
   * Calls the backend /api/tasks/propose endpoint
   */
  async proposeTasks(request: TaskProposalRequest): Promise<TaskProposalResponse> {
    // Get authentication token
    const { session } = useAuthStore.getState();

    if (!session?.access_token) {
      throw new AIServiceError('Authentication required. Please log in again.', 401);
    }

    const url = `${API_BASE_URL}/api/tasks/propose`;

    console.log('Calling AI backend:', {
      url,
      source_type: request.source_type,
      file_count: request.source_file_urls.length,
      client_count: request.client_list.length
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'AI processing failed';
        throw new AIServiceError(errorMessage, response.status);
      }

      console.log('AI processing completed:', {
        success: data.success,
        task_count: data.count,
        tasks: data.proposed_tasks
      });

      return data;

    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new AIServiceError(
          'AI processing timed out. Please try again with fewer or smaller files.',
          408
        );
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new AIServiceError(
          'No internet connection. Please check your network and try again.',
          0
        );
      }

      console.error('❌ AI processing error:', error);

      throw new AIServiceError(
        'Unexpected error occurred during AI processing. Please try again.',
        0
      );
    }
  }

  /**
   * Get error message
   */
  getErrorMessage(error: unknown): string {
    if (error instanceof AIServiceError) {
      return error.message; // Use backend message directly
    }
    return 'An unexpected error occurred during AI processing. Please try again.';
  }
}

export default AIService;
export { AIServiceError };