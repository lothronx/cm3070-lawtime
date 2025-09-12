// Mock global fetch for testing
global.fetch = jest.fn();

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Environment variables are mocked via moduleNameMapper in jest.config.js

// Mock Supabase for tests that don't need real auth
jest.mock('@/utils/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));