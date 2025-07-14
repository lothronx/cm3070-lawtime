/**
 * Input sanitization and validation utilities
 */

/**
 * Sanitizes user input by removing potentially dangerous characters
 * and normalizing whitespace
 */
export const sanitizeInput = (text: string): string => {
  return text
    .replace(/[<>"'&;`\\|{}[\]]/g, "") // Remove HTML/SQL injection chars
    .replace(/[\r\n\t]/g, "") // Remove line breaks and tabs
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width chars
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control chars
    .replace(/\s+/g, " ") // Normalize remaining whitespace
    .trim();
};

/**
 * Validates text length within specified bounds
 */
export const validateTextLength = (
  value: string | undefined | null,
  minLength: number,
  maxLength: number,
  fieldName: string,
  required: boolean = true
): string | true => {
  const trimmed = value?.trim();
  
  if (!trimmed) {
    return required ? `${fieldName} is required` : true;
  }
  
  if (trimmed.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  
  if (trimmed.length > maxLength) {
    return `${fieldName} must be at most ${maxLength} characters`;
  }
  
  return true;
};