import AIService from '../aiService';
import { useAuthStore } from '@/stores/useAuthStore';
import { TaskProposalRequest, TaskProposalResponse } from '@/types';

// Mock auth store
jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
const mockUseAuthStore = useAuthStore.getState as jest.MockedFunction<typeof useAuthStore.getState>;

describe('AIService', () => {
  let aiService: AIService;

  const mockSession = {
    access_token: 'mock-jwt-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2025-08-30T10:00:00Z',
    },
  };

  const mockRequest: TaskProposalRequest = {
    source_type: 'ocr',
    source_file_urls: ['https://storage.com/file1.pdf', 'https://storage.com/file2.jpg'],
    client_list: [
      { id: 1, client_name: 'ACME Corp' },
      { id: 2, client_name: 'Beta LLC' },
    ],
  };

  const mockSuccessResponse: TaskProposalResponse = {
    success: true,
    count: 2,
    proposed_tasks: [
      {
        title: 'Court Hearing',
        event_time: '2025-09-15T09:00:00+08:00',
        location: 'Court Room 3',
        note: 'Bring all documents',
        client_resolution: {
          status: 'MATCH_FOUND',
          client_id: 1,
          client_name: 'ACME Corp',
        },
      },
      {
        title: 'Contract Review',
        event_time: '2025-09-20T14:00:00+08:00',
        location: null,
        note: 'Review merger agreement',
        client_resolution: {
          status: 'NEW_CLIENT_PROPOSED',
          client_id: null,
          client_name: 'New Client Inc',
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    aiService = AIService.getInstance();
    mockFetch.mockClear();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AIService.getInstance();
      const instance2 = AIService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(aiService);
    });
  });

  describe('proposeTasks', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        session: mockSession,
        isAuthenticated: true,
        isLoading: false,
        setSession: jest.fn(),
        checkSession: jest.fn(),
        logout: jest.fn(),
      });
    });

    it('should successfully propose tasks from OCR', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      } as Response);

      const result = await aiService.proposeTasks(mockRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.api.com/api/tasks/propose',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-jwt-token',
          },
          body: JSON.stringify(mockRequest),
        }
      );

      expect(result).toEqual(mockSuccessResponse);
      expect(result.success).toBe(true);
      expect(result.proposed_tasks).toHaveLength(2);
      expect(result.proposed_tasks[0].title).toBe('Court Hearing');
    });

    it('should successfully propose tasks from ASR', async () => {
      const asrRequest: TaskProposalRequest = {
        source_type: 'asr',
        source_file_urls: ['https://storage.com/audio.wav'],
        client_list: mockRequest.client_list,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockSuccessResponse,
          count: 1,
          proposed_tasks: [mockSuccessResponse.proposed_tasks[0]],
        }),
      } as Response);

      const result = await aiService.proposeTasks(asrRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.api.com/api/tasks/propose',
        expect.objectContaining({
          body: JSON.stringify(asrRequest),
        })
      );

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
    });

    it('should handle empty client list', async () => {
      const requestWithoutClients: TaskProposalRequest = {
        ...mockRequest,
        client_list: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockSuccessResponse,
          proposed_tasks: [
            {
              ...mockSuccessResponse.proposed_tasks[0],
              client_resolution: {
                status: 'NO_CLIENT_IDENTIFIED',
                client_id: null,
                client_name: null,
              },
            },
          ],
        }),
      } as Response);

      const result = await aiService.proposeTasks(requestWithoutClients);

      expect(result.success).toBe(true);
      expect(result.proposed_tasks[0].client_resolution.status).toBe('NO_CLIENT_IDENTIFIED');
    });

    it('should throw error when not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({
        session: null,
        isAuthenticated: false,
        isLoading: false,
        setSession: jest.fn(),
        checkSession: jest.fn(),
        logout: jest.fn(),
      });

      await expect(aiService.proposeTasks(mockRequest)).rejects.toThrow(
        'Authentication required. Please log in again.'
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error when no access token', async () => {
      mockUseAuthStore.mockReturnValue({
        session: { ...mockSession, access_token: undefined } as any,
        isAuthenticated: true,
        isLoading: false,
        setSession: jest.fn(),
        checkSession: jest.fn(),
        logout: jest.fn(),
      });

      await expect(aiService.proposeTasks(mockRequest)).rejects.toThrow(
        'Authentication required. Please log in again.'
      );
    });

    it('should handle API error responses', async () => {
      const errorResponse = {
        error: 'Invalid file format',
        details: 'Only PDF and image files are supported',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      } as Response);

      await expect(aiService.proposeTasks(mockRequest)).rejects.toThrow(
        'Invalid file format'
      );
    });

    it('should handle API error without message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      await expect(aiService.proposeTasks(mockRequest)).rejects.toThrow(
        'AI processing failed'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(aiService.proposeTasks(mockRequest)).rejects.toThrow(
        'No internet connection. Please check your network and try again.'
      );
    });

    it('should handle timeout errors', async () => {
      const abortError = new Error('Request timeout');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(aiService.proposeTasks(mockRequest)).rejects.toThrow(
        'AI processing timed out. Please try again with fewer or smaller files.'
      );
    });

    it('should handle unexpected errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Unexpected error'));

      await expect(aiService.proposeTasks(mockRequest)).rejects.toThrow(
        'Unexpected error occurred during AI processing. Please try again.'
      );
    });

    it('should log request details', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      } as Response);

      await aiService.proposeTasks(mockRequest);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Calling AI backend:',
        {
          source_type: 'ocr',
          file_count: 2,
          client_count: 2,
        }
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'AI processing completed:',
        {
          success: true,
          task_count: 2,
          tasks: mockSuccessResponse.proposed_tasks,
        }
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getErrorMessage', () => {
    it('should return AI service error message', async () => {
      // Mock authentication
      mockUseAuthStore.mockReturnValue({
        session: mockSession,
        isAuthenticated: true,
        isLoading: false,
        setSession: jest.fn(),
        checkSession: jest.fn(),
        logout: jest.fn(),
      });

      // Mock an API error response to trigger AIServiceError creation
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          error: 'Invalid file format'
        }),
      } as any);

      try {
        await aiService.proposeTasks({
          source_type: 'ocr',
          source_file_urls: ['https://test.com/file.pdf'],
          client_list: []
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        const message = aiService.getErrorMessage(error);
        expect(message).toBe('Invalid file format');
      }
    });

    it('should return generic message for unknown errors', () => {
      const error = new Error('Unknown error');

      const message = aiService.getErrorMessage(error);
      expect(message).toBe('An unexpected error occurred during AI processing. Please try again.');
    });

    it('should handle null/undefined errors', () => {
      expect(aiService.getErrorMessage(null)).toBe(
        'An unexpected error occurred during AI processing. Please try again.'
      );
      expect(aiService.getErrorMessage(undefined)).toBe(
        'An unexpected error occurred during AI processing. Please try again.'
      );
    });
  });
});