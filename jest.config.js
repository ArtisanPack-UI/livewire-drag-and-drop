/**
 * Jest configuration for Livewire Drag and Drop tests
 * 
 * This configuration sets up Jest to run tests in a JSDOM environment
 * with proper ES modules support and coverage reporting.
 */

export default {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Inject Jest globals for ES modules
  injectGlobals: true,
  
  // Module transformation
  transform: {},
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  
  // Coverage thresholds (temporarily lowered for initial testing)
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10
    }
  },
  
  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true
};