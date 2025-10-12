/**
 * Jest Setup File for Livewire Drag and Drop Tests
 * 
 * This file sets up the testing environment by mocking necessary
 * browser APIs, Alpine.js, and Livewire functionality.
 */

import '@testing-library/jest-dom';

// Create Jest-like mock functions for ES modules environment
const createMockFunction = (implementation) => {
  const mockFn = implementation || function() {};
  
  const wrappedFn = function(...args) {
    wrappedFn.mock.calls.push(args);
    const result = mockFn.apply(this, args);
    wrappedFn.mock.results.push({ type: 'return', value: result });
    return result;
  };
  
  // Essential Jest mock properties
  wrappedFn.mock = {
    calls: [],
    results: [],
    instances: [],
    contexts: []
  };
  
  // Jest spy identifiers
  wrappedFn._isMockFunction = true;
  wrappedFn.getMockName = () => 'jest.fn()';
  
  wrappedFn.mockReturnValue = (value) => {
    mockFn.mockImplementation = () => value;
    return wrappedFn;
  };
  wrappedFn.mockImplementation = (impl) => {
    Object.assign(mockFn, impl);
    return wrappedFn;
  };
  wrappedFn.mockClear = () => {
    wrappedFn.mock.calls = [];
    wrappedFn.mock.results = [];
    wrappedFn.mock.instances = [];
    wrappedFn.mock.contexts = [];
    return wrappedFn;
  };
  wrappedFn.mockReset = () => {
    wrappedFn.mockClear();
    mockFn.mockImplementation = undefined;
    return wrappedFn;
  };
  wrappedFn.mockRestore = () => wrappedFn.mockReset();
  
  return wrappedFn;
};

// Make Jest-like functions available globally
global.jest = {
  fn: createMockFunction,
  spyOn: (object, method) => {
    const original = object[method];
    const mockFn = createMockFunction(original);
    object[method] = mockFn;
    mockFn.mockRestore = () => {
      object[method] = original;
    };
    return mockFn;
  }
};

// Mock Alpine.js
global.Alpine = {
  directive: function() {},
  nextTick: function(callback) {
    if (callback) callback();
    return Promise.resolve();
  },
  // Store for registered directives
  _directives: {},
  // Helper to get registered directive
  _getDirective: function(name) {
    return this._directives[name];
  }
};

// Mock Livewire
global.Livewire = {
  hook: function() {},
  _hooks: {},
  // Helper to trigger hooks in tests
  _triggerHook: function(hookName, ...args) {
    if (this._hooks[hookName]) {
      return this._hooks[hookName](...args);
    }
  }
};

// Mock DataTransfer API
global.DataTransfer = class DataTransfer {
  constructor() {
    this.data = {};
    this.effectAllowed = 'none';
    this.dropEffect = 'none';
  }
  
  setData(format, data) {
    this.data[format] = data;
  }
  
  getData(format) {
    return this.data[format] || '';
  }
  
  clearData(format) {
    if (format) {
      delete this.data[format];
    } else {
      this.data = {};
    }
  }
};

// Mock drag and drop events
const createMockDragEvent = (type, options = {}) => {
  const event = new Event(type, { bubbles: true, cancelable: true, ...options });
  event.dataTransfer = new DataTransfer();
  event.clientX = options.clientX || 0;
  event.clientY = options.clientY || 0;
  return event;
};

// Add helper methods to global for creating mock events
global.createMockDragEvent = createMockDragEvent;

global.createMockKeyboardEvent = (type, key, options = {}) => {
  const event = new KeyboardEvent(type, { 
    key, 
    bubbles: true, 
    cancelable: true, 
    ...options 
  });
  return event;
};

// Helper function for proper keyboard event simulation with the new architecture
global.simulateKeyboardEvent = (element, key) => {
  // Set the element as the active element (required by new architecture)
  Object.defineProperty(document, 'activeElement', {
    value: element,
    writable: true,
    configurable: true
  });
  
  // Also call focus on the element to ensure proper state
  element.focus();
  
  // Create event that will bubble to document.body
  const event = new KeyboardEvent('keydown', { 
    key, 
    bubbles: true, 
    cancelable: true
  });
  
  // Set target property manually since it's readonly in real events
  Object.defineProperty(event, 'target', {
    value: element,
    configurable: true
  });
  
  // Dispatch on document.body where the global listener is attached
  document.body.dispatchEvent(event);
  
  return event;
};

// Mock getBoundingClientRect
Element.prototype.getBoundingClientRect = function() {
  return {
    top: 0,
    left: 0,
    bottom: 100,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: 0
  };
};

// Mock insertBefore with more realistic behavior
const originalInsertBefore = Node.prototype.insertBefore;
Node.prototype.insertBefore = function(newNode, referenceNode) {
  // Remove from current parent if it exists
  if (newNode.parentNode) {
    newNode.parentNode.removeChild(newNode);
  }
  return originalInsertBefore.call(this, newNode, referenceNode);
};

// Mock focus method
HTMLElement.prototype.focus = function() {};

// Setup DOM
document.body.innerHTML = '';

// Helper to clean up after each test
afterEach(() => {
  // Clear the document body completely - this will reset the global ARIA live region
  document.body.innerHTML = '';
  
  // Clear recentlyMovedKeys by triggering message.processed hook if it exists
  if (global.Livewire._hooks['message.processed']) {
    global.Livewire._hooks['message.processed']({}, {});
  }
  
  // Clear stored directives and hooks
  global.Alpine._directives = {};
  global.Livewire._hooks = {};
});