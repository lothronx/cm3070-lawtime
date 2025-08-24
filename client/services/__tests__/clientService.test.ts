import { clientService } from '../clientService';
import { supabase } from '../../utils/supabase';
import { DbClient } from '../../types';

// Mock the supabase client
jest.mock('../../utils/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        ilike: jest.fn(() => ({
          limit: jest.fn(() => ({
            maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

describe('clientService', () => {
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
      client_name: 'Smith & Associates',
      created_at: '2025-08-30T11:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getClients', () => {
    it('should fetch clients successfully', async () => {
      // Mock successful query
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockClients,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      // Execute the test
      const result = await clientService.getClients();

      // Verify the result
      expect(result).toEqual(mockClients);

      // Verify the service called the correct methods
      expect(supabase.from).toHaveBeenCalledWith('clients');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('client_name', { ascending: true });
    });

    it('should return empty array when no clients exist', async () => {
      // Mock empty result
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

    it('should throw error when database query fails', async () => {
      // Mock failed query
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Database connection failed'),
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      await expect(clientService.getClients()).rejects.toThrow('Failed to fetch clients: Database connection failed');
    });
  });

  describe('createClient', () => {
    it('should create client successfully', async () => {
      const clientName = 'New Client Corp';
      const newClient: DbClient = {
        id: 3,
        user_id: 'test-user-id',
        client_name: clientName,
        created_at: '2025-08-30T12:00:00Z',
      };

      // Mock successful creation
      const mockSingle = jest.fn().mockResolvedValue({
        data: newClient,
        error: null,
      });

      const mockSelectAfterInsert = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelectAfterInsert,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      // Execute the test
      const result = await clientService.createClient(clientName);

      // Verify the result
      expect(result).toEqual(newClient);

      // Verify the service called the correct methods
      expect(supabase.from).toHaveBeenCalledWith('clients');
      expect(mockInsert).toHaveBeenCalledWith({
        client_name: clientName,
      });
      expect(mockSelectAfterInsert).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();
    });

    it('should trim client name before creating', async () => {
      const clientName = '  Trimmed Client  ';
      const trimmedName = 'Trimmed Client';
      
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: 4, user_id: 'test-user-id', client_name: trimmedName, created_at: '2025-08-30T12:00:00Z' },
        error: null,
      });

      const mockSelectAfterInsert = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelectAfterInsert,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      await clientService.createClient(clientName);

      // Verify the insert was called with trimmed name
      expect(mockInsert).toHaveBeenCalledWith({
        client_name: trimmedName,
      });
    });

    it('should throw error for empty client name', async () => {
      await expect(clientService.createClient('')).rejects.toThrow('Client name cannot be empty');
      await expect(clientService.createClient('   ')).rejects.toThrow('Client name cannot be empty');
    });

    it('should throw error when database insert fails', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Unique constraint violation'),
      });

      const mockSelectAfterInsert = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelectAfterInsert,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      await expect(clientService.createClient('Duplicate Client')).rejects.toThrow('Failed to create client: Unique constraint violation');
    });
  });
});