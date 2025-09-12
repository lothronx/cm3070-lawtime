import {
  taskToFormValues,
  getEmptyFormValues,
  isProposedTask,
  isTaskWithClient
} from '../taskFormUtils';
import { TaskWithClient, ProposedTask } from '@/types';

describe('taskFormUtils', () => {
  describe('getEmptyFormValues', () => {
    it('should return empty form values with correct structure', () => {
      const result = getEmptyFormValues();

      expect(result).toEqual({
        title: "",
        client_name: "",
        event_time: null,
        location: null,
        note: null,
      });
    });

    it('should return consistent values on multiple calls', () => {
      const result1 = getEmptyFormValues();
      const result2 = getEmptyFormValues();

      expect(result1).toEqual(result2);
    });
  });

  describe('taskToFormValues', () => {
    describe('with null/undefined input', () => {
      it('should return empty form values for null input', () => {
        const result = taskToFormValues(null);
        expect(result).toEqual(getEmptyFormValues());
      });

      it('should return empty form values for undefined input', () => {
        const result = taskToFormValues(undefined);
        expect(result).toEqual(getEmptyFormValues());
      });
    });

    describe('with TaskWithClient input', () => {
      const mockTaskWithClient: Partial<TaskWithClient> = {
        title: 'Court Hearing',
        client_name: 'ACME Corporation',
        event_time: '2025-09-01T14:00:00+08:00',
        location: 'Room 101, District Court',
        note: 'Bring contract documents',
        // Additional TaskWithClient properties that should be ignored
        id: 123,
        user_id: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
      };

      it('should convert TaskWithClient to form values correctly', () => {
        const result = taskToFormValues(mockTaskWithClient);

        expect(result).toEqual({
          title: 'Court Hearing',
          client_name: 'ACME Corporation',
          event_time: '2025-09-01T14:00:00+08:00',
          location: 'Room 101, District Court',
          note: 'Bring contract documents',
        });
      });

      it('should handle missing optional fields with defaults', () => {
        const partialTask: Partial<TaskWithClient> = {
          title: 'Meeting',
          client_name: 'Smith & Associates'
        };

        const result = taskToFormValues(partialTask);

        expect(result).toEqual({
          title: 'Meeting',
          client_name: 'Smith & Associates',
          event_time: null,
          location: null,
          note: null,
        });
      });

      it('should handle empty strings as provided values', () => {
        const taskWithEmptyValues: Partial<TaskWithClient> = {
          title: '',
          client_name: '',
          event_time: null,
          location: '',
          note: ''
        };

        const result = taskToFormValues(taskWithEmptyValues);

        expect(result).toEqual({
          title: '',
          client_name: '',
          event_time: null,
          location: null, // Empty strings are converted to null by || operator
          note: null, // Empty strings are converted to null by || operator
        });
      });
    });

    describe('with ProposedTask input', () => {
      const mockProposedTask: ProposedTask = {
        title: 'Contract Review',
        event_time: '2025-10-15T10:00:00+08:00',
        location: 'Client Office',
        note: 'Review new partnership agreement',
        client_resolution: {
          status: 'MATCH_FOUND',
          client_id: 456,
          client_name: 'Global Tech Solutions'
        }
      };

      it('should convert ProposedTask to form values correctly', () => {
        const result = taskToFormValues(mockProposedTask);

        expect(result).toEqual({
          title: 'Contract Review',
          client_name: 'Global Tech Solutions',
          event_time: '2025-10-15T10:00:00+08:00',
          location: 'Client Office',
          note: 'Review new partnership agreement',
        });
      });

      it('should handle ProposedTask with NEW_CLIENT_PROPOSED status', () => {
        const proposedTaskNewClient: ProposedTask = {
          title: 'Initial Consultation',
          event_time: null,
          location: null,
          note: 'First meeting with potential client',
          client_resolution: {
            status: 'NEW_CLIENT_PROPOSED',
            client_id: null,
            client_name: 'New Company LLC'
          }
        };

        const result = taskToFormValues(proposedTaskNewClient);

        expect(result).toEqual({
          title: 'Initial Consultation',
          client_name: 'New Company LLC',
          event_time: null,
          location: null,
          note: 'First meeting with potential client',
        });
      });

      it('should handle ProposedTask with NO_CLIENT_IDENTIFIED status', () => {
        const proposedTaskNoClient: ProposedTask = {
          title: 'Research Task',
          event_time: null,
          location: null,
          note: 'Legal research on corporate law',
          client_resolution: {
            status: 'NO_CLIENT_IDENTIFIED',
            client_id: null,
            client_name: null
          }
        };

        const result = taskToFormValues(proposedTaskNoClient);

        expect(result).toEqual({
          title: 'Research Task',
          client_name: '',
          event_time: null,
          location: null,
          note: 'Legal research on corporate law',
        });
      });

      it('should handle ProposedTask with missing client_resolution properties', () => {
        const proposedTaskPartial: Partial<ProposedTask> = {
          title: 'Partial Task',
          client_resolution: {
            status: 'MATCH_FOUND',
            client_id: 1,
            client_name: null
          }
        };

        const result = taskToFormValues(proposedTaskPartial);

        expect(result).toEqual({
          title: 'Partial Task',
          client_name: '',
          event_time: null,
          location: null,
          note: null,
        });
      });
    });

    describe('with mixed/edge case inputs', () => {
      it('should handle empty object', () => {
        const result = taskToFormValues({});

        expect(result).toEqual({
          title: '',
          client_name: '',
          event_time: null,
          location: null,
          note: null,
        });
      });

      it('should handle object with only some properties', () => {
        const partialTask = {
          title: 'Only Title',
          location: 'Only Location'
        };

        const result = taskToFormValues(partialTask);

        expect(result).toEqual({
          title: 'Only Title',
          client_name: '',
          event_time: null,
          location: 'Only Location',
          note: null,
        });
      });

      it('should prioritize direct client_name over client_resolution', () => {
        const mixedTask = {
          title: 'Mixed Task',
          client_name: 'Direct Client Name',
          client_resolution: {
            status: 'MATCH_FOUND' as const,
            client_id: 1,
            client_name: 'Resolution Client Name'
          }
        };

        const result = taskToFormValues(mixedTask);

        expect(result.client_name).toBe('Direct Client Name');
      });
    });
  });

  describe('isProposedTask', () => {
    it('should return true for valid ProposedTask', () => {
      const proposedTask: ProposedTask = {
        title: 'Test',
        event_time: null,
        location: null,
        note: 'Test note',
        client_resolution: {
          status: 'MATCH_FOUND',
          client_id: 1,
          client_name: 'Test Client'
        }
      };

      expect(isProposedTask(proposedTask)).toBe(true);
    });

    it('should return true for object with client_resolution property', () => {
      const taskLike = {
        title: 'Test',
        client_resolution: { status: 'MATCH_FOUND' }
      };

      expect(isProposedTask(taskLike)).toBe(true);
    });

    it('should return false for TaskWithClient', () => {
      const taskWithClient: Partial<TaskWithClient> = {
        title: 'Test',
        client_name: 'Test Client'
      };

      expect(isProposedTask(taskWithClient)).toBe(false);
    });

    it('should return falsy for null (actual behavior)', () => {
      expect(isProposedTask(null)).toBeFalsy();
    });

    it('should return falsy for undefined (actual behavior)', () => {
      expect(isProposedTask(undefined)).toBeFalsy();
    });

    it('should return false for empty object', () => {
      expect(isProposedTask({})).toBe(false);
    });

    it('should throw error for non-object types (current implementation)', () => {
      expect(() => isProposedTask('string')).toThrow();
      expect(() => isProposedTask(123)).toThrow();
      expect(() => isProposedTask(true)).toThrow();
    });
  });

  describe('isTaskWithClient', () => {
    it('should return true for valid TaskWithClient', () => {
      const taskWithClient: Partial<TaskWithClient> = {
        title: 'Test',
        client_name: 'Test Client'
      };

      expect(isTaskWithClient(taskWithClient)).toBe(true);
    });

    it('should return true for object with client_name property', () => {
      const taskLike = {
        title: 'Test',
        client_name: 'Test Client'
      };

      expect(isTaskWithClient(taskLike)).toBe(true);
    });

    it('should return false for ProposedTask', () => {
      const proposedTask: ProposedTask = {
        title: 'Test',
        event_time: null,
        location: null,
        note: 'Test note',
        client_resolution: {
          status: 'MATCH_FOUND',
          client_id: 1,
          client_name: 'Test Client'
        }
      };

      expect(isTaskWithClient(proposedTask)).toBe(false);
    });

    it('should return falsy for null (actual behavior)', () => {
      expect(isTaskWithClient(null)).toBeFalsy();
    });

    it('should return falsy for undefined (actual behavior)', () => {
      expect(isTaskWithClient(undefined)).toBeFalsy();
    });

    it('should return false for empty object', () => {
      expect(isTaskWithClient({})).toBe(false);
    });

    it('should throw error for non-object types (current implementation)', () => {
      expect(() => isTaskWithClient('string')).toThrow();
      expect(() => isTaskWithClient(123)).toThrow();
      expect(() => isTaskWithClient(true)).toThrow();
    });
  });

  describe('type guard mutual exclusivity', () => {
    it('should not both return true for the same object', () => {
      const taskWithClient = { title: 'Test', client_name: 'Client' };
      const proposedTask = { title: 'Test', client_resolution: { status: 'MATCH_FOUND' } };

      expect(isTaskWithClient(taskWithClient) && isProposedTask(taskWithClient)).toBe(false);
      expect(isTaskWithClient(proposedTask) && isProposedTask(proposedTask)).toBe(false);
    });

    it('should handle edge case with both properties', () => {
      const mixedObject = {
        title: 'Test',
        client_name: 'Direct Client',
        client_resolution: { status: 'MATCH_FOUND' as const, client_id: 1, client_name: 'Resolution Client' }
      };

      // Should be classified as TaskWithClient due to direct client_name property
      expect(isTaskWithClient(mixedObject)).toBe(true);
      expect(isProposedTask(mixedObject)).toBe(true); // Also has client_resolution
    });
  });
});