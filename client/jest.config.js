module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
  ],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { envName: 'test' }],
  },
  collectCoverageFrom: [
    'services/**/*.{ts,tsx}',
    '!**/__tests__/**',
    '!**/node_modules/**',
    '!**/*.d.ts',
  ],
  coverageReporters: ['html', 'text', 'text-summary'],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|ts|tsx)',
    '**/*.(test|spec).(js|ts|tsx)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@env$': '<rootDir>/__mocks__/env.js',
  },
  clearMocks: true,
  resetMocks: true,
  globals: {
    '__DEV__': true,
  },
};