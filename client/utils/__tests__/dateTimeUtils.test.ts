import { DateTimeUtils } from '../dateTimeUtils';

describe('DateTimeUtils', () => {
  describe('formatUserInputToISO', () => {
    it('should format valid date and time to Beijing timezone ISO string', () => {
      const result = DateTimeUtils.formatUserInputToISO('20250901', '1400');
      expect(result).toMatch(/2025-09-01T14:00:00\+08:00/);
    });

    it('should format date only with default time 00:00', () => {
      const result = DateTimeUtils.formatUserInputToISO('20250901', '');
      expect(result).toMatch(/2025-09-01T00:00:00\+08:00/);
    });

    it('should handle partial time input', () => {
      const result = DateTimeUtils.formatUserInputToISO('20250901', '14');
      expect(result).toMatch(/2025-09-01T14:00:00\+08:00/);
    });

    it('should return null for empty date', () => {
      const result = DateTimeUtils.formatUserInputToISO('');
      expect(result).toBeNull();
    });

    it('should return null for date with insufficient digits', () => {
      const result = DateTimeUtils.formatUserInputToISO('2025');
      expect(result).toBeNull();
    });

    it('should handle non-digit characters in date', () => {
      const result = DateTimeUtils.formatUserInputToISO('2025-09-01', '14:00');
      expect(result).toMatch(/2025-09-01T14:00:00\+08:00/);
    });

    it('should handle non-digit characters in time', () => {
      const result = DateTimeUtils.formatUserInputToISO('20250901', '14:30');
      expect(result).toMatch(/2025-09-01T14:30:00\+08:00/);
    });

    it('should handle invalid month by rolling over to next year', () => {
      const result = DateTimeUtils.formatUserInputToISO('20251301'); // Month 13 rolls to Jan 2026
      expect(result).toMatch(/2026-01-01T00:00:00\+08:00/);
    });

    it('should handle edge case: February 29th on leap year', () => {
      const result = DateTimeUtils.formatUserInputToISO('20240229', '1200');
      expect(result).toMatch(/2024-02-29T12:00:00\+08:00/);
    });

    it('should handle February 29th on non-leap year by rolling to March 1st', () => {
      const result = DateTimeUtils.formatUserInputToISO('20230229'); // 2023 is not a leap year, rolls to March 1st
      expect(result).toMatch(/2023-03-01T00:00:00\+08:00/);
    });
  });

  describe('extractDateFromISO', () => {
    it('should extract date from valid ISO string', () => {
      const result = DateTimeUtils.extractDateFromISO('2025-09-01T14:00:00+08:00');
      expect(result).toBe('2025/09/01');
    });

    it('should return empty string for null input', () => {
      const result = DateTimeUtils.extractDateFromISO(null);
      expect(result).toBe('');
    });

    it('should return empty string for invalid ISO string', () => {
      const result = DateTimeUtils.extractDateFromISO('invalid-date');
      expect(result).toBe('');
    });

    it('should handle different timezone formats', () => {
      const result = DateTimeUtils.extractDateFromISO('2025-09-01T14:00:00Z');
      expect(result).toBe('2025/09/01');
    });

    it('should handle date without timezone info', () => {
      const result = DateTimeUtils.extractDateFromISO('2025-09-01T14:00:00');
      expect(result).toBe('2025/09/01');
    });
  });

  describe('extractTimeFromISO', () => {
    it('should extract time from valid ISO string', () => {
      const result = DateTimeUtils.extractTimeFromISO('2025-09-01T14:30:00+08:00');
      expect(result).toBe('14:30');
    });

    it('should return empty string for midnight (00:00)', () => {
      const result = DateTimeUtils.extractTimeFromISO('2025-09-01T00:00:00+08:00');
      expect(result).toBe('');
    });

    it('should return empty string for null input', () => {
      const result = DateTimeUtils.extractTimeFromISO(null);
      expect(result).toBe('');
    });

    it('should return empty string for invalid ISO string', () => {
      const result = DateTimeUtils.extractTimeFromISO('invalid-date');
      expect(result).toBe('');
    });

    it('should handle edge time cases', () => {
      const result = DateTimeUtils.extractTimeFromISO('2025-09-01T23:59:00+08:00');
      expect(result).toBe('23:59');
    });
  });

  describe('isValidISOString', () => {
    it('should return true for valid ISO string', () => {
      const result = DateTimeUtils.isValidISOString('2025-09-01T14:00:00+08:00');
      expect(result).toBe(true);
    });

    it('should return true for null/empty (allowed)', () => {
      expect(DateTimeUtils.isValidISOString(null)).toBe(true);
      expect(DateTimeUtils.isValidISOString('')).toBe(true);
    });

    it('should return false for invalid ISO string', () => {
      const result = DateTimeUtils.isValidISOString('2025-09-01');
      expect(result).toBe(false);
    });

    it('should return false for date without T separator', () => {
      const result = DateTimeUtils.isValidISOString('2025-09-01 14:00:00');
      expect(result).toBe(false);
    });

    it('should return false for completely invalid input', () => {
      const result = DateTimeUtils.isValidISOString('not-a-date');
      expect(result).toBe(false);
    });
  });

  describe('nowAsISOString', () => {
    it('should return current timestamp as Beijing timezone ISO string', () => {
      const result = DateTimeUtils.nowAsISOString();
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00/);
    });

    it('should return a valid date', () => {
      const result = DateTimeUtils.nowAsISOString();
      const parsed = new Date(result);
      expect(parsed.getTime()).toBeGreaterThan(0);
    });
  });

  describe('formatDateInput', () => {
    it('should format year only', () => {
      expect(DateTimeUtils.formatDateInput('2025')).toBe('2025');
    });

    it('should format year and single digit month', () => {
      expect(DateTimeUtils.formatDateInput('20258')).toBe('2025/8');
    });

    it('should format year and double digit month', () => {
      expect(DateTimeUtils.formatDateInput('202508')).toBe('2025/08');
    });

    it('should intelligently parse single digit month and day', () => {
      expect(DateTimeUtils.formatDateInput('202581')).toBe('2025/8/1');
    });

    it('should handle complex 7-digit input with double digit month', () => {
      expect(DateTimeUtils.formatDateInput('2025121')).toBe('2025/12/1');
    });

    it('should handle complex 7-digit input with single digit month', () => {
      expect(DateTimeUtils.formatDateInput('2025829')).toBe('2025/8/29');
    });

    it('should format full date (8 digits)', () => {
      expect(DateTimeUtils.formatDateInput('20250901')).toBe('2025/09/01');
    });

    it('should handle non-digit characters by removing them', () => {
      expect(DateTimeUtils.formatDateInput('2025-09-01')).toBe('2025/09/01');
    });

    it('should handle empty input', () => {
      expect(DateTimeUtils.formatDateInput('')).toBe('');
    });

    it('should handle input with mixed characters', () => {
      expect(DateTimeUtils.formatDateInput('2025abc09def01')).toBe('2025/09/01');
    });
  });

  describe('formatTimeInput', () => {
    it('should format single digit hour', () => {
      expect(DateTimeUtils.formatTimeInput('9')).toBe('9');
    });

    it('should format double digit hour', () => {
      expect(DateTimeUtils.formatTimeInput('09')).toBe('09');
    });

    it('should format 3-digit time (single digit hour)', () => {
      expect(DateTimeUtils.formatTimeInput('900')).toBe('9:00');
    });

    it('should format 4-digit time', () => {
      expect(DateTimeUtils.formatTimeInput('1400')).toBe('14:00');
    });

    it('should handle longer input by truncating', () => {
      expect(DateTimeUtils.formatTimeInput('140030')).toBe('14:00');
    });

    it('should handle non-digit characters by removing them', () => {
      expect(DateTimeUtils.formatTimeInput('14:30')).toBe('14:30');
    });

    it('should handle empty input', () => {
      expect(DateTimeUtils.formatTimeInput('')).toBe('');
    });

    it('should handle mixed characters', () => {
      expect(DateTimeUtils.formatTimeInput('14abc30')).toBe('14:30');
    });
  });

  describe('parseDate', () => {
    it('should parse full date format', () => {
      const result = DateTimeUtils.parseDate('2025/09/01');
      expect(result).toBe('2025/09/01');
    });

    it('should parse and normalize partial date with single digits', () => {
      const result = DateTimeUtils.parseDate('2025/8/1');
      expect(result).toBe('2025/08/01');
    });

    it('should handle year only by defaulting month and day to 1', () => {
      const result = DateTimeUtils.parseDate('2025');
      expect(result).toBe('2025/01/01');
    });

    it('should handle year and month only by defaulting day to 1', () => {
      const result = DateTimeUtils.parseDate('2025/8');
      expect(result).toBe('2025/08/01');
    });

    it('should return null for empty input', () => {
      const result = DateTimeUtils.parseDate('');
      expect(result).toBeNull();
    });

    it('should return null for invalid year', () => {
      const result = DateTimeUtils.parseDate('abc/09/01');
      expect(result).toBeNull();
    });

    it('should return null for invalid month', () => {
      const result = DateTimeUtils.parseDate('2025/13/01');
      expect(result).toBeNull();
    });

    it('should return null for invalid day', () => {
      const result = DateTimeUtils.parseDate('2025/09/32');
      expect(result).toBeNull();
    });

    it('should return null for out-of-range year', () => {
      expect(DateTimeUtils.parseDate('1800/09/01')).toBeNull();
      expect(DateTimeUtils.parseDate('3001/09/01')).toBeNull();
    });

    it('should return null for too many parts', () => {
      const result = DateTimeUtils.parseDate('2025/09/01/extra');
      expect(result).toBeNull();
    });
  });

  describe('parseTime', () => {
    it('should parse full time format', () => {
      const result = DateTimeUtils.parseTime('14:30');
      expect(result).toBe('14:30');
    });

    it('should parse 4-digit time format', () => {
      const result = DateTimeUtils.parseTime('1430');
      expect(result).toBe('14:30');
    });

    it('should parse 3-digit time format (single digit hour)', () => {
      const result = DateTimeUtils.parseTime('930');
      expect(result).toBe('09:30');
    });

    it('should parse hours only by defaulting minutes to 00', () => {
      const result = DateTimeUtils.parseTime('14');
      expect(result).toBe('14:00');
    });

    it('should handle single digit hour', () => {
      const result = DateTimeUtils.parseTime('9');
      expect(result).toBe('09:00');
    });

    it('should return null for empty input', () => {
      const result = DateTimeUtils.parseTime('');
      expect(result).toBeNull();
    });

    it('should return null for invalid hours', () => {
      expect(DateTimeUtils.parseTime('2500')).toBeNull();
      expect(DateTimeUtils.parseTime('abc0')).toBe('00:00'); // Non-digits removed, becomes '0' -> '00:00'
    });

    it('should return null for invalid minutes', () => {
      expect(DateTimeUtils.parseTime('1460')).toBeNull();
      expect(DateTimeUtils.parseTime('14abc')).toBe('14:00'); // Non-digits removed, becomes '14' -> '14:00'
    });

    it('should handle edge cases for valid time ranges', () => {
      expect(DateTimeUtils.parseTime('0000')).toBe('00:00');
      expect(DateTimeUtils.parseTime('2359')).toBe('23:59');
    });

    it('should handle mixed characters by removing non-digits', () => {
      const result = DateTimeUtils.parseTime('14:30:45');
      expect(result).toBe('14:30');
    });
  });
});