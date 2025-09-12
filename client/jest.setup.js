// Mock global fetch for testing
global.fetch = jest.fn();

// Suppress console output during tests for cleaner test output
global.console = {
  ...console,
  log: jest.fn(), // Mock console.log to suppress output
  error: jest.fn(), // Mock console.error to suppress output
  warn: jest.fn(), // Mock console.warn to suppress output
  info: jest.fn(), // Mock console.info to suppress output
};

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