/**
 * File upload utility functions
 * Pure utility functions for file handling - no business logic
 */

/**
 * Generate a unique batch ID for temporary uploads
 * Format: upload_{timestamp}_{randomString}
 */
export function generateUploadBatchId(): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  return `upload_${timestamp}_${randomString}`;
}

/**
 * Generate a unique filename while preserving original in metadata
 * This approach uses a timestamp + random ID but keeps original name for reference
 */
export function generateUniqueFileName(originalFileName: string): {
  storageFileName: string;
  originalFileName: string;
} {
  // Get file extension
  const lastDotIndex = originalFileName.lastIndexOf('.');
  const extension = lastDotIndex > 0 ? originalFileName.substring(lastDotIndex) : '';
  
  // Generate a unique, storage-safe filename
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const storageFileName = `file_${timestamp}_${randomId}${extension}`;
  
  return {
    storageFileName,
    originalFileName
  };
}

/**
 * Extract file info from image picker result
 * Uses unique storage filenames to avoid any character encoding issues
 */
export function extractFileInfo(imagePickerAsset: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number;
  height?: number;
}): { uri: string; fileName: string; mimeType: string; size?: number; originalFileName: string } {
  // Get original filename
  const originalFileName = imagePickerAsset.fileName || 
    `image_${Date.now()}.${imagePickerAsset.mimeType?.split('/')[1] || 'jpg'}`;
  
  // Generate a unique, storage-safe filename
  const { storageFileName } = generateUniqueFileName(originalFileName);
  
  // Default to image/jpeg if mime type not provided
  const mimeType = imagePickerAsset.mimeType || 'image/jpeg';

  return {
    uri: imagePickerAsset.uri,
    fileName: storageFileName, // Use the safe storage filename
    mimeType,
    size: imagePickerAsset.fileSize || undefined,
    originalFileName // Keep the original for display/database
  };
}
