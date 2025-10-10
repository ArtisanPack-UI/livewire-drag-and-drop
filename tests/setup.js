/**
 * Jest test setup file
 * 
 * This file runs before all tests and sets up the testing environment
 * including Alpine.js mocking, jest-axe for accessibility testing,
 * and common utilities for drag and drop testing.
 */

import { jest } from '@jest/globals';
import jestAxe from 'jest-axe';
const { toHaveNoViolations } = jestAxe;

// Extend Jest matchers with jest-axe
expect.extend(toHaveNoViolations);

// Global test utilities
global.testUtils = {
  /**
   * Creates a mock Alpine.js instance for testing
   */
  createMockAlpine() {
    const directives = new Map();
    
    return {
      directive: jest.fn((name, handler) => {
        directives.set(name, handler);
      }),
      nextTick: jest.fn((callback) => {
        // Execute callback immediately for synchronous testing
        if (callback) callback();
        return Promise.resolve();
      }),
      // Helper to get registered directives for testing
      _getDirectives: () => directives
    };
  },

  /**
   * Creates a DOM element with drag context
   */
  createDragContext(items = ['Item 1', 'Item 2', 'Item 3']) {
    const container = document.createElement('div');
    container.setAttribute('x-drag-context', '');
    
    items.forEach((item, index) => {
      const itemElement = document.createElement('div');
      itemElement.setAttribute('x-drag-item', JSON.stringify({ id: index + 1, text: item }));
      itemElement.textContent = item;
      container.appendChild(itemElement);
    });
    
    document.body.appendChild(container);
    return container;
  },

  /**
   * Creates custom events for testing drag and drop
   */
  createDragEvent(type, options = {}) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    event.dataTransfer = {
      effectAllowed: 'move',
      dropEffect: 'move',
      setData: jest.fn(),
      getData: jest.fn(),
      clearData: jest.fn(),
      types: [],
      files: [],
      items: []
    };
    
    // Add additional properties
    Object.assign(event, options);
    
    return event;
  },

  /**
   * Creates keyboard events for testing
   */
  createKeyboardEvent(type, key, options = {}) {
    return new KeyboardEvent(type, {
      key,
      bubbles: true,
      cancelable: true,
      ...options
    });
  },

  /**
   * Waits for DOM mutations to complete
   */
  async waitForDOMUpdate() {
    await new Promise(resolve => setTimeout(resolve, 0));
  },

  /**
   * Cleans up the DOM after tests
   */
  cleanupDOM() {
    document.body.innerHTML = '';
    // Remove any global aria-live regions that might have been created
    const ariaLiveRegions = document.querySelectorAll('[aria-live]');
    ariaLiveRegions.forEach(region => region.remove());
    
    // Remove drag instructions
    const instructions = document.getElementById('drag-instructions');
    if (instructions) {
      instructions.remove();
    }
    
    // Reset global aria-live region variable in the source code
    // This is needed because the global variable persists between tests
    if (typeof window !== 'undefined' && window.globalAriaLiveRegion) {
      window.globalAriaLiveRegion = null;
    }
  },

  /**
   * Simulates a complete drag and drop operation
   */
  async simulateDragAndDrop(sourceElement, targetElement) {
    const dragStartEvent = this.createDragEvent('dragstart');
    const dragOverEvent = this.createDragEvent('dragover');
    const dropEvent = this.createDragEvent('drop');

    sourceElement.dispatchEvent(dragStartEvent);
    targetElement.dispatchEvent(dragOverEvent);
    targetElement.dispatchEvent(dropEvent);

    await this.waitForDOMUpdate();
  },

  /**
   * Simulates keyboard navigation
   */
  async simulateKeyboardNavigation(element, keys) {
    for (const key of keys) {
      const keydownEvent = this.createKeyboardEvent('keydown', key);
      element.dispatchEvent(keydownEvent);
      await this.waitForDOMUpdate();
    }
  }
};

// Setup JSDOM environment enhancements
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() { return null; }
  disconnect() { return null; }
  unobserve() { return null; }
};

// Clean up after each test
afterEach(() => {
  global.testUtils.cleanupDOM();
  jest.clearAllMocks();
});

// Global test timeout for async operations
jest.setTimeout(10000);
