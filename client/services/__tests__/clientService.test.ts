import { clientService } from '../clientService';
import { supabase } from '@/utils/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { DbClient } from '@/types';

// Mock the supabase client
jest.mock('@/utils/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

// Mock auth store
jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

const mockUseAuthStore = useAuthStore.getState as jest.MockedFunction<typeof useAuthStore.getState>;

describe('clientService', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2025-08-30T10:00:00Z',
  };

  const mockSession = {
    user: mockUser,
    access_token: 'mock-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
  };

  const mockClients: DbClient[] = [
    {
      id: 1,
      user_id: 'test-user-id',
      client_name: 'ACME Corporation',
      created_at: '2025-08-30T10:00:00Z',
    },
    {
      id: 2,
      user_id: 'test-user-id',
      client_name: 'Beta LLC',
      created_at: '2025-08-30T11:00:00Z',
    },
    {
      id: 3,
      user_id: 'test-user-id',
      client_name: 'Smith & Associates',
      created_at: '2025-08-30T12:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getClients', () => {
    it('should fetch clients successfully with proper ordering', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockClients,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await clientService.getClients();

      expect(supabase.from).toHaveBeenCalledWith('clients');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('client_name', { ascending: true });
      expect(result).toEqual(mockClients);
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no clients exist', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await clientService.getClients();

      expect(result).toEqual([]);
    });

    it('should return empty array when data is undefined', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: undefined,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await clientService.getClients();

      expect(result).toEqual([]);
    });

    it('should throw error when database query fails', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      await expect(clientService.getClients()).rejects.toThrow(
        'Failed to fetch clients: Database connection failed'
      );
    });

    it('should handle RLS automatically filtering by authenticated user', async () => {
      // RLS ensures only user's clients are returned automatically
      const userSpecificClients = mockClients.filter(c => c.user_id === 'test-user-id');
      
      const mockOrder = jest.fn().mockResolvedValue({
        data: userSpecificClients,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const result = await clientService.getClients();

      expect(result).toEqual(userSpecificClients);
      expect(result.every(client => client.user_id === 'test-user-id')).toBe(true);
    });

    it('should handle database timeout errors', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Query timeout' },
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      await expect(clientService.getClients()).rejects.toThrow(
        'Failed to fetch clients: Query timeout'
      );
    });
  });

  describe('createClient', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        session: mockSession,
        isAuthenticated: true,
        isLoading: false,
        setSession: jest.fn(),
        checkSession: jest.fn(),
        logout: jest.fn(),
      });
    });

    it('should create client successfully', async () => {
      const clientName = 'New Client Corp';
      const newClient: DbClient = {
        id: 4,
        user_id: 'test-user-id',
        client_name: clientName,
        created_at: '2025-08-30T13:00:00Z',
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: newClient,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const result = await clientService.createClient(clientName);

      expect(supabase.from).toHaveBeenCalledWith('clients');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        client_name: clientName,
      });
      expect(mockSelect).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(newClient);
    });

    it('should trim client name before creating', async () => {
      const clientNameWithSpaces = '  Trimmed Client Corp  ';
      const trimmedName = 'Trimmed Client Corp';
      
      const newClient: DbClient = {
        id: 5,
        user_id: 'test-user-id',
        client_name: trimmedName,
        created_at: '2025-08-30T13:00:00Z',
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: newClient,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const result = await clientService.createClient(clientNameWithSpaces);

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        client_name: trimmedName,
      });
      expect(result.client_name).toBe(trimmedName);
    });

    it('should throw error for empty client name', async () => {
      await expect(clientService.createClient('')).rejects.toThrow(
        'Client name cannot be empty'
      );
      
      await expect(clientService.createClient('   ')).rejects.toThrow(
        'Client name cannot be empty'
      );
      
      await expect(clientService.createClient('\t\n')).rejects.toThrow(
        'Client name cannot be empty'
      );

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should throw error when user is not authenticated', async () => {
      mockUseAuthStore.mockReturnValue({
        session: null,
        isAuthenticated: false,
        isLoading: false,
        setSession: jest.fn(),
        checkSession: jest.fn(),
        logout: jest.fn(),
      });

      await expect(clientService.createClient('Test Client')).rejects.toThrow(
        'Authentication required. Please log in again.'
      );

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should throw error when session has no user', async () => {
      mockUseAuthStore.mockReturnValue({
        session: { user: null } as any,
        isAuthenticated: false,
        isLoading: false,
        setSession: jest.fn(),
        checkSession: jest.fn(),
        logout: jest.fn(),
      });

      await expect(clientService.createClient('Test Client')).rejects.toThrow(
        'Authentication required. Please log in again.'
      );
    });

    it('should throw error when database insert fails', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Unique constraint violation' },
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      await expect(clientService.createClient('Duplicate Client')).rejects.toThrow(
        'Failed to create client: Unique constraint violation'
      );
    });

    it('should handle duplicate client name error', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { 
          message: 'duplicate key value violates unique constraint "clients_user_id_client_name_key"',
          code: '23505',
        },
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      await expect(clientService.createClient('Existing Client')).rejects.toThrow(
        'Failed to create client: duplicate key value violates unique constraint "clients_user_id_client_name_key"'
      );
    });

    it('should handle special characters in client name', async () => {
      const specialClientName = 'Smith & Associates (法律事務所) - 北京';
      
      const newClient: DbClient = {
        id: 6,
        user_id: 'test-user-id',
        client_name: specialClientName,
        created_at: '2025-08-30T13:00:00Z',
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: newClient,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const result = await clientService.createClient(specialClientName);

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        client_name: specialClientName,
      });
      expect(result.client_name).toBe(specialClientName);
    });

    it('should handle very long client names', async () => {
      const longClientName = 'A'.repeat(255); // Assuming max length is 255
      
      const newClient: DbClient = {
        id: 7,
        user_id: 'test-user-id',
        client_name: longClientName,
        created_at: '2025-08-30T13:00:00Z',
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: newClient,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const result = await clientService.createClient(longClientName);

      expect(result.client_name).toBe(longClientName);
    });
  });
});