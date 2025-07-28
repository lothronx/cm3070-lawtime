/**
 * File storage service for Supabase Storage operations
 * Handles file uploads, downloads, and storage management
 */

import { supabase } from '@/utils/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface UploadResult {
  path: string;
  publicUrl: string;
}

export const fileStorageService = {
  /**
   * Upload a single file to temporary storage
   * @param file File URI and metadata
   * @param uploadBatchId Unique batch identifier for grouping
   * @returns Promise<UploadResult> Storage path and public URL
   */
  async uploadToTempStorage(
    file: { uri: string; fileName: string; mimeType: string },
    uploadBatchId: string
  ): Promise<UploadResult> {
    const { session } = useAuthStore.getState();
    
    if (!session?.user) {
      throw new Error('Authentication required. Please log in again.');
    }

    const tempPath = `${session.user.id}/temp/${uploadBatchId}/${file.fileName}`;
    
    // Convert URI to blob for upload
    const response = await fetch(file.uri);
    const blob = await response.blob();

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('task_files')
      .upload(tempPath, blob, {
        contentType: file.mimeType,
        upsert: false
      });

    if (error) {
      throw new Error(`Failed to upload ${file.fileName}: ${error.message}`);
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('task_files')
      .getPublicUrl(tempPath);

    return { path: tempPath, publicUrl };
  },

  /**
   * Upload multiple files to temporary storage
   * @param files Array of file objects
   * @param uploadBatchId Unique batch identifier
   * @returns Promise<UploadResult[]> Array of upload results
   */
  async uploadMultipleToTempStorage(
    files: { uri: string; fileName: string; mimeType: string }[],
    uploadBatchId: string
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    
    for (const file of files) {
      const result = await this.uploadToTempStorage(file, uploadBatchId);
      results.push(result);
    }
    
    return results;
  },

  /**
   * Clean up temporary files
   * @param uploadBatchId Batch to clean up
   */
  async cleanupTempFiles(uploadBatchId: string): Promise<void> {
    const { session } = useAuthStore.getState();
    
    if (!session?.user) {
      return;
    }

    try {
      const tempDir = `${session.user.id}/temp/${uploadBatchId}`;
      
      const { data: files, error: listError } = await supabase.storage
        .from('task_files')
        .list(tempDir);

      if (listError || !files || files.length === 0) {
        return;
      }

      const filePaths = files.map(file => `${tempDir}/${file.name}`);
      
      const { error: deleteError } = await supabase.storage
        .from('task_files')
        .remove(filePaths);

      if (deleteError) {
        console.warn('Failed to clean up temp files:', deleteError.message);
      }
    } catch (error) {
      console.warn('Error during temp file cleanup:', error);
    }
  }
};
