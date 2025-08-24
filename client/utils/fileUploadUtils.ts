/**
 * Simple file utilities - just what we need
 */

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
