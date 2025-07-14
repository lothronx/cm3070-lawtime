/**
 * Time formatting and parsing utilities for DateTimeInput component
 */

export const formatTimeInput = (text: string): string => {
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
};

export const parseTime = (timeStr: string): { hours: number; minutes: number } | null => {
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
  
  return { hours, minutes };
};

export const formatTimeFromObject = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  // If it's midnight (00:00), return empty string so user can enter time directly
  if (hours === 0 && minutes === 0) {
    return "";
  }
  
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

export const formatTimeForDisplay = (timeObj: { hours: number; minutes: number }): string => {
  return `${timeObj.hours.toString().padStart(2, "0")}:${timeObj.minutes.toString().padStart(2, "0")}`;
};