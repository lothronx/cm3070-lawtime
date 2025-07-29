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
    
    // Convert URI to ArrayBuffer for upload
    const response = await fetch(file.uri);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new Error(`File is empty or could not be read: ${file.fileName}`);
    }

    // Upload to Supabase Storage using ArrayBuffer
    const { error } = await supabase.storage
      .from('task_files')
      .upload(tempPath, arrayBuffer, {
        contentType: file.mimeType,
        upsert: false
      });

    if (error) {
      throw new Error(`Failed to upload ${file.fileName}: ${error.message}`);
    }

    // Get a signed URL for secure access (valid for 1 hour for temp files)
    const signedUrl = await this.createSignedUrl(tempPath, 3600);

    return { path: tempPath, publicUrl: signedUrl };
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
  },

  /**
   * Create a signed URL for secure, temporary access to a file
   * @param filePath Path to the file in storage
   * @param expiresIn Expiration time in seconds (default: 60 seconds)
   * @returns Promise<string> Signed URL that expires after specified time
   */
  async createSignedUrl(filePath: string, expiresIn: number = 60): Promise<string> {
    const { data, error } = await supabase.storage
      .from('task_files')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL for ${filePath}: ${error.message}`);
    }

    if (!data?.signedUrl) {
      throw new Error(`No signed URL returned for ${filePath}`);
    }

    return data.signedUrl;
  },

  /**
   * List files in a user's temp folder
   */
  async listTempFiles(uploadBatchId?: string): Promise<any[]> {
    const { session } = useAuthStore.getState();
    
    if (!session?.user) {
      throw new Error('User not authenticated');
    }
    
    let folderPath = `${session.user.id}/temp`;
    if (uploadBatchId) {
      folderPath += `/${uploadBatchId}`;
    }
    
    const { data, error } = await supabase.storage
      .from('task_files')
      .list(folderPath, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data || [];
  },
};
