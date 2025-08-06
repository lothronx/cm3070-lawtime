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
      .from('temp_uploads')
      .upload(tempPath, arrayBuffer, {
        contentType: file.mimeType,
        upsert: false
      });

    if (error) {
      throw new Error(`Failed to upload ${file.fileName}: ${error.message}`);
    }

    // Get public URL for temp files (no signing needed for public bucket)
    const publicUrl = this.retrievePublicUrl(tempPath);

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
        .from('temp_uploads')
        .list(tempDir);

      if (listError || !files || files.length === 0) {
        return;
      }

      const filePaths = files.map(file => `${tempDir}/${file.name}`);
      
      const { error: deleteError } = await supabase.storage
        .from('temp_uploads')
        .remove(filePaths);

      if (deleteError) {
        console.warn('Failed to clean up temp files:', deleteError.message);
      }
    } catch (error) {
      console.warn('Error during temp file cleanup:', error);
    }
  },

  /**
   * Get public URL for a file in temp storage
   * @param filePath Path to the file in storage
   * @param bucket Bucket name (default: 'temp_uploads' for temporary files)
   * @returns string Public URL for the file
   */
  retrievePublicUrl(filePath: string, bucket: string = 'temp_uploads'): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
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
      .from('temp_uploads')
      .list(folderPath, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Upload a file to permanent task_files storage
   * @param file File URI and metadata
   * @param taskId Task ID for organizing files
   * @param fileName File name for storage
   * @returns Promise<UploadResult> Storage path and public URL
   */
  async uploadToTaskFiles(
    file: { uri: string; fileName: string; mimeType: string },
    taskId: number,
    fileName: string
  ): Promise<UploadResult> {
    const { session } = useAuthStore.getState();
    
    if (!session?.user) {
      throw new Error('Authentication required. Please log in again.');
    }

    const filePath = `${session.user.id}/${taskId}/${fileName}`;
    
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
      .upload(filePath, arrayBuffer, {
        contentType: file.mimeType,
        upsert: false
      });

    if (error) {
      throw new Error(`Failed to upload ${file.fileName}: ${error.message}`);
    }

    // Get public URL (though task_files is private, this gets the URL structure)
    const publicUrl = this.retrievePublicUrl(filePath, 'task_files');

    return { path: filePath, publicUrl };
  },

  /**
   * Download a file from task_files storage
   * @param filePath Path to the file in storage
   * @returns Promise<Blob> File content as blob
   */
  async downloadFromTaskFiles(filePath: string): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from('task_files')
      .download(filePath);

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }

    if (!data) {
      throw new Error(`No file data returned for: ${filePath}`);
    }

    return data;
  },

  /**
   * Delete a file from task_files storage
   * @param filePath Path to the file in storage
   * @returns Promise<void>
   */
  async deleteFromTaskFiles(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from('task_files')
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  },

  /**
   * List files in a user's task folder
   * @param taskId Optional task ID to filter by
   * @returns Promise<any[]> Array of file objects
   */
  async listTaskFiles(taskId?: number): Promise<any[]> {
    const { session } = useAuthStore.getState();
    
    if (!session?.user) {
      throw new Error('User not authenticated');
    }
    
    let folderPath = `${session.user.id}`;
    if (taskId) {
      folderPath += `/${taskId}`;
    }
    
    const { data, error } = await supabase.storage
      .from('task_files')
      .list(folderPath, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      throw new Error(`Failed to list task files: ${error.message}`);
    }

    return data || [];
  },
};
