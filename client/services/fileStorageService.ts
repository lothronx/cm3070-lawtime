/**
 * File storage service - Single bucket operations with folder-based security
 * Uses atomic move operations within file_storage bucket for maximum efficiency
 */

import { supabase } from '@/utils/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface UploadResult {
  path: string;
  publicUrl: string;
}

export const fileStorageService = {
  /**
   * Upload file to temp/ folder in file_storage bucket
   * Files in temp/ folder have public read access for AI API processing
   */
  async uploadToTemp(file: { uri: string; fileName: string; mimeType: string }, batchId: string): Promise<UploadResult> {
    const { session } = useAuthStore.getState();
    if (!session?.user) throw new Error('Not authenticated');

    // New path structure: temp/{user_id}/{batch_id}/{filename}
    const path = `temp/${session.user.id}/${batchId}/${file.fileName}`;

    const response = await fetch(file.uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from('file_storage')
      .upload(path, arrayBuffer, { contentType: file.mimeType });

    if (error) throw error;

    return {
      path,
      publicUrl: supabase.storage.from('file_storage').getPublicUrl(path).data.publicUrl
    };
  },

  /**
   * Copy file from temp/ to perm/ folder (preserves temp file)
   * Uses atomic copy operation within same bucket - no bandwidth overhead!
   */
  async copyToPerm(tempPath: string, taskId: number): Promise<UploadResult> {
    const { session } = useAuthStore.getState();
    if (!session?.user) throw new Error('Not authenticated');

    // Extract filename from temp path (already unique and safe)
    const fileName = tempPath.split('/').pop()!;
    const permanentPath = `perm/${session.user.id}/${taskId}/${fileName}`;

    // Atomic copy operation within same bucket - instant metadata update!
    const { error } = await supabase.storage
      .from('file_storage')
      .copy(tempPath, permanentPath);

    if (error) throw error;

    return {
      path: permanentPath,
      publicUrl: supabase.storage.from('file_storage').getPublicUrl(permanentPath).data.publicUrl
    };
  },

  /**
   * Delete from temp/ folder in file_storage bucket
   */
  async deleteFromTemp(paths: string[]): Promise<void> {
    const { error } = await supabase.storage.from('file_storage').remove(paths);
    if (error) throw error;
  },

  /**
   * Delete from perm/ folder in file_storage bucket
   */
  async deleteFromPerm(path: string): Promise<void> {
    const { error } = await supabase.storage.from('file_storage').remove([path]);
    if (error) throw error;
  },

  /**
   * List temp files for cleanup
   */
  async listTempBatches(): Promise<string[]> {
    const { session } = useAuthStore.getState();
    if (!session?.user) return [];

    const { data } = await supabase.storage
      .from('file_storage')
      .list(`temp/${session.user.id}`);

    return data?.map(item => item.name) || [];
  },

  /**
   * Generate signed URL for permanent file access
   */
  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from('file_storage')
      .createSignedUrl(path, expiresIn);

    if (error) throw error;

    return data.signedUrl;
  },

};
