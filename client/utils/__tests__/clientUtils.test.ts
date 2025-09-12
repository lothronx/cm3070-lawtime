import { filterClients, debounce } from '../clientUtils';
import { DbClient } from '@/types';

// Mock DbClient data for testing
const mockClients: DbClient[] = [
  {
    id: 1,
    user_id: 'user1',
    client_name: 'ACME Corporation',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 2,
    user_id: 'user1',
    client_name: 'Smith & Associates',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 3,
    user_id: 'user1',
    client_name: 'Johnson Legal Group',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 4,
    user_id: 'user1',
    client_name: 'ABC Industries',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 5,
    user_id: 'user1',
    client_name: 'Global Tech Solutions',
    created_at: '2025-01-01T00:00:00Z',
  }
];

describe('clientUtils', () => {
  describe('filterClients', () => {
    it('should return all clients when query is empty', () => {
      const result = filterClients(mockClients, '');
      expect(result).toEqual(mockClients);
      expect(result).toHaveLength(5);
    });

    it('should return all clients when query is only whitespace', () => {
      const result = filterClients(mockClients, '   ');
      expect(result).toEqual(mockClients);
      expect(result).toHaveLength(5);
    });

    it('should filter clients by exact name match', () => {
      const result = filterClients(mockClients, 'ACME Corporation');
      expect(result).toHaveLength(1);
      expect(result[0].client_name).toBe('ACME Corporation');
    });

    it('should filter clients by partial name match (case-insensitive)', () => {
      const result = filterClients(mockClients, 'smith');
      expect(result).toHaveLength(1);
      expect(result[0].client_name).toBe('Smith & Associates');
    });

    it('should filter clients by partial name match (uppercase query)', () => {
      const result = filterClients(mockClients, 'SMITH');
      expect(result).toHaveLength(1);
      expect(result[0].client_name).toBe('Smith & Associates');
    });

    it('should filter clients by partial word match', () => {
      const result = filterClients(mockClients, 'Legal');
      expect(result).toHaveLength(1);
      expect(result[0].client_name).toBe('Johnson Legal Group');
    });

    it('should return multiple matches for common terms', () => {
      const result = filterClients(mockClients, 'c'); // Should match ACME, Smith & Associates, ABC, Global Tech Solutions
      expect(result).toHaveLength(4);
      expect(result.map(c => c.client_name)).toContain('ACME Corporation');
      expect(result.map(c => c.client_name)).toContain('ABC Industries');
      expect(result.map(c => c.client_name)).toContain('Smith & Associates'); // contains 'c' in Associates
      expect(result.map(c => c.client_name)).toContain('Global Tech Solutions'); // contains 'c' in Tech
    });

    it('should return empty array for no matches', () => {
      const result = filterClients(mockClients, 'NonExistentClient');
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should handle special characters in search query', () => {
      const result = filterClients(mockClients, '&');
      expect(result).toHaveLength(1);
      expect(result[0].client_name).toBe('Smith & Associates');
    });

    it('should handle empty client array', () => {
      const result = filterClients([], 'ACME');
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should handle search with leading/trailing spaces (trim only affects empty check)', () => {
      // The function trims only for empty check, but searches with original query including spaces
      const result = filterClients(mockClients, '  smith  ');
      expect(result).toHaveLength(0); // No match because client names don't contain spaces around 'smith'

      // Test with actual trimmed search
      const resultTrimmed = filterClients(mockClients, 'smith');
      expect(resultTrimmed).toHaveLength(1);
      expect(resultTrimmed[0].client_name).toBe('Smith & Associates');
    });

    it('should be case-insensitive for mixed case names', () => {
      const result = filterClients(mockClients, 'acme');
      expect(result).toHaveLength(1);
      expect(result[0].client_name).toBe('ACME Corporation');
    });

    it('should handle partial matches across word boundaries', () => {
      const result = filterClients(mockClients, 'Tech');
      expect(result).toHaveLength(1);
      expect(result[0].client_name).toBe('Global Tech Solutions');
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should delay function execution', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn('test');
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledWith('test');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should cancel previous calls when called multiple times', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');

      jest.advanceTimersByTime(1000);

      expect(mockFn).toHaveBeenCalledWith('third');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid successive calls correctly', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 500);

      debouncedFn('call1');
      jest.advanceTimersByTime(200);

      debouncedFn('call2');
      jest.advanceTimersByTime(200);

      debouncedFn('call3');
      jest.advanceTimersByTime(500);

      expect(mockFn).toHaveBeenCalledWith('call3');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should allow execution after wait time has passed', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 300);

      debouncedFn('first');
      jest.advanceTimersByTime(300);
      expect(mockFn).toHaveBeenCalledWith('first');

      debouncedFn('second');
      jest.advanceTimersByTime(300);
      expect(mockFn).toHaveBeenCalledWith('second');

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle functions with multiple parameters', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('param1', 'param2', 123);
      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledWith('param1', 'param2', 123);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle functions with no parameters', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledWith();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should work with zero wait time', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 0);

      debouncedFn('immediate');
      jest.advanceTimersByTime(0);

      expect(mockFn).toHaveBeenCalledWith('immediate');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should preserve function context and return value behavior', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      // Test that the debounced function doesn't throw
      expect(() => debouncedFn('test')).not.toThrow();

      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('should handle edge case with very small wait times', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 1);

      debouncedFn('quick');
      jest.advanceTimersByTime(1);

      expect(mockFn).toHaveBeenCalledWith('quick');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});