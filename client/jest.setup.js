// Mock global fetch for testing (only for service tests)
global.fetch = jest.fn();

// Mock expo-secure-store (only needed for service tests)
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock environment variables
jest.mock('@env', () => ({
  API_BASE_URL: 'https://test.api.com',
}));

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