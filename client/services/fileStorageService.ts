/**
 * File storage service - Simple CRUD operations for Supabase Storage
 * No business logic, no retry, no validation - just basic storage operations
 */

import { supabase } from '@/utils/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface UploadResult {
  path: string;
  publicUrl: string;
}

export const fileStorageService = {
  /**
   * Upload file to temp_uploads bucket
   */
  async uploadToTemp(file: { uri: string; fileName: string; mimeType: string }, batchId: string): Promise<UploadResult> {
    const { session } = useAuthStore.getState();
    if (!session?.user) throw new Error('Not authenticated');

    const path = `${session.user.id}/temp/${batchId}/${file.fileName}`;

    const response = await fetch(file.uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from('temp_uploads')
      .upload(path, arrayBuffer, { contentType: file.mimeType });

    if (error) throw error;

    return {
      path,
      publicUrl: supabase.storage.from('temp_uploads').getPublicUrl(path).data.publicUrl
    };
  },

  /**
   * Move file from temp to task_files
   */
  async moveToTaskFiles(tempPath: string, taskId: number, fileName: string): Promise<UploadResult> {
    const { session } = useAuthStore.getState();
    if (!session?.user) throw new Error('Not authenticated');

    const permanentPath = `${session.user.id}/${taskId}/${Date.now()}-${fileName}`;

    // Download from temp
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('temp_uploads')
      .download(tempPath);

    if (downloadError) throw downloadError;

    // Upload to permanent
    const { error: uploadError } = await supabase.storage
      .from('task_files')
      .upload(permanentPath, fileData);

    if (uploadError) throw uploadError;

    // Cleanup temp file
    await supabase.storage.from('temp_uploads').remove([tempPath]);

    return {
      path: permanentPath,
      publicUrl: supabase.storage.from('task_files').getPublicUrl(permanentPath).data.publicUrl
    };
  },

  /**
   * Delete from temp_uploads
   */
  async deleteFromTemp(paths: string[]): Promise<void> {
    const { error } = await supabase.storage.from('temp_uploads').remove(paths);
    if (error) throw error;
  },

  /**
   * Delete from task_files
   */
  async deleteFromTaskFiles(path: string): Promise<void> {
    const { error } = await supabase.storage.from('task_files').remove([path]);
    if (error) throw error;
  },

  /**
   * List temp files for cleanup
   */
  async listTempBatches(): Promise<string[]> {
    const { session } = useAuthStore.getState();
    if (!session?.user) return [];

    const { data } = await supabase.storage
      .from('temp_uploads')
      .list(`${session.user.id}/temp`);

    return data?.map(item => item.name) || [];
  },

  /**
   * Generate signed URL for permanent file access
   */
  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from('task_files')
      .createSignedUrl(path, expiresIn);

    if (error) throw error;

    return data.signedUrl;
  },

};
