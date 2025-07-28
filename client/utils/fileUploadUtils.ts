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
 * Extract file info from image picker result
 * Normalizes file data from different sources
 */
export function extractFileInfo(imagePickerAsset: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number;
  height?: number;
}): { uri: string; fileName: string; mimeType: string; size?: number } {
  // Generate filename if not provided
  const fileName = imagePickerAsset.fileName || 
    `image_${Date.now()}.${imagePickerAsset.mimeType?.split('/')[1] || 'jpg'}`;
  
  // Default to image/jpeg if mime type not provided
  const mimeType = imagePickerAsset.mimeType || 'image/jpeg';

  return {
    uri: imagePickerAsset.uri,
    fileName,
    mimeType,
    size: imagePickerAsset.fileSize || undefined
  };
}
