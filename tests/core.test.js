/**
 * Core functionality tests for Livewire Drag and Drop
 * 
 * Tests the basic Alpine.js directive registration, initialization,
 * and core drag and drop functionality.
 */

import { jest } from '@jest/globals';
import LivewireDragAndDrop from '../src/index.js';

describe('LivewireDragAndDrop Core Functionality', () => {
  let mockAlpine;

  beforeEach(() => {
    mockAlpine = global.testUtils.createMockAlpine();
  });

  describe('Initialization', () => {
    test('should export a function', () => {
      expect(typeof LivewireDragAndDrop).toBe('function');
    });

    test('should register drag-context directive', () => {
      LivewireDragAndDrop(mockAlpine);
      
      expect(mockAlpine.directive).toHaveBeenCalledWith('drag-context', expect.any(Function));
      
      const directives = mockAlpine._getDirectives();
      expect(directives.has('drag-context')).toBe(true);
    });

    test('should register drag-item directive', () => {
      LivewireDragAndDrop(mockAlpine);
      
      expect(mockAlpine.directive).toHaveBeenCalledWith('drag-item', expect.any(Function));
      
      const directives = mockAlpine._getDirectives();
      expect(directives.has('drag-item')).toBe(true);
    });

    test('should register both directives when called once', () => {
      LivewireDragAndDrop(mockAlpine);
      
      expect(mockAlpine.directive).toHaveBeenCalledTimes(2);
    });
  });

  describe('Drag Context Directive', () => {
    let dragContextHandler;
    let mockElement;
    let mockDirective;
    let mockAlpineUtils;

    beforeEach(() => {
      LivewireDragAndDrop(mockAlpine);
      const directives = mockAlpine._getDirectives();
      dragContextHandler = directives.get('drag-context');
      
      mockElement = document.createElement('div');
      mockDirective = { expression: 'console.log($event)' };
      mockAlpineUtils = {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => jest.fn())
      };
    });

    test('should set proper ARIA attributes on context element', () => {
      dragContextHandler(mockElement, mockDirective, mockAlpineUtils);
      
      expect(mockElement.getAttribute('role')).toBe('application');
      expect(mockElement.getAttribute('aria-label')).toBe('Drag and drop interface');
    });

    test('should create drag state object', () => {
      dragContextHandler(mockElement, mockDirective, mockAlpineUtils);
      
      expect(mockElement._dragContext).toBeDefined();
      expect(mockElement._dragContext).toEqual({
        isDragging: false,
        draggedElement: null,
        dropZones: [],
        draggedData: null
      });
    });

    test('should create announce function', () => {
      dragContextHandler(mockElement, mockDirective, mockAlpineUtils);
      
      expect(mockElement._announce).toBeDefined();
      expect(typeof mockElement._announce).toBe('function');
    });

    test('should create finalizeDrop function', () => {
      dragContextHandler(mockElement, mockDirective, mockAlpineUtils);
      
      expect(mockElement._finalizeDrop).toBeDefined();
      expect(typeof mockElement._finalizeDrop).toBe('function');
    });

    test('should add event listeners', () => {
      const addEventListenerSpy = jest.spyOn(mockElement, 'addEventListener');
      
      dragContextHandler(mockElement, mockDirective, mockAlpineUtils);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('dragover', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('drop', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    test('should return cleanup function', () => {
      const cleanup = dragContextHandler(mockElement, mockDirective, mockAlpineUtils);
      
      expect(typeof cleanup).toBe('function');
    });

    test('cleanup function should remove event listeners', () => {
      const removeEventListenerSpy = jest.spyOn(mockElement, 'removeEventListener');
      const cleanup = dragContextHandler(mockElement, mockDirective, mockAlpineUtils);
      
      cleanup();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('dragover', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('drop', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  describe('Drag Item Directive', () => {
    let dragItemHandler;
    let dragContextElement;
    let mockItemElement;
    let mockDirective;
    let mockAlpineUtils;

    beforeEach(() => {
      LivewireDragAndDrop(mockAlpine);
      const directives = mockAlpine._getDirectives();
      dragItemHandler = directives.get('drag-item');
      
      // Create a drag context first
      dragContextElement = global.testUtils.createDragContext();
      const dragContextHandler = directives.get('drag-context');
      dragContextHandler(dragContextElement, { expression: '' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => jest.fn())
      });
      
      mockItemElement = dragContextElement.children[0];
      mockDirective = { expression: '{ id: 1, text: "Test Item" }' };
      mockAlpineUtils = {
        evaluate: jest.fn(() => ({ id: 1, text: "Test Item" }))
      };
    });

    test('should make element draggable', () => {
      return mockAlpine.nextTick(() => {
        dragItemHandler(mockItemElement, mockDirective, mockAlpineUtils);
        
        return mockAlpine.nextTick(() => {
          expect(mockItemElement.draggable).toBe(true);
        });
      });
    });

    test('should set tabIndex to 0', () => {
      return mockAlpine.nextTick(() => {
        dragItemHandler(mockItemElement, mockDirective, mockAlpineUtils);
        
        return mockAlpine.nextTick(() => {
          expect(mockItemElement.tabIndex).toBe(0);
        });
      });
    });

    test('should set proper ARIA attributes', () => {
      return mockAlpine.nextTick(() => {
        dragItemHandler(mockItemElement, mockDirective, mockAlpineUtils);
        
        return mockAlpine.nextTick(() => {
          expect(mockItemElement.getAttribute('role')).toBe('button');
          expect(mockItemElement.getAttribute('aria-grabbed')).toBe('false');
          expect(mockItemElement.getAttribute('aria-describedby')).toBe('drag-instructions');
        });
      });
    });

    test('should create drag instructions element if it doesn\'t exist', () => {
      return mockAlpine.nextTick(() => {
        dragItemHandler(mockItemElement, mockDirective, mockAlpineUtils);
        
        return mockAlpine.nextTick(() => {
          const instructions = document.getElementById('drag-instructions');
          expect(instructions).not.toBeNull();
          expect(instructions.textContent).toBe('Press space or enter to grab, arrow keys to move, space or enter to drop, escape to cancel');
          expect(instructions.className).toBe('sr-only');
        });
      });
    });

    test('should not create duplicate drag instructions', () => {
      // Create instructions first
      const existingInstructions = document.createElement('div');
      existingInstructions.id = 'drag-instructions';
      document.body.appendChild(existingInstructions);
      
      return mockAlpine.nextTick(() => {
        dragItemHandler(mockItemElement, mockDirective, mockAlpineUtils);
        
        return mockAlpine.nextTick(() => {
          const instructions = document.querySelectorAll('#drag-instructions');
          expect(instructions.length).toBe(1);
        });
      });
    });

    test('should warn if not within drag context', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const orphanElement = document.createElement('div');
      document.body.appendChild(orphanElement);
      
      return mockAlpine.nextTick(() => {
        dragItemHandler(orphanElement, mockDirective, mockAlpineUtils);
        
        return mockAlpine.nextTick(() => {
          expect(consoleSpy).toHaveBeenCalledWith('x-drag-item must be used within x-drag-context');
          consoleSpy.mockRestore();
        });
      });
    });

    test('should add event listeners', () => {
      const addEventListenerSpy = jest.spyOn(mockItemElement, 'addEventListener');
      
      return mockAlpine.nextTick(() => {
        dragItemHandler(mockItemElement, mockDirective, mockAlpineUtils);
        
        return mockAlpine.nextTick(() => {
          expect(addEventListenerSpy).toHaveBeenCalledWith('dragstart', expect.any(Function));
          expect(addEventListenerSpy).toHaveBeenCalledWith('dragend', expect.any(Function));
          expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
          expect(addEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function));
          expect(addEventListenerSpy).toHaveBeenCalledWith('blur', expect.any(Function));
        });
      });
    });
  });

  describe('Global ARIA Live Region', () => {
    test('should create global aria-live region when announce is called', () => {
      LivewireDragAndDrop(mockAlpine);
      const directives = mockAlpine._getDirectives();
      const dragContextHandler = directives.get('drag-context');
      
      const mockElement = document.createElement('div');
      dragContextHandler(mockElement, { expression: '' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => jest.fn())
      });
      
      // Call announce to trigger creation
      mockElement._announce('Test message');
      
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).not.toBeNull();
      expect(liveRegion.getAttribute('aria-atomic')).toBe('true');
      expect(liveRegion.className).toBe('sr-only');
      expect(liveRegion.textContent).toBe('Test message');
    });

    test('should reuse existing global aria-live region', () => {
      LivewireDragAndDrop(mockAlpine);
      const directives = mockAlpine._getDirectives();
      const dragContextHandler = directives.get('drag-context');
      
      // Create two contexts
      const mockElement1 = document.createElement('div');
      const mockElement2 = document.createElement('div');
      
      dragContextHandler(mockElement1, { expression: '' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => jest.fn())
      });
      
      dragContextHandler(mockElement2, { expression: '' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => jest.fn())
      });
      
      // Call announce from both contexts
      mockElement1._announce('Message 1');
      mockElement2._announce('Message 2');
      
      const liveRegions = document.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBe(1);
      expect(liveRegions[0].textContent).toBe('Message 2');
    });
  });
});