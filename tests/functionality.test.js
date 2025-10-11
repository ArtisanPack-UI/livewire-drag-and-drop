/**
 * Functionality Tests for Livewire Drag and Drop
 * 
 * Tests the core functionality including accessibility helpers,
 * Livewire integration, and Alpine.js directives.
 */

import LivewireDragAndDrop from '../src/index.js';

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
    
    // Set up Jest mocks for Livewire
    global.Livewire.hook = jest.fn((hookName, callback) => {
      global.Livewire._hooks[hookName] = callback;
    });
    
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
  });

  describe('Initialization', () => {
    test('should register Alpine directives when called', () => {
      LivewireDragAndDrop(mockAlpine);
      
      expect(mockAlpine.directive).toHaveBeenCalledTimes(2);
      expect(mockAlpine.directive).toHaveBeenCalledWith('drag-context', expect.any(Function));
      expect(mockAlpine.directive).toHaveBeenCalledWith('drag-item', expect.any(Function));
    });

    test('should register Livewire hooks when called', () => {
      LivewireDragAndDrop(mockAlpine);
      
      expect(mockLivewire.hook).toHaveBeenCalledTimes(2);
      expect(mockLivewire.hook).toHaveBeenCalledWith('element.updating', expect.any(Function));
      expect(mockLivewire.hook).toHaveBeenCalledWith('message.processed', expect.any(Function));
    });
  });

  describe('Accessibility Helpers', () => {
    describe('Global Aria Live Region', () => {
      test('should create a global aria-live region', () => {
        LivewireDragAndDrop(mockAlpine);
        
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
        LivewireDragAndDrop(mockAlpine);
      
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
        LivewireDragAndDrop(mockAlpine);
        
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
        LivewireDragAndDrop(mockAlpine);
        
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
        LivewireDragAndDrop(mockAlpine);
        
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
    describe('element.updating hook', () => {
      test('should prevent element update when wire:key is in recentlyMovedKeys', () => {
        LivewireDragAndDrop(mockAlpine);
        
        const updateHook = mockLivewire._hooks['element.updating'];
        
        const fromEl = document.createElement('div');
        fromEl.setAttribute('x-drag-item', '');
        fromEl.setAttribute('wire:key', 'item-1');
        
        const toEl = document.createElement('div');
        const component = {};
        
        // Simulate that item-1 was recently moved
        // This would happen through the finalizeDrop process
        const dragContextDirective = mockAlpine._getDirective('drag-context');
        const contextElement = document.createElement('div');
        dragContextDirective(contextElement);
        
        // Add some drag items to simulate reordering
        const item1 = document.createElement('div');
        item1.setAttribute('x-drag-item', '');
        item1.setAttribute('wire:key', 'item-1');
        contextElement.appendChild(item1);
        
        contextElement._dragContextHelpers.finalizeDrop(item1);
        
        const result = updateHook(fromEl, toEl, component);
        expect(result).toBe(false);
      });

      test('should allow element update when wire:key is not in recentlyMovedKeys', () => {
        LivewireDragAndDrop(mockAlpine);
        
        const updateHook = mockLivewire._hooks['element.updating'];
        
        const fromEl = document.createElement('div');
        fromEl.setAttribute('x-drag-item', '');
        fromEl.setAttribute('wire:key', 'item-1');
        
        const toEl = document.createElement('div');
        const component = {};
        
        const result = updateHook(fromEl, toEl, component);
        expect(result).toBeUndefined(); // No return value means allow update
      });

      test('should allow element update when element has no wire:key', () => {
        LivewireDragAndDrop(mockAlpine);
        
        const updateHook = mockLivewire._hooks['element.updating'];
        
        const fromEl = document.createElement('div');
        fromEl.setAttribute('x-drag-item', '');
        
        const toEl = document.createElement('div');
        const component = {};
        
        const result = updateHook(fromEl, toEl, component);
        expect(result).toBeUndefined();
      });
    });

    describe('message.processed hook', () => {
      test('should clear recentlyMovedKeys after message processing', () => {
        LivewireDragAndDrop(mockAlpine);
        
        const processedHook = mockLivewire._hooks['message.processed'];
        const updateHook = mockLivewire._hooks['element.updating'];
        
        // Set up a context with moved items
        const dragContextDirective = mockAlpine._getDirective('drag-context');
        const contextElement = document.createElement('div');
        dragContextDirective(contextElement);
        
        const item1 = document.createElement('div');
        item1.setAttribute('x-drag-item', '');
        item1.setAttribute('wire:key', 'item-1');
        contextElement.appendChild(item1);
        
        // Simulate drop to populate recentlyMovedKeys
        contextElement._dragContextHelpers.finalizeDrop(item1);
        
        // Verify hook prevents update
        const fromEl = document.createElement('div');
        fromEl.setAttribute('x-drag-item', '');
        fromEl.setAttribute('wire:key', 'item-1');
        
        expect(updateHook(fromEl, document.createElement('div'), {})).toBe(false);
        
        // Process message
        processedHook({}, {});
        
        // Verify hook no longer prevents update
        expect(updateHook(fromEl, document.createElement('div'), {})).toBeUndefined();
      });
    });
  });

  describe('x-drag-context directive', () => {
    test('should initialize drag state on element', () => {
      LivewireDragAndDrop(mockAlpine);
      
      const dragContextDirective = mockAlpine._getDirective('drag-context');
      const mockElement = document.createElement('div');
      
      dragContextDirective(mockElement);
      
      expect(mockElement._dragContextState).toBeDefined();
      expect(mockElement._dragContextState.isDragging).toBe(false);
      expect(mockElement._dragContextState.draggedElement).toBe(null);
      expect(mockElement._dragContextState.dropZones).toEqual([]);
      expect(mockElement._dragContextState.draggedData).toBe(null);
    });

    test('should attach helpers to element', () => {
      LivewireDragAndDrop(mockAlpine);
      
      const dragContextDirective = mockAlpine._getDirective('drag-context');
      const mockElement = document.createElement('div');
      
      dragContextDirective(mockElement);
      
      expect(mockElement._dragContextHelpers).toBeDefined();
      expect(mockElement._dragContextHelpers.announce).toBeInstanceOf(Function);
      expect(mockElement._dragContextHelpers.finalizeDrop).toBeInstanceOf(Function);
    });

    test('should handle dragover events', () => {
      LivewireDragAndDrop(mockAlpine);
      
      const dragContextDirective = mockAlpine._getDirective('drag-context');
      const mockElement = document.createElement('div');
      
      dragContextDirective(mockElement);
      
      const dragoverEvent = createMockDragEvent('dragover');
      const preventDefaultSpy = jest.spyOn(dragoverEvent, 'preventDefault');
      
      mockElement.dispatchEvent(dragoverEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(dragoverEvent.dataTransfer.dropEffect).toBe('move');
    });

    test('should handle drop events and reorder elements', () => {
      LivewireDragAndDrop(mockAlpine);
      
      const dragContextDirective = mockAlpine._getDirective('drag-context');
      const mockElement = document.createElement('div');
      
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
      
      // Set drag state
      mockElement._dragContextState.draggedElement = item1;
      
      // Mock getBoundingClientRect for drop positioning
      item2.getBoundingClientRect = jest.fn(() => ({
        top: 50,
        height: 100
      }));
      
      // Mock closest method to return the element itself for drag item selector
      item2.closest = jest.fn((selector) => {
        if (selector === '[x-drag-item]') return item2;
        return Element.prototype.closest.call(item2, selector);
      });
      
      const dropEvent = createMockDragEvent('drop', { clientY: 100 }); // Below center
      Object.defineProperty(dropEvent, 'target', { 
        value: item2, 
        configurable: true 
      });
      
      const preventDefaultSpy = jest.spyOn(dropEvent, 'preventDefault');
      
      mockElement.dispatchEvent(dropEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      // item1 should be moved after item2
      expect(item2.nextSibling).toBe(item1);
    });
  });

  describe('findDragContext utility', () => {
    test('should find drag context in parent elements', () => {
      LivewireDragAndDrop(mockAlpine);
      
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
      LivewireDragAndDrop(mockAlpine);
      
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