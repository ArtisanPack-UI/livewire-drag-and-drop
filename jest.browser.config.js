/**
 * Jest configuration for the real-browser (Puppeteer) keyboard tests.
 */

export default {
    testEnvironment: 'node',
    transform: {},
    testMatch: ['<rootDir>/tests/browser/**/*.browser.test.js'],
    testTimeout: 30000,
    verbose: true,
};
