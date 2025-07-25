import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configure Day.js plugins
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

// Beijing timezone for legal documents
const BEIJING_TIMEZONE = 'Asia/Shanghai';

export const DateTimeUtils = {
  /**
   * Combine user input into ISO string for database storage
   */
  formatUserInputToISO: (dateStr: string, timeStr: string = ''): string | null => {
    if (!dateStr) return null;
    
    const dateDigits = dateStr.replace(/\D/g, "");
    if (dateDigits.length < 8) return null;
    
    const timeDigits = timeStr.replace(/\D/g, "");
    const timeFormatted = timeDigits.length >= 4 ? 
      `${timeDigits.slice(0, 2)}:${timeDigits.slice(2, 4)}` : 
      (timeDigits.length >= 2 ? `${timeDigits.slice(0, 2)}:00` : '00:00');
    
    const combined = dayjs(`${dateDigits} ${timeFormatted}`, "YYYYMMDD HH:mm");
    
    if (!combined.isValid()) return null;
    
    // Return Beijing timezone ISO string
    return combined.tz(BEIJING_TIMEZONE).format();
  },

  /**
   * Extract display date from ISO string (e.g., "2025-09-01T14:00:00+08:00" → "2025/09/01")
   */
  extractDateFromISO: (isoString: string | null): string => {
    if (!isoString) return '';
    const parsed = dayjs(isoString);
    return parsed.isValid() ? parsed.format("YYYY/MM/DD") : '';
  },

  /**
   * Extract display time from ISO string (e.g., "2025-09-01T14:00:00+08:00" → "14:00")
   */
  extractTimeFromISO: (isoString: string | null): string => {
    if (!isoString) return '';
    const parsed = dayjs(isoString);
    if (!parsed.isValid()) return '';
    
    const formatted = parsed.format("HH:mm");
    return formatted === "00:00" ? "" : formatted;
  },

  /**
   * Validate ISO string format
   */
  isValidISOString: (value: string | null): boolean => {
    if (!value) return true; // Allow null/empty
    return dayjs(value).isValid() && value.includes('T');
  },

  /**
   * Get current timestamp as ISO string
   */
  nowAsISOString: (): string => {
    return dayjs().tz(BEIJING_TIMEZONE).format();
  },

  /**
   * Format user date input as they type (e.g., "20250901" → "2025/09/01")
   */
  formatDateInput: (text: string): string => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, "");

    if (digits.length === 0) return "";

    // Format based on length with smart parsing for single digit months/days
    if (digits.length <= 4) {
      return digits; // Just year: "2025"
    } else if (digits.length === 5) {
      // Could be "20258" (2025/8) or "20251" (2025/1)
      const year = digits.slice(0, 4);
      const month = digits.slice(4);
      return `${year}/${month}`;
    } else if (digits.length === 6) {
      // Could be "202508" (2025/08) or "202581" (2025/8/1)
      const year = digits.slice(0, 4);
      const monthDay = digits.slice(4);

      // Check if last digit could be a valid single-digit day
      const potentialMonth = parseInt(monthDay.slice(0, 1));
      const potentialDay = parseInt(monthDay.slice(1));

      if (potentialMonth >= 1 && potentialMonth <= 9 && potentialDay >= 1 && potentialDay <= 31) {
        // Likely format: 202581 -> 2025/8/1
        return `${year}/${potentialMonth}/${potentialDay}`;
      } else {
        // Standard format: 202508 -> 2025/08
        return `${year}/${monthDay}`;
      }
    } else if (digits.length === 7) {
      // Could be "2025829" (2025/8/29) or "2025121" (2025/12/1)
      const year = digits.slice(0, 4);
      const rest = digits.slice(4); // "829" or "121"

      // Try double digit month first: 121 -> 12/1 (more likely for 10-12 months)
      const doubleMonth = parseInt(rest.slice(0, 2));
      const singleDay = parseInt(rest.slice(2));

      if (doubleMonth >= 10 && doubleMonth <= 12 && singleDay >= 1 && singleDay <= 31) {
        return `${year}/${rest.slice(0, 2)}/${singleDay}`;
      }

      // Try single digit month: 829 -> 8/29
      const singleMonth = parseInt(rest.slice(0, 1));
      const dayPart = rest.slice(1);

      if (singleMonth >= 1 && singleMonth <= 9 && dayPart.length === 2) {
        const day = parseInt(dayPart);
        if (day >= 1 && day <= 31) {
          return `${year}/${singleMonth}/${dayPart}`;
        }
      }

      // Fallback to double digit month interpretation
      return `${year}/${rest.slice(0, 2)}/${rest.slice(2)}`;
    } else {
      // Standard format: "20250101" -> "2025/01/01"
      return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6, 8)}`;
    }
  },

  /**
   * Format user time input as they type (e.g., "1400" → "14:00")
   */
  formatTimeInput: (text: string): string => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, "");
    
    if (digits.length === 0) return "";
    
    // Handle various input formats
    if (digits.length <= 2) {
      return digits; // Just hours: "9" or "09"
    } else if (digits.length === 3) {
      // "900" -> "9:00"
      return `${digits[0]}:${digits.slice(1)}`;
    } else {
      // "1400" or longer -> "14:00"
      return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
    }
  },
  
  /**
   * Parse user date input (e.g., "2025/09/01" or "20250901")
   * Returns formatted string for display normalization
   */
  parseDate: (dateStr: string): string | null => {
    if (!dateStr) return null;

    // Handle partial dates: "2025", "2025/8", "2025/8/29"
    const parts = dateStr.split("/");
    if (parts.length < 1 || parts.length > 3) return null;

    const year = parseInt(parts[0]);
    const month = parts.length >= 2 ? parseInt(parts[1]) : 1;
    const day = parts.length >= 3 ? parseInt(parts[2]) : 1;

    // Basic validation
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    // Validate ranges before creating Date object
    if (year < 1900 || year > 3000) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    return `${year.toString()}/${month.toString().padStart(2, "0")}/${day.toString().padStart(2, "0")}`;
  },

  /**
   * Parse user time input (e.g., "14:00" or "1400")
   * Returns formatted string for display normalization
   */
  parseTime: (timeStr: string): string | null => {
    if (!timeStr) return null;
  
  // Handle both "9:00" and "900" formats
  const cleanTime = timeStr.replace(/\D/g, "");
  
  let hours: number;
  let minutes: number = 0;
  
  if (cleanTime.length === 3) {
    // "900" format
    hours = parseInt(cleanTime[0]);
    minutes = parseInt(cleanTime.slice(1));
  } else if (cleanTime.length >= 4) {
    // "1400" format
    hours = parseInt(cleanTime.slice(0, 2));
    minutes = parseInt(cleanTime.slice(2, 4));
  } else if (cleanTime.length <= 2) {
    // Just hours
    hours = parseInt(cleanTime);
  } else {
    return null;
  }
  
  // Validate time
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
    
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }
};

export default dayjs;