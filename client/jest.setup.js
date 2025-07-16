// Mock global fetch for testing
global.fetch = jest.fn();

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock environment variables  
jest.mock('@env', () => ({
  API_BASE_URL: 'https://test.api.com',
}));