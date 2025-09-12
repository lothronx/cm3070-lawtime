import { useAuthStore } from '../useAuthStore';
import { supabase } from '@/utils/supabase';
import { Session } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@/utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      setSession: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: null }, error: null })),
    },
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useAuthStore', () => {
  const mockSession: Session = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
    expires_in: 3600,
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      phone: '+8613811111111',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2025-08-30T10:00:00Z',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useAuthStore.setState({ session: null, isAuthenticated: false, isLoading: true });
  });

  describe('Initial State', () => {
    it('should have null session and true loading by default', () => {
      const state = useAuthStore.getState();

      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(true);
    });
  });

  describe('setSession', () => {
    beforeEach(() => {
      mockSupabase.auth.setSession.mockResolvedValue({ data: { session: null }, error: null });
    });

    it('should set session when provided', async () => {
      const { setSession } = useAuthStore.getState();

      await setSession(mockSession);

      const state = useAuthStore.getState();
      expect(state.session).toEqual(mockSession);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(mockSupabase.auth.setSession).toHaveBeenCalledWith({
        access_token: mockSession.access_token,
        refresh_token: mockSession.refresh_token,
      });
    });
  });

  describe('checkSession', () => {
    it('should set loading true during check and set valid session', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const { checkSession } = useAuthStore.getState();

      const promise = checkSession();

      // Check loading state during execution
      expect(useAuthStore.getState().isLoading).toBe(true);

      await promise;

      expect(useAuthStore.getState().session).toEqual(mockSession);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1);
    });

    it('should clear session when no session exists', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const { checkSession } = useAuthStore.getState();

      await checkSession();

      expect(useAuthStore.getState().session).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should clear session when error occurs', async () => {
      const mockError = new Error('Session check failed');
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: mockError,
      });

      const { checkSession } = useAuthStore.getState();

      await checkSession();

      expect(useAuthStore.getState().session).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      mockSupabase.auth.getSession.mockRejectedValueOnce(new Error('Network error'));

      const { checkSession } = useAuthStore.getState();

      await checkSession();

      expect(useAuthStore.getState().session).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
    });

    it('should clear session from store', async () => {
      // First set a session
      useAuthStore.setState({
        session: mockSession,
        isAuthenticated: true,
        isLoading: false
      });

      const { logout } = useAuthStore.getState();
      await logout();

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
    });

    it('should handle signOut errors gracefully', async () => {
      mockSupabase.auth.signOut.mockRejectedValueOnce(new Error('SignOut failed'));

      useAuthStore.setState({
        session: mockSession,
        isAuthenticated: true,
        isLoading: false
      });

      const { logout } = useAuthStore.getState();
      await logout();

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('Store Integration', () => {
    beforeEach(() => {
      mockSupabase.auth.setSession.mockResolvedValue({ data: { session: null }, error: null });
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
    });

    it('should maintain state consistency across multiple operations', async () => {
      const { setSession, checkSession, logout } = useAuthStore.getState();

      // Start with no session
      expect(useAuthStore.getState().session).toBeNull();

      // Set session manually
      await setSession(mockSession);
      expect(useAuthStore.getState().session).toEqual(mockSession);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Mock checkSession to return the same session
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      // Check session
      await checkSession();
      expect(useAuthStore.getState().session).toEqual(mockSession);

      // Logout
      await logout();
      expect(useAuthStore.getState().session).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should handle concurrent checkSession calls', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { checkSession } = useAuthStore.getState();

      // Call checkSession multiple times concurrently
      const promises = [
        checkSession(),
        checkSession(),
        checkSession(),
      ];

      await Promise.all(promises);

      expect(useAuthStore.getState().session).toEqual(mockSession);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });
});