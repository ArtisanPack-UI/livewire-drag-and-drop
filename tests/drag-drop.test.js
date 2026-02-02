/**
 * Drag and Drop Tests for Livewire Drag and Drop
 * 
 * Tests mouse drag-and-drop interactions, event handling,
 * and complete drag-and-drop workflows.
 */

import '../src/index.js';

describe('Livewire Drag and Drop - Mouse Interactions', () => {
  let mockAlpine;
  let mockLivewire;
  let contextElement;
  let dragItem1;
  let dragItem2;
  let dragItem3;

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
    
    mockAlpine = global.Alpine;
    mockLivewire = global.Livewire;
    
    // Trigger auto-registration
    document.dispatchEvent(new Event('alpine:init'));
    document.dispatchEvent(new Event('livewire:init'));
    
    // Set up a typical drag context with items
    contextElement = document.createElement('div');
    contextElement.setAttribute('x-drag-context', '');
    document.body.appendChild(contextElement);
    
    // Initialize the context
    const dragContextDirective = mockAlpine._getDirective('drag-context');
    dragContextDirective(contextElement);
    
    // Create drag items
    dragItem1 = document.createElement('div');
    dragItem1.setAttribute('x-drag-item', '');
    dragItem1.setAttribute('wire:key', 'item-1');
    dragItem1.textContent = 'Item 1';
    contextElement.appendChild(dragItem1);
    
    dragItem2 = document.createElement('div');
    dragItem2.setAttribute('x-drag-item', '');
    dragItem2.setAttribute('wire:key', 'item-2');
    dragItem2.textContent = 'Item 2';
    contextElement.appendChild(dragItem2);
    
    dragItem3 = document.createElement('div');
    dragItem3.setAttribute('x-drag-item', '');
    dragItem3.setAttribute('wire:key', 'item-3');
    dragItem3.textContent = 'Item 3';
    contextElement.appendChild(dragItem3);
    
    // Initialize drag items
    // Note: The source code expects evaluate() to return just the ID value, not an object
    const dragItemDirective = mockAlpine._getDirective('drag-item');
    const mockEvaluate = jest.fn(() => 'item-1');
    const mockCleanup = jest.fn();

    dragItemDirective(dragItem1, { expression: 'item' }, {
      evaluate: mockEvaluate,
      cleanup: mockCleanup
    });

    mockEvaluate.mockReturnValue('item-2');
    dragItemDirective(dragItem2, { expression: 'item' }, {
      evaluate: mockEvaluate,
      cleanup: mockCleanup
    });

    mockEvaluate.mockReturnValue('item-3');
    dragItemDirective(dragItem3, { expression: 'item' }, {
      evaluate: mockEvaluate,
      cleanup: mockCleanup
    });
  });

  describe('Drag Start Events', () => {
    test('should handle dragstart event properly', () => {
      const dragStartEvent = createMockDragEvent('dragstart');
      const preventDefaultSpy = jest.spyOn(dragStartEvent, 'preventDefault');
      
      dragItem1.dispatchEvent(dragStartEvent);
      
      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(contextElement._dragContextState.isDragging).toBe(true);
      expect(contextElement._dragContextState.draggedElement).toBe(dragItem1);
      expect(dragItem1.getAttribute('aria-grabbed')).toBe('true');
      expect(dragStartEvent.dataTransfer.effectAllowed).toBe('move');
    });

    test('should set drag data on dragstart', () => {
      const dragStartEvent = createMockDragEvent('dragstart');
      
      dragItem1.dispatchEvent(dragStartEvent);
      
      const dragData = JSON.parse(dragStartEvent.dataTransfer.getData('text/plain'));
      expect(dragData).toEqual({ id: 'item-1' });
    });

    test('should not set drag state when no context found', () => {
      // Create item without context
      const isolatedItem = document.createElement('div');
      isolatedItem.setAttribute('x-drag-item', '');
      document.body.appendChild(isolatedItem);

      const dragItemDirective = mockAlpine._getDirective('drag-item');
      dragItemDirective(isolatedItem, { expression: null }, {
        evaluate: jest.fn(),
        cleanup: jest.fn()
      });

      const dragStartEvent = createMockDragEvent('dragstart');
      isolatedItem.dispatchEvent(dragStartEvent);

      // The handler should return early - no state changes
      // (The source doesn't prevent default, it just doesn't set up drag state)
      expect(contextElement._dragContextState.isDragging).toBe(false);
      expect(contextElement._dragContextState.draggedElement).toBe(null);

      document.body.removeChild(isolatedItem);
    });

    test('should announce when drag starts', () => {
      const dragStartEvent = createMockDragEvent('dragstart');
      
      dragItem1.dispatchEvent(dragStartEvent);
      
      const ariaLiveRegion = document.querySelector('[aria-live]');
      expect(ariaLiveRegion.textContent).toBe('Item grabbed.');
      expect(ariaLiveRegion.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('Drag End Events', () => {
    test('should handle dragend event properly', () => {
      // First start dragging
      const dragStartEvent = createMockDragEvent('dragstart');
      dragItem1.dispatchEvent(dragStartEvent);
      expect(contextElement._dragContextState.isDragging).toBe(true);
      
      // Then end dragging
      const dragEndEvent = createMockDragEvent('dragend');
      dragItem1.dispatchEvent(dragEndEvent);
      
      expect(dragItem1.getAttribute('aria-grabbed')).toBe('false');
      expect(contextElement._dragContextState.isDragging).toBe(false);
      expect(contextElement._dragContextState.draggedElement).toBe(null);
      expect(contextElement._dragContextState.draggedData).toBe(null);
    });

    test('should announce when drag ends', () => {
      // Start dragging
      const dragStartEvent = createMockDragEvent('dragstart');
      dragItem1.dispatchEvent(dragStartEvent);
      
      // End dragging
      const dragEndEvent = createMockDragEvent('dragend');
      dragItem1.dispatchEvent(dragEndEvent);
      
      const ariaLiveRegion = document.querySelector('[aria-live]');
      expect(ariaLiveRegion.textContent).toBe('Item released.');
    });

    test('should handle dragend without context gracefully', () => {
      // Create item without context
      const isolatedItem = document.createElement('div');
      isolatedItem.setAttribute('x-drag-item', '');
      document.body.appendChild(isolatedItem);
      
      const dragItemDirective = mockAlpine._getDirective('drag-item');
      dragItemDirective(isolatedItem, { expression: null }, { 
        evaluate: jest.fn(), 
        cleanup: jest.fn() 
      });
      
      expect(() => {
        const dragEndEvent = createMockDragEvent('dragend');
        isolatedItem.dispatchEvent(dragEndEvent);
      }).not.toThrow();
      
      document.body.removeChild(isolatedItem);
    });
  });

  describe('Drag Over and Drop Events', () => {
    test('should handle dragover event on context', () => {
      const dragOverEvent = createMockDragEvent('dragover');
      const preventDefaultSpy = jest.spyOn(dragOverEvent, 'preventDefault');
      
      contextElement.dispatchEvent(dragOverEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(dragOverEvent.dataTransfer.dropEffect).toBe('move');
    });

    test('should handle drop event and reorder items', () => {
      // Start dragging item1
      const dragStartEvent = createMockDragEvent('dragstart');
      dragItem1.dispatchEvent(dragStartEvent);
      
      // Mock getBoundingClientRect for drop positioning
      dragItem2.getBoundingClientRect = jest.fn(() => ({
        top: 50,
        height: 100
      }));
      
      // Mock closest method to return the element itself for drag item selector
      dragItem2.closest = jest.fn((selector) => {
        if (selector === '[x-drag-item]') return dragItem2;
        return Element.prototype.closest.call(dragItem2, selector);
      });
      
      // Create drop event targeting item2 (drop below center)
      const dropEvent = createMockDragEvent('drop', { clientY: 100 });
      Object.defineProperty(dropEvent, 'target', { 
        value: dragItem2, 
        configurable: true 
      });
      const preventDefaultSpy = jest.spyOn(dropEvent, 'preventDefault');
      
      // Dispatch on contextElement since that's where the drop handler is attached
      contextElement.dispatchEvent(dropEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      
      // item1 should be moved after item2 (drop below center: dragItem1, dragItem2, dragItem3 -> dragItem2, dragItem1, dragItem3)
      expect(dragItem2.nextSibling).toBe(dragItem1);
      expect(dragItem1.nextSibling).toBe(dragItem3);
      
      // State should be reset
      expect(contextElement._dragContextState.isDragging).toBe(false);
      expect(contextElement._dragContextState.draggedElement).toBe(null);
    });

    test('should handle drop event and reorder items (drop above center)', () => {
      // Start dragging item2
      const dragStartEvent = createMockDragEvent('dragstart');
      dragItem2.dispatchEvent(dragStartEvent);
      
      // Mock getBoundingClientRect for drop positioning
      dragItem3.getBoundingClientRect = jest.fn(() => ({
        top: 50,
        height: 100
      }));
      
      // Create drop event targeting item3 (drop above center)
      const dropEvent = createMockDragEvent('drop', { clientY: 75 }); // 75 < 100 (center)
      Object.defineProperty(dropEvent, 'target', { 
        value: dragItem3, 
        configurable: true 
      });
      
      contextElement.dispatchEvent(dropEvent);
      
      // item2 should be moved before item3
      expect(dragItem3.previousSibling).toBe(dragItem2);
    });

    test('should handle drop on same element', () => {
      // Start dragging item1
      const dragStartEvent = createMockDragEvent('dragstart');
      dragItem1.dispatchEvent(dragStartEvent);
      
      // Create drop event targeting the same item
      const dropEvent = createMockDragEvent('drop');
      Object.defineProperty(dropEvent, 'target', { 
        value: dragItem1, 
        configurable: true 
      });
      
      const originalNextSibling = dragItem1.nextSibling;
      
      contextElement.dispatchEvent(dropEvent);
      
      // Position should remain unchanged
      expect(dragItem1.nextSibling).toBe(originalNextSibling);
    });

    test('should handle drop without dragged element', () => {
      // Create drop event without first starting a drag
      const dropEvent = createMockDragEvent('drop');
      Object.defineProperty(dropEvent, 'target', { 
        value: dragItem2, 
        configurable: true 
      });
      const preventDefaultSpy = jest.spyOn(dropEvent, 'preventDefault');
      
      expect(() => {
        contextElement.dispatchEvent(dropEvent);
      }).not.toThrow();
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    test('should handle drop without valid target', () => {
      // Start dragging item1
      const dragStartEvent = createMockDragEvent('dragstart');
      dragItem1.dispatchEvent(dragStartEvent);
      
      // Create drop event with non-drag-item target
      const nonDragTarget = document.createElement('span');
      contextElement.appendChild(nonDragTarget);
      
      const dropEvent = createMockDragEvent('drop');
      Object.defineProperty(dropEvent, 'target', { 
        value: nonDragTarget, 
        configurable: true 
      });
      
      const originalOrder = Array.from(contextElement.children);
      
      contextElement.dispatchEvent(dropEvent);
      
      // Order should remain unchanged when dropping on non-drag target
      const newOrder = Array.from(contextElement.children);
      expect(newOrder.slice(0, 3)).toEqual(originalOrder.slice(0, 3)); // Ignore the span we added
    });
  });

  describe('Drag Event Integration', () => {
    test('should dispatch drag:end event when finalizeDrop is called', () => {
      const eventSpy = jest.fn();
      contextElement.addEventListener('drag:end', eventSpy);
      
      // Start dragging
      const dragStartEvent = createMockDragEvent('dragstart');
      dragItem1.dispatchEvent(dragStartEvent);
      
      // Perform drop
      const dropEvent = createMockDragEvent('drop');
      Object.defineProperty(dropEvent, 'target', { 
        value: dragItem2, 
        configurable: true 
      });
      contextElement.dispatchEvent(dropEvent);
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'drag:end',
          bubbles: true
        })
      );
    });

    test('should populate recentlyMovedKeys correctly', () => {
      // Start dragging
      const dragStartEvent = createMockDragEvent('dragstart');
      dragItem1.dispatchEvent(dragStartEvent);
      
      // Perform drop to trigger reordering
      dragItem2.getBoundingClientRect = jest.fn(() => ({
        top: 50,
        height: 100
      }));
      
      const dropEvent = createMockDragEvent('drop', { clientY: 100 });
      Object.defineProperty(dropEvent, 'target', { 
        value: dragItem2, 
        configurable: true 
      });
      contextElement.dispatchEvent(dropEvent);
      
      // Test that Livewire hook would prevent updates for moved items
      const updateHook = mockLivewire._hooks['morph.updating'];
      
      const testElement = document.createElement('div');
      testElement.setAttribute('x-drag-item', '');
      testElement.setAttribute('wire:key', 'item-1'); // This was moved
      
      expect(updateHook(testElement, document.createElement('div'), {})).toBe(false);
    });
  });

  describe('Data Transfer and Expression Evaluation', () => {
    test('should evaluate expression and set drag data', () => {
      // Note: The source stores evaluate(expression) directly in _dragItemId,
      // then wraps it as { id: _dragItemId } when creating draggedData
      const mockEvaluate = jest.fn(() => 'custom-data');

      // Create new item with custom expression
      const customItem = document.createElement('div');
      customItem.setAttribute('x-drag-item', '');
      customItem.setAttribute('wire:key', 'custom-item');
      contextElement.appendChild(customItem);

      const dragItemDirective = mockAlpine._getDirective('drag-item');
      dragItemDirective(customItem, { expression: 'customData' }, {
        evaluate: mockEvaluate,
        cleanup: jest.fn()
      });

      const dragStartEvent = createMockDragEvent('dragstart');
      customItem.dispatchEvent(dragStartEvent);

      expect(mockEvaluate).toHaveBeenCalledWith('customData');

      const dragData = JSON.parse(dragStartEvent.dataTransfer.getData('text/plain'));
      expect(dragData).toEqual({ id: 'custom-data' });

      expect(contextElement._dragContextState.draggedData).toEqual({
        id: 'custom-data'
      });
    });

    test('should handle null expression', () => {
      const customItem = document.createElement('div');
      customItem.setAttribute('x-drag-item', '');
      customItem.setAttribute('wire:key', 'null-item');
      contextElement.appendChild(customItem);

      const dragItemDirective = mockAlpine._getDirective('drag-item');
      // When expression is null, evaluate returns undefined
      dragItemDirective(customItem, { expression: null }, {
        evaluate: jest.fn(() => undefined),
        cleanup: jest.fn()
      });

      const dragStartEvent = createMockDragEvent('dragstart');
      customItem.dispatchEvent(dragStartEvent);

      const dragData = JSON.parse(dragStartEvent.dataTransfer.getData('text/plain'));
      // Source wraps as { id: undefined }, JSON.stringify converts to '{}' (undefined is omitted)
      expect(dragData).toEqual({});

      // But the actual state object still has the undefined value
      expect(contextElement._dragContextState.draggedData).toEqual({ id: undefined });
    });
  });

  describe('Element Cleanup', () => {
    test('should clean up event listeners when cleanup is called', () => {
      const mockCleanup = jest.fn();
      const dragItemDirective = mockAlpine._getDirective('drag-item');
      
      const testItem = document.createElement('div');
      testItem.setAttribute('x-drag-item', '');
      
      // Spy on addEventListener to track listeners
      const addEventListenerSpy = jest.spyOn(testItem, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(testItem, 'removeEventListener');
      
      dragItemDirective(testItem, { expression: null }, { 
        evaluate: jest.fn(), 
        cleanup: mockCleanup 
      });
      
      // Verify listeners were added
      expect(addEventListenerSpy).toHaveBeenCalledWith('dragstart', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('dragend', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      
      // Get the cleanup callback and call it
      const cleanupCallback = mockCleanup.mock.calls[0][0];
      cleanupCallback();
      
      // Verify listeners were removed
      expect(removeEventListenerSpy).toHaveBeenCalledWith('dragstart', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('dragend', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  describe('Complete Drag and Drop Workflows', () => {
    test('should complete full mouse drag-and-drop workflow', () => {
      const eventSpy = jest.fn();
      contextElement.addEventListener('drag:end', eventSpy);
      
      // Step 1: Start drag
      const dragStartEvent = createMockDragEvent('dragstart');
      dragItem1.dispatchEvent(dragStartEvent);
      
      expect(contextElement._dragContextState.isDragging).toBe(true);
      expect(contextElement._dragContextState.draggedElement).toBe(dragItem1);
      expect(dragItem1.getAttribute('aria-grabbed')).toBe('true');
      
      // Step 2: Drag over context (this would happen during drag)
      const dragOverEvent = createMockDragEvent('dragover');
      contextElement.dispatchEvent(dragOverEvent);
      expect(dragOverEvent.dataTransfer.dropEffect).toBe('move');
      
      // Step 3: Drop on target
      dragItem3.getBoundingClientRect = jest.fn(() => ({
        top: 50,
        height: 100
      }));
      
      // Mock closest method to return the element itself for drag item selector
      dragItem3.closest = jest.fn((selector) => {
        if (selector === '[x-drag-item]') return dragItem3;
        return Element.prototype.closest.call(dragItem3, selector);
      });
      
      const dropEvent = createMockDragEvent('drop', { clientY: 100 });
      Object.defineProperty(dropEvent, 'target', { 
        value: dragItem3, 
        configurable: true 
      });
      contextElement.dispatchEvent(dropEvent);
      
      // Verify reordering happened
      expect(dragItem3.nextSibling).toBe(dragItem1);
      
      // Step 4: End drag (happens automatically after drop, but test explicitly)
      const dragEndEvent = createMockDragEvent('dragend');
      dragItem1.dispatchEvent(dragEndEvent);
      
      // Verify final state
      expect(contextElement._dragContextState.isDragging).toBe(false);
      expect(contextElement._dragContextState.draggedElement).toBe(null);
      expect(dragItem1.getAttribute('aria-grabbed')).toBe('false');
      expect(eventSpy).toHaveBeenCalled();
    });

    test('should handle cancelled drag operation', () => {
      // Start drag
      const dragStartEvent = createMockDragEvent('dragstart');
      dragItem1.dispatchEvent(dragStartEvent);
      
      expect(contextElement._dragContextState.isDragging).toBe(true);
      
      // End drag without drop (simulating drag cancellation)
      const dragEndEvent = createMockDragEvent('dragend');
      dragItem1.dispatchEvent(dragEndEvent);
      
      // State should be reset
      expect(contextElement._dragContextState.isDragging).toBe(false);
      expect(contextElement._dragContextState.draggedElement).toBe(null);
      expect(contextElement._dragContextState.draggedData).toBe(null);
      expect(dragItem1.getAttribute('aria-grabbed')).toBe('false');
    });
  });
});