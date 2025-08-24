/**
 * File utilities with validation support
 */

// File validation constants
export const FILE_VALIDATION = {
  MAX_SIZE_MB: 50, // 50MB max file size
  MAX_SIZE_BYTES: 50 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/heic'
  ],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/rtf'
  ],
  ALLOWED_AUDIO_TYPES: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/m4a',
    'audio/aac',
    'audio/amr',
    'audio/flac',
    'audio/ogg',
    'audio/opus',
    'audio/wma'
  ],
  ALLOWED_VIDEO_TYPES: [
    'video/mp4',
    'video/mpeg',
    'video/avi',
    'video/mov',
    'video/quicktime',
    'video/flv',
    'video/mkv',
    'video/webm',
    'video/wmv'
  ]
} as const;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Generate upload batch ID
 */
export function generateUploadBatchId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generate unique filename
 */
export function generateUniqueFileName(originalName: string): string {
  const extension = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : '';
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${extension}`;
}

/**
 * Process file from image picker
 */
export function processPickerFile(asset: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}) {
  const originalName = asset.fileName || `image_${Date.now()}.jpg`;

  return {
    uri: asset.uri,
    fileName: generateUniqueFileName(originalName),
    originalName,
    mimeType: asset.mimeType || 'image/jpeg',
    size: asset.fileSize || 0,
  };
}

/**
 * Validate file type and size
 */
export function validateFile(
  mimeType: string | null | undefined,
  size: number | null | undefined,
  fileName?: string
): ValidationResult {
  const actualMimeType = mimeType || '';
  const actualSize = size || 0;

  // Check if file type is allowed
  const allAllowedTypes = [
    ...FILE_VALIDATION.ALLOWED_IMAGE_TYPES,
    ...FILE_VALIDATION.ALLOWED_DOCUMENT_TYPES,
    ...FILE_VALIDATION.ALLOWED_AUDIO_TYPES,
    ...FILE_VALIDATION.ALLOWED_VIDEO_TYPES
  ];

  if (!allAllowedTypes.includes(actualMimeType as any)) {
    const fileExt = fileName?.split('.').pop()?.toLowerCase() || 'unknown';
    return {
      isValid: false,
      error: `File type '${fileExt}' is not supported. Please use images, documents, audio, or video files.`
    };
  }

  // Check file size
  if (actualSize > FILE_VALIDATION.MAX_SIZE_BYTES) {
    const sizeMB = (actualSize / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File size (${sizeMB}MB) exceeds the ${FILE_VALIDATION.MAX_SIZE_MB}MB limit.`
    };
  }

  return { isValid: true };
}

/**
 * Process and validate file from picker
 */
export function processAndValidatePickerFile(asset: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}): { file: ReturnType<typeof processPickerFile>; validation: ValidationResult } {
  const file = processPickerFile(asset);
  const validation = validateFile(file.mimeType, file.size, file.originalName);

  return { file, validation };
}
