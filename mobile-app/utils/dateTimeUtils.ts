/**
 * Combined date and time utilities for DateTimeInput component
 */

import { parseDate } from "./dateUtils";
import { parseTime } from "./timeUtils";

/**
 * Combines date and time strings into a single Date object
 * @param dateStr - Date string in format "YYYY/MM/DD" or partial
 * @param timeStr - Time string in format "HH:MM" or "HHMM"
 * @returns Date object or null if invalid
 */
export const combineDateTime = (dateStr: string, timeStr: string): Date | null => {
  // If no date provided, return null (database accepts null timestamps)
  if (!dateStr) return null;
  
  const dateObj = parseDate(dateStr);
  if (!dateObj) return null;
  
  const timeObj = parseTime(timeStr);
  if (timeObj) {
    dateObj.setHours(timeObj.hours, timeObj.minutes, 0, 0);
  }
  // If no time is provided, keep the date at 00:00:00 (midnight)
  
  return dateObj;
};