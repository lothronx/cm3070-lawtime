import { createClient } from '@supabase/supabase-js';
// eslint-disable-next-line import/no-unresolved
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
import AuthService from './authService';

export interface UserProfile {
  id: string;
  status: 'active' | 'deleted';
  default_alert_offset_minutes: number;
  updated_at: string;
}

export interface UpdateProfileData {
  default_alert_offset_minutes?: number;
  status?: 'active' | 'deleted';
}

class ProfileService {
  private static instance: ProfileService;
  private authService: AuthService;

  private constructor() {
    this.authService = AuthService.getInstance();
  }

  public static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  /**
   * Create authenticated Supabase client with current JWT token
   * Automatically refreshes token if expired
   */
  private async getAuthenticatedClient() {
    const session = await this.authService.getValidSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    if (!session.user?.id) {
      await this.authService.clearSession();
      throw new Error('Invalid session - please log in again');
    }

    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { error } = await client.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
    
    if (error) {
      throw new Error(`Failed to authenticate with Supabase: ${error.message}`);
    }
    
    return { client, userId: session.user.id };
  }

  /**
   * Get the current user's profile
   * @returns Promise with profile data or null if not found
   */
  async getProfile(): Promise<{ data: UserProfile | null; error: string | null }> {
    try {
      const { client, userId } = await this.getAuthenticatedClient();

      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('No rows')) {
          return { data: null, error: 'Profile not found' };
        }
        return { data: null, error: `Database error: ${error.message}` };
      }

      return { data, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { data: null, error: `Authentication or network error: ${errorMessage}` };
    }
  }

  /**
   * Update the current user's profile
   * @param updates Profile data to update
   * @returns Promise with updated profile data
   */
  async updateProfile(updates: UpdateProfileData): Promise<{ data: UserProfile | null; error: string | null }> {
    try {
      const { client, userId } = await this.getAuthenticatedClient();

      const { data, error } = await client
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Profile update error:', error);
      return { data: null, error: 'User not authenticated' };
    }
  }

  /**
   * Create a profile for the current user (usually handled by database trigger)
   * @returns Promise with created profile data
   */
  async createProfile(): Promise<{ data: UserProfile | null; error: string | null }> {
    try {
      const { client, userId } = await this.getAuthenticatedClient();

      const { data, error } = await client
        .from('profiles')
        .insert({
          id: userId
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: `Database error: ${error.message}` };
      }

      return { data, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { data: null, error: `Authentication or network error: ${errorMessage}` };
    }
  }

  /**
   * Get profile or create if it doesn't exist
   * The database trigger should automatically create profiles for new users,
   * but we include a fallback creation just in case
   * @returns Promise with profile data
   */
  async getOrCreateProfile(): Promise<{ data: UserProfile | null; error: string | null }> {
    try {
      // First try to get existing profile
      const profileResult = await this.getProfile();

      if (profileResult.data) {
        return profileResult;
      }

      // If there's an error other than "not found", return it
      if (profileResult.error && !profileResult.error.includes('not found') && !profileResult.error.includes('No rows')) {
        return profileResult;
      }

      // Profile doesn't exist, create it as fallback
      // This should normally be handled by database trigger, but fallback just in case
      return await this.createProfile();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { data: null, error: `Failed to get or create profile: ${errorMessage}` };
    }
  }
}

export default ProfileService;