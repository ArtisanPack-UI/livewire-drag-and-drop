# Testing Documentation

## Overview

This package includes comprehensive automated tests that cover both functionality and accessibility compliance. The test suite is designed to run in command-line environments and CI/CD pipelines like GitLab or GitHub Actions.

## Test Coverage

### 🧪 Functionality Tests

**Core Tests** (`tests/core.test.js`)
- Alpine.js directive registration and initialization
- Drag context setup and state management
- Drag item configuration and ARIA attributes
- Global ARIA live region management
- Event listener setup and cleanup functions

**Drag Operations Tests** (`tests/drag-operations.test.js`)
- Mouse drag and drop operations
- DOM manipulation during drag operations
- DataTransfer API integration
- Custom event dispatching (drag:end)
- Focus management and visual indicators
- Error handling and edge cases

**Keyboard Navigation Tests** (`tests/keyboard-navigation.test.js`)
- Space/Enter key grab and drop functionality
- Arrow key navigation in all directions
- Escape key cancellation
- Complex keyboard workflows
- Keyboard accessibility standards compliance
- ARIA attribute management during keyboard interactions

**Livewire Integration Tests** (`tests/livewire-integration.test.js`)
- Custom event dispatch with correct details
- Expression evaluation for both context and items
- Data transfer and serialization
- Multiple context handling
- Complex data structure support
- Error handling for malformed expressions

### ♿ Accessibility Tests

**WCAG Compliance Tests** (`tests/accessibility.test.js`)
- Automated axe-core accessibility testing
- ARIA attributes validation
- Screen reader support verification
- Focus management testing
- Keyboard navigation compliance
- Semantic structure validation
- Dynamic content accessibility
- Error state accessibility

## Running Tests

### Local Development

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run only accessibility tests
npm run test:accessibility

# Run tests for CI environment
npm run test:ci
```

### Test Scripts Explained

- **`npm test`**: Runs all tests with ES modules support using `--experimental-vm-modules`
- **`npm run test:watch`**: Runs tests in watch mode for development
- **`npm run test:coverage`**: Generates detailed coverage reports in multiple formats
- **`npm run test:ci`**: Optimized for CI environments with coverage and no watch mode
- **`npm run test:accessibility`**: Runs only accessibility-focused tests

## Coverage Requirements

The test suite maintains high coverage standards:

- **Statements**: 80% minimum
- **Branches**: 80% minimum  
- **Functions**: 80% minimum
- **Lines**: 80% minimum

Coverage reports are generated in multiple formats:
- **Text**: Console output during test runs
- **LCOV**: For integration with coverage tools
- **HTML**: Detailed browseable reports in `coverage/` directory

## CI/CD Pipeline

### GitHub Actions Workflow

The `.github/workflows/test.yml` provides comprehensive automated testing:

**Main Test Job**
- Tests across Node.js versions (18.x, 20.x, 22.x)
- Separate functionality and accessibility test runs
- Coverage report generation and upload to Codecov

**Accessibility Audit Job**
- Dedicated accessibility testing with detailed reporting
- Archives test results as artifacts
- Verbose output for accessibility compliance verification

**Build Integration Job**
- Tests the built package (both UMD and ES module formats)
- Validates exports and package integrity
- Ensures distribution files are properly generated

**Cross-Platform Testing**
- Tests on Ubuntu, Windows, and macOS
- Validates core functionality across operating systems
- Uses Node.js 20.x for consistent testing

**Performance Testing**
- Monitors package load time performance
- Ensures package loads within acceptable limits (<100ms)
- Installs additional performance profiling tools

**Security Audit**
- Runs npm security audit
- Checks for high and critical vulnerabilities
- Fails build if security issues are found

### GitLab CI Integration

For GitLab pipelines, use these job configurations:

```yaml
test:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm run test:ci
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/

accessibility:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm run test:accessibility -- --verbose
  artifacts:
    when: always
    paths:
      - coverage/
    reports:
      junit: coverage/accessibility-results.xml
```

## Test Environment

### Dependencies

**Core Testing Framework**
- **Jest**: Test runner with ES modules support
- **JSDOM**: DOM environment for browser API simulation

**Testing Utilities**
- **@testing-library/dom**: DOM testing utilities
- **@testing-library/user-event**: User interaction simulation
- **jest-axe**: Accessibility testing with axe-core integration

**Browser Simulation**
- **Puppeteer**: Headless Chrome for integration testing (installed in CI)

### Configuration

**Jest Configuration** (`jest.config.js`)
- JSDOM test environment for browser API simulation
- ES modules support for modern JavaScript
- Comprehensive coverage collection and thresholds
- Custom test patterns and setup files

**Test Setup** (`tests/setup.js`)
- Global test utilities and helper functions
- Mock Alpine.js instance for directive testing
- DOM manipulation and cleanup utilities
- Accessibility testing setup with jest-axe
- Event simulation helpers for drag and drop operations

## Writing New Tests

### Test Structure

```javascript
import { jest } from '@jest/globals';
import LivewireDragAndDrop from '../src/index.js';

describe('Feature Name', () => {
  let mockAlpine;
  let dragContext;
  let dragItems;

  beforeEach(() => {
    mockAlpine = global.testUtils.createMockAlpine();
    LivewireDragAndDrop(mockAlpine);
    
    dragContext = global.testUtils.createDragContext(['Item 1', 'Item 2']);
    // Initialize your test setup
  });

  test('should do something specific', async () => {
    // Your test implementation
  });
});
```

### Available Test Utilities

**Mock Creation**
- `global.testUtils.createMockAlpine()`: Creates Alpine.js mock instance
- `global.testUtils.createDragContext(items)`: Creates DOM drag context

**Event Simulation**
- `global.testUtils.createDragEvent(type, options)`: Creates drag events
- `global.testUtils.createKeyboardEvent(type, key, options)`: Creates keyboard events
- `global.testUtils.simulateDragAndDrop(source, target)`: Complete drag operation
- `global.testUtils.simulateKeyboardNavigation(element, keys)`: Keyboard sequences

**DOM Management**
- `global.testUtils.waitForDOMUpdate()`: Waits for async DOM changes
- `global.testUtils.cleanupDOM()`: Cleans up after tests

## Accessibility Testing

### Automated WCAG Compliance

The test suite uses `jest-axe` for automated accessibility testing:

```javascript
import jestAxe from 'jest-axe';
const { axe } = jestAxe;

test('should have no accessibility violations', async () => {
  const results = await axe(element);
  expect(results).toHaveNoViolations();
});
```

### Manual Accessibility Verification

Tests also verify specific accessibility features:
- ARIA attribute management
- Screen reader announcements
- Keyboard navigation support
- Focus management
- Semantic structure

## Performance Considerations

- Tests run with ES modules using `--experimental-vm-modules`
- Test isolation through proper cleanup functions
- Optimized for CI environments with appropriate timeouts
- Coverage collection focused on source files only

## Troubleshooting

### Common Issues

**ES Module Import Errors**
- Ensure Node.js version supports `--experimental-vm-modules`
- Check that package.json has `"type": "module"`

**JSDOM Environment Issues**
- Verify browser APIs are properly mocked in test setup
- Check that DOM cleanup occurs between tests

**Coverage Threshold Failures**
- Review uncovered code paths in coverage reports
- Add tests for missing branches and edge cases

**Accessibility Test Failures**
- Use `axe` with specific rule configurations
- Check ARIA attributes and semantic structure
- Verify keyboard navigation implementation

### Getting Help

1. Check the test output for specific error messages
2. Review the coverage report for missing test areas
3. Run tests with `--verbose` flag for detailed output
4. Use `--testNamePattern` to run specific tests for debugging

## Continuous Improvement

The test suite is designed to evolve with the package:

- Add new tests when adding features
- Update accessibility tests for new WCAG guidelines
- Enhance coverage for edge cases and error conditions
- Optimize performance for large test suites

This comprehensive testing approach ensures the package maintains high quality, accessibility compliance, and reliability across different environments and use cases.