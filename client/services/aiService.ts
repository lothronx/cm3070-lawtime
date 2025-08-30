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

enum AIErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
}

class AIServiceError extends Error {
  public statusCode: number;
  public errorType: AIErrorType;

  constructor(message: string, statusCode: number, errorType: AIErrorType) {
    super(message);
    this.name = 'AIServiceError';
    this.statusCode = statusCode;
    this.errorType = errorType;
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
      throw new AIServiceError(
        'Authentication required. Please log in again.',
        401,
        AIErrorType.AUTHENTICATION_ERROR
      );
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
        const errorType = this.mapStatusToErrorType(response.status);
        throw new AIServiceError(
          data.error || 'AI processing failed',
          response.status,
          errorType
        );
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
          408,
          AIErrorType.TIMEOUT_ERROR
        );
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new AIServiceError(
          'No internet connection. Please check your network and try again.',
          0,
          AIErrorType.NETWORK_ERROR
        );
      }

      console.error('❌ AI processing error:', error);

      throw new AIServiceError(
        'Unexpected error occurred during AI processing. Please try again.',
        0,
        AIErrorType.SERVER_ERROR
      );
    }
  }

  /**
   * Map HTTP status code to specific error type
   */
  private mapStatusToErrorType(statusCode: number): AIErrorType {
    switch (statusCode) {
      case 400:
        return AIErrorType.PROCESSING_ERROR;
      case 401:
      case 403:
        return AIErrorType.AUTHENTICATION_ERROR;
      case 408:
      case 504:
        return AIErrorType.TIMEOUT_ERROR;
      case 500:
      case 502:
      case 503:
        return AIErrorType.SERVER_ERROR;
      default:
        return AIErrorType.SERVER_ERROR;
    }
  }

  /**
   * Get user-friendly error message for AI operations
   */
  getErrorMessage(error: unknown): string {
    if (error instanceof AIServiceError) {
      switch (error.errorType) {
        case AIErrorType.AUTHENTICATION_ERROR:
          return 'Please log in again to continue.';
        case AIErrorType.TIMEOUT_ERROR:
          return 'Processing took too long. Try again with fewer or smaller files.';
        case AIErrorType.PROCESSING_ERROR:
          return 'Unable to analyze the files. Please try again or enter tasks manually.';
        case AIErrorType.NETWORK_ERROR:
          return error.message; // Already user-friendly
        case AIErrorType.SERVER_ERROR:
          return 'Server error. Please try again in a moment.';
        default:
          return 'Something went wrong. Please try again.';
      }
    }

    return 'An unexpected error occurred during AI processing. Please try again.';
  }
}

export default AIService;
export { AIServiceError };