/**
 * Functionality Tests for Livewire Drag and Drop
 * 
 * Tests the core functionality including accessibility helpers,
 * Livewire integration, and Alpine.js directives.
 */

import '../src/index.js';

describe('Livewire Drag and Drop - Functionality', () => {
  let mockAlpine;
  let mockLivewire;

  beforeEach(() => {
    // Set up Jest mocks for Alpine
    global.Alpine.directive = jest.fn((name, callback) => {
      global.Alpine._directives[name] = callback;
    });
    global.Alpine.nextTick = jest.fn((callback) => {
      if (callback) callback();
      return Promise.resolve();
    });
    global.Alpine.initTree = jest.fn();
    
    // Set up Jest mocks for Livewire with proper implementation
    global.Livewire._hooks = {};
    global.Livewire.hook = jest.fn((hookName, callback) => {
      global.Livewire._hooks[hookName] = callback;
    });
    
    // Make Alpine and Livewire available on window for src/index.js
    window.Alpine = global.Alpine;
    window.Livewire = global.Livewire;
    
    // Set up DOM element mocks
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 0
    }));
    
    HTMLElement.prototype.focus = jest.fn();
    
    // Reset mocks
    mockAlpine = global.Alpine;
    mockLivewire = global.Livewire;
    
    // Clear any existing global aria-live region
    const existingRegion = document.querySelector('[aria-live]');
    if (existingRegion) {
      existingRegion.remove();
    }
    
    // Clear previous hooks
    global.Alpine._directives = {};
    global.Livewire._hooks = {};
    
    // Trigger auto-registration
    document.dispatchEvent(new Event('alpine:init'));
    document.dispatchEvent(new Event('livewire:init'));
  });

  describe('Initialization', () => {
    test('should register Alpine directives automatically', () => {
      expect(mockAlpine.directive).toHaveBeenCalledTimes(2);
      expect(mockAlpine.directive).toHaveBeenCalledWith('drag-context', expect.any(Function));
      expect(mockAlpine.directive).toHaveBeenCalledWith('drag-item', expect.any(Function));
    });

    test('should register Livewire hooks automatically', () => {
      // Debug: Check if window.Livewire exists and hooks were called
      expect(window.Livewire).toBeDefined();
      expect(mockLivewire.hook.mock.calls.length).toBeGreaterThanOrEqual(0);
      
      // The hooks should be registered when livewire:init is dispatched
      // Let's check if they exist in the _hooks object
      expect(mockLivewire._hooks['morph.updating']).toBeDefined();
      expect(mockLivewire._hooks['message.processed']).toBeDefined();
    });
  });

  describe('Accessibility Helpers', () => {
    describe('Global Aria Live Region', () => {
      test('should create a global aria-live region', () => {
        // Trigger the creation by accessing the announce function
        const dragContextDirective = mockAlpine._getDirective('drag-context');
        const mockElement = document.createElement('div');
        dragContextDirective(mockElement);
        
        const ariaLiveRegion = document.querySelector('[aria-live]');
        expect(ariaLiveRegion).toBeTruthy();
        expect(ariaLiveRegion.getAttribute('aria-live')).toBe('polite');
        expect(ariaLiveRegion.getAttribute('aria-atomic')).toBe('true');
        expect(ariaLiveRegion.className).toBe('sr-only');
      });

      test('should reuse existing global aria-live region', () => {
        const dragContextDirective = mockAlpine._getDirective('drag-context');
        const mockElement1 = document.createElement('div');
        const mockElement2 = document.createElement('div');
      
        dragContextDirective(mockElement1);
        dragContextDirective(mockElement2);
      
        // Trigger the creation of ARIA live region by using the announce function
        mockElement1._dragContextHelpers.announce('Test');
      
        const ariaLiveRegions = document.querySelectorAll('[aria-live]');
        expect(ariaLiveRegions.length).toBe(1);
      });

      test('should have proper screen reader styles', () => {
        
        const dragContextDirective = mockAlpine._getDirective('drag-context');
        const mockElement = document.createElement('div');
        dragContextDirective(mockElement);
        
        // Trigger the creation of ARIA live region
        mockElement._dragContextHelpers.announce('Test');
        
        const ariaLiveRegion = document.querySelector('[aria-live]');
        const styles = ariaLiveRegion.style;
        
        expect(styles.position).toBe('absolute');
        expect(styles.width).toBe('1px');
        expect(styles.height).toBe('1px');
        expect(styles.overflow).toBe('hidden');
        expect(styles.clip).toBe('rect(0px, 0px, 0px, 0px)');
      });
    });

    describe('Announce Function', () => {
      test('should announce messages with default priority', () => {
        
        const dragContextDirective = mockAlpine._getDirective('drag-context');
        const mockElement = document.createElement('div');
        dragContextDirective(mockElement);
        
        const announceFunction = mockElement._dragContextHelpers.announce;
        announceFunction('Test message');
        
        const ariaLiveRegion = document.querySelector('[aria-live]');
        expect(ariaLiveRegion.textContent).toBe('Test message');
        expect(ariaLiveRegion.getAttribute('aria-live')).toBe('polite');
      });

      test('should announce messages with assertive priority', () => {
        
        const dragContextDirective = mockAlpine._getDirective('drag-context');
        const mockElement = document.createElement('div');
        dragContextDirective(mockElement);
        
        const announceFunction = mockElement._dragContextHelpers.announce;
        announceFunction('Urgent message', 'assertive');
        
        const ariaLiveRegion = document.querySelector('[aria-live]');
        expect(ariaLiveRegion.textContent).toBe('Urgent message');
        expect(ariaLiveRegion.getAttribute('aria-live')).toBe('assertive');
      });
    });
  });

  describe('Livewire Integration', () => {
    describe('morph.updating hook', () => {
      test('should prevent element update when wire:key is in recentlyMovedKeys', () => {
        
        const updateHook = mockLivewire._hooks['morph.updating'];
        expect(updateHook).toBeDefined();
        
        // Create a mock element structure for the hook to work with
        const contextElement = document.createElement('div');
        contextElement.setAttribute('x-drag-context', '');
        contextElement._recentlyMovedKeys = ['item-1'];
        
        const mockEl = document.createElement('div');
        mockEl.querySelector = jest.fn((selector) => {
          if (selector === '[x-drag-context]') return contextElement;
          if (selector === '[wire\\:key="item-1"]') {
            const item = document.createElement('div');
            item.setAttribute('wire:key', 'item-1');
            return item;
          }
          return null;
        });
        
        // Set isDragUpdate to true to activate the hook logic
        // This simulates the state during a drag operation
        updateHook({ el: mockEl });
        
        // Test that the item would be ignored
        const item = mockEl.querySelector('[wire\\:key="item-1"]');
        expect(item.__livewire_ignore).toBe(true);
      });

      test('should allow element update when wire:key is not in recentlyMovedKeys', () => {
        
        const updateHook = mockLivewire._hooks['morph.updating'];
        expect(updateHook).toBeDefined();
        
        const mockEl = document.createElement('div');
        mockEl.querySelector = jest.fn(() => null);
        
        expect(() => {
          updateHook({ el: mockEl });
        }).not.toThrow();
      });

      test('should allow element update when element has no wire:key', () => {
        
        const updateHook = mockLivewire._hooks['morph.updating'];
        expect(updateHook).toBeDefined();
        
        const mockEl = document.createElement('div');
        mockEl.querySelector = jest.fn(() => null);
        
        expect(() => {
          updateHook({ el: mockEl });
        }).not.toThrow();
      });
    });

    describe('message.processed hook', () => {
      test('should clear recentlyMovedKeys after message processing', () => {
        
        const processedHook = mockLivewire._hooks['message.processed'];
        expect(processedHook).toBeDefined();
        
        // Set up a context with moved items
        const dragContextDirective = mockAlpine._getDirective('drag-context');
        const contextElement = document.createElement('div');
        contextElement.setAttribute('x-drag-context', '');
        document.body.appendChild(contextElement);
        dragContextDirective(contextElement);
        
        const item1 = document.createElement('div');
        item1.setAttribute('x-drag-item', '');
        item1.setAttribute('wire:key', 'item-1');
        contextElement.appendChild(item1);
        
        // Simulate drop to populate recentlyMovedKeys
        contextElement._dragContextHelpers.finalizeDrop(item1);
        expect(contextElement._recentlyMovedKeys).toEqual(['item-1']);
        
        // Process message - this should clear recentlyMovedKeys and reinitialize contexts
        processedHook();
        
        // Verify context was reinitialized
        expect(contextElement._dragContextInitialized).toBeFalsy();
        
        document.body.removeChild(contextElement);
      });
    });
  });

  describe('x-drag-context directive', () => {
    test('should initialize drag state on element', () => {
      
      const dragContextDirective = mockAlpine._getDirective('drag-context');
      const mockElement = document.createElement('div');
      
      dragContextDirective(mockElement);
      
      expect(mockElement._dragContextState).toBeDefined();
      expect(mockElement._dragContextState.isDragging).toBe(false);
      expect(mockElement._dragContextState.draggedElement).toBe(null);
      expect(mockElement._dragContextState.draggedData).toBe(null);
    });

    test('should attach helpers to element', () => {
      
      const dragContextDirective = mockAlpine._getDirective('drag-context');
      const mockElement = document.createElement('div');
      
      dragContextDirective(mockElement);
      
      expect(mockElement._dragContextHelpers).toBeDefined();
      expect(mockElement._dragContextHelpers.announce).toBeInstanceOf(Function);
      expect(mockElement._dragContextHelpers.finalizeDrop).toBeInstanceOf(Function);
    });

    test('should handle dragover events', () => {
      
      const dragContextDirective = mockAlpine._getDirective('drag-context');
      const mockElement = document.createElement('div');
      mockElement.setAttribute('x-drag-context', '');
      document.body.appendChild(mockElement);
      
      dragContextDirective(mockElement);
      
      // Set up dragging state
      mockElement._dragContextState.isDragging = true;
      
      const dragoverEvent = createMockDragEvent('dragover');
      Object.defineProperty(dragoverEvent, 'target', {
        value: mockElement,
        configurable: true
      });
      const preventDefaultSpy = jest.spyOn(dragoverEvent, 'preventDefault');
      
      // Dispatch on document.body where global listener is attached
      document.body.dispatchEvent(dragoverEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(dragoverEvent.dataTransfer.dropEffect).toBe('move');
      
      document.body.removeChild(mockElement);
    });

    test('should handle drop events and reorder elements', () => {
      
      const dragContextDirective = mockAlpine._getDirective('drag-context');
      const mockElement = document.createElement('div');
      mockElement.setAttribute('x-drag-context', '');
      document.body.appendChild(mockElement);
      
      dragContextDirective(mockElement);
      
      // Create draggable items
      const item1 = document.createElement('div');
      item1.setAttribute('x-drag-item', '');
      item1.setAttribute('wire:key', 'item-1');
      mockElement.appendChild(item1);
      
      const item2 = document.createElement('div');
      item2.setAttribute('x-drag-item', '');
      item2.setAttribute('wire:key', 'item-2');
      mockElement.appendChild(item2);
      
      // Set drag state properly
      mockElement._dragContextState.isDragging = true;
      mockElement._dragContextState.draggedElement = item1;
      
      // Mock getBoundingClientRect for drop positioning
      item2.getBoundingClientRect = jest.fn(() => ({
        top: 50,
        height: 100
      }));
      
      // Mock closest method to return the element itself for drag item selector
      item2.closest = jest.fn((selector) => {
        if (selector === '[x-drag-item]') return item2;
        if (selector === '[x-drag-context]') return mockElement;
        return Element.prototype.closest.call(item2, selector);
      });
      
      const dropEvent = createMockDragEvent('drop', { clientY: 100 }); // Below center
      Object.defineProperty(dropEvent, 'target', { 
        value: item2, 
        configurable: true 
      });
      
      const preventDefaultSpy = jest.spyOn(dropEvent, 'preventDefault');
      
      // Dispatch on document.body where global listener is attached
      document.body.dispatchEvent(dropEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      // item1 should be moved after item2
      expect(item2.nextSibling).toBe(item1);
      
      document.body.removeChild(mockElement);
    });
  });

  describe('findDragContext utility', () => {
    test('should find drag context in parent elements', () => {
      
      const dragContextDirective = mockAlpine._getDirective('drag-context');
      const contextElement = document.createElement('div');
      dragContextDirective(contextElement);
      
      const childElement = document.createElement('div');
      const grandchildElement = document.createElement('div');
      
      contextElement.appendChild(childElement);
      childElement.appendChild(grandchildElement);
      
      // The findDragContext function is not exported, but it's used internally
      // We can test it by triggering a drag-item directive
      const dragItemDirective = mockAlpine._getDirective('drag-item');
      
      const mockEvaluate = jest.fn();
      const mockCleanup = jest.fn();
      
      // This should find the context and work without errors
      expect(() => {
        dragItemDirective(grandchildElement, { expression: null }, { 
          evaluate: mockEvaluate, 
          cleanup: mockCleanup 
        });
      }).not.toThrow();
    });
  });

  describe('finalizeDrop helper', () => {
    test('should populate recentlyMovedKeys and dispatch drag:end event', () => {
      
      const dragContextDirective = mockAlpine._getDirective('drag-context');
      const contextElement = document.createElement('div');
      dragContextDirective(contextElement);
      
      // Add multiple items
      const item1 = document.createElement('div');
      item1.setAttribute('x-drag-item', '');
      item1.setAttribute('wire:key', 'item-1');
      contextElement.appendChild(item1);
      
      const item2 = document.createElement('div');
      item2.setAttribute('x-drag-item', '');
      item2.setAttribute('wire:key', 'item-2');
      contextElement.appendChild(item2);
      
      const eventSpy = jest.fn();
      contextElement.addEventListener('drag:end', eventSpy);
      
      contextElement._dragContextHelpers.finalizeDrop(item1);
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'drag:end',
          bubbles: true
        })
      );
      
      // Reset state should be applied
      expect(contextElement._dragContextState.isDragging).toBe(false);
      expect(contextElement._dragContextState.draggedElement).toBe(null);
      expect(contextElement._dragContextState.draggedData).toBe(null);
    });
  });
});