/**
 * Accessibility Tests for Livewire Drag and Drop
 * 
 * Tests keyboard navigation, ARIA attributes, screen reader announcements,
 * and focus management to ensure full accessibility compliance.
 */

import LivewireDragAndDrop from '../src/index.js';
import { configureAxe } from 'jest-axe';

// Create axe instance
const axe = configureAxe({
  rules: {
    // Disable some rules that might not be relevant for this test environment
    'color-contrast': { enabled: false },
    'page-has-heading-one': { enabled: false }
  }
});

// Create a simple toHaveNoViolations matcher
expect.extend({
  toHaveNoViolations(received) {
    if (received.violations && received.violations.length === 0) {
      return {
        message: () => `Expected element to have accessibility violations, but there were none.`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected element to have no accessibility violations, but found: ${received.violations?.length || 0} violations.`,
        pass: false,
      };
    }
  }
});

describe('Livewire Drag and Drop - Accessibility', () => {
  let mockAlpine;
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
    
    // Initialize the library
    LivewireDragAndDrop(mockAlpine);
    
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
    const dragItemDirective = mockAlpine._getDirective('drag-item');
    const mockEvaluate = jest.fn(() => ({ id: 'item-1' }));
    const mockCleanup = jest.fn();
    
    dragItemDirective(dragItem1, { expression: 'item' }, { 
      evaluate: mockEvaluate, 
      cleanup: mockCleanup 
    });
    
    mockEvaluate.mockReturnValue({ id: 'item-2' });
    dragItemDirective(dragItem2, { expression: 'item' }, { 
      evaluate: mockEvaluate, 
      cleanup: mockCleanup 
    });
    
    mockEvaluate.mockReturnValue({ id: 'item-3' });
    dragItemDirective(dragItem3, { expression: 'item' }, { 
      evaluate: mockEvaluate, 
      cleanup: mockCleanup 
    });
  });

  describe('ARIA Attributes', () => {
    test('should set correct initial ARIA attributes on drag items', () => {
      expect(dragItem1.getAttribute('role')).toBe('button');
      expect(dragItem1.getAttribute('aria-grabbed')).toBe('false');
      expect(dragItem1.getAttribute('tabindex')).toBe('0');
      expect(dragItem1.draggable).toBe(true);
    });

    test('should update aria-grabbed when item is grabbed via keyboard', () => {
      const spaceKeyEvent = createMockKeyboardEvent('keydown', ' ');
      dragItem1.dispatchEvent(spaceKeyEvent);
      
      expect(dragItem1.getAttribute('aria-grabbed')).toBe('true');
    });

    test('should reset aria-grabbed when item is dropped via keyboard', () => {
      // First grab the item
      const spaceKeyEvent1 = createMockKeyboardEvent('keydown', ' ');
      dragItem1.dispatchEvent(spaceKeyEvent1);
      expect(dragItem1.getAttribute('aria-grabbed')).toBe('true');
      
      // Then drop it
      const spaceKeyEvent2 = createMockKeyboardEvent('keydown', ' ');
      dragItem1.dispatchEvent(spaceKeyEvent2);
      expect(dragItem1.getAttribute('aria-grabbed')).toBe('false');
    });

    test('should reset aria-grabbed when drag is cancelled', () => {
      // First grab the item
      const spaceKeyEvent = createMockKeyboardEvent('keydown', ' ');
      dragItem1.dispatchEvent(spaceKeyEvent);
      expect(dragItem1.getAttribute('aria-grabbed')).toBe('true');
      
      // Then cancel
      const escapeKeyEvent = createMockKeyboardEvent('keydown', 'Escape');
      dragItem1.dispatchEvent(escapeKeyEvent);
      expect(dragItem1.getAttribute('aria-grabbed')).toBe('false');
    });

    test('should reset aria-grabbed after mouse drag operation', () => {
      const dragStartEvent = createMockDragEvent('dragstart');
      dragItem1.dispatchEvent(dragStartEvent);
      expect(dragItem1.getAttribute('aria-grabbed')).toBe('true');
      
      const dragEndEvent = createMockDragEvent('dragend');
      dragItem1.dispatchEvent(dragEndEvent);
      expect(dragItem1.getAttribute('aria-grabbed')).toBe('false');
    });
  });

  describe('Keyboard Navigation', () => {
    describe('Space and Enter Keys', () => {
      test('should grab item with Space key', () => {
        const spaceKeyEvent = createMockKeyboardEvent('keydown', ' ');
        const preventDefaultSpy = jest.spyOn(spaceKeyEvent, 'preventDefault');
        
        dragItem1.dispatchEvent(spaceKeyEvent);
        
        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(contextElement._dragContextState.isDragging).toBe(true);
        expect(contextElement._dragContextState.draggedElement).toBe(dragItem1);
        expect(dragItem1.getAttribute('aria-grabbed')).toBe('true');
      });

      test('should grab item with Enter key', () => {
        const enterKeyEvent = createMockKeyboardEvent('keydown', 'Enter');
        const preventDefaultSpy = jest.spyOn(enterKeyEvent, 'preventDefault');
        
        dragItem1.dispatchEvent(enterKeyEvent);
        
        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(contextElement._dragContextState.isDragging).toBe(true);
        expect(contextElement._dragContextState.draggedElement).toBe(dragItem1);
        expect(dragItem1.getAttribute('aria-grabbed')).toBe('true');
      });

      test('should drop item with Space key when already grabbed', () => {
        // First grab
        const spaceKeyEvent1 = createMockKeyboardEvent('keydown', ' ');
        dragItem1.dispatchEvent(spaceKeyEvent1);
        expect(contextElement._dragContextState.isDragging).toBe(true);
        
        // Then drop
        const spaceKeyEvent2 = createMockKeyboardEvent('keydown', ' ');
        dragItem1.dispatchEvent(spaceKeyEvent2);
        
        expect(contextElement._dragContextState.isDragging).toBe(false);
        expect(contextElement._dragContextState.draggedElement).toBe(null);
        expect(dragItem1.getAttribute('aria-grabbed')).toBe('false');
      });
    });

    describe('Escape Key', () => {
      test('should cancel drag operation with Escape key', () => {
        // First grab
        const spaceKeyEvent = createMockKeyboardEvent('keydown', ' ');
        dragItem1.dispatchEvent(spaceKeyEvent);
        expect(contextElement._dragContextState.isDragging).toBe(true);
        
        // Then cancel
        const escapeKeyEvent = createMockKeyboardEvent('keydown', 'Escape');
        dragItem1.dispatchEvent(escapeKeyEvent);
        
        expect(contextElement._dragContextState.isDragging).toBe(false);
        expect(contextElement._dragContextState.draggedElement).toBe(null);
        expect(contextElement._dragContextState.draggedData).toBe(null);
        expect(dragItem1.getAttribute('aria-grabbed')).toBe('false');
      });

      test('should do nothing with Escape when not grabbed', () => {
        const escapeKeyEvent = createMockKeyboardEvent('keydown', 'Escape');
        dragItem1.dispatchEvent(escapeKeyEvent);
        
        // State should remain unchanged
        expect(contextElement._dragContextState.isDragging).toBe(false);
        expect(contextElement._dragContextState.draggedElement).toBe(null);
      });
    });

    describe('Arrow Key Navigation', () => {
      test('should move item down with ArrowDown key', () => {
        // First grab the item
        const spaceKeyEvent = createMockKeyboardEvent('keydown', ' ');
        dragItem1.dispatchEvent(spaceKeyEvent);
        
        // Move down
        const arrowDownEvent = createMockKeyboardEvent('keydown', 'ArrowDown');
        const preventDefaultSpy = jest.spyOn(arrowDownEvent, 'preventDefault');
        
        dragItem1.dispatchEvent(arrowDownEvent);
        
        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(HTMLElement.prototype.focus).toHaveBeenCalledWith();
        
        // dragItem1 should now be after dragItem2
        expect(dragItem2.nextSibling).toBe(dragItem1);
      });

      test('should move item up with ArrowUp key', () => {
        // First grab dragItem2 (middle item)
        const spaceKeyEvent = createMockKeyboardEvent('keydown', ' ');
        dragItem2.dispatchEvent(spaceKeyEvent);
        
        // Move up
        const arrowUpEvent = createMockKeyboardEvent('keydown', 'ArrowUp');
        const preventDefaultSpy = jest.spyOn(arrowUpEvent, 'preventDefault');
        
        dragItem2.dispatchEvent(arrowUpEvent);
        
        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(HTMLElement.prototype.focus).toHaveBeenCalledWith();
        
        // dragItem2 should now be before dragItem1, so dragItem2's next sibling is dragItem1
        expect(dragItem2.nextSibling).toBe(dragItem1);
      });

      test('should move item right with ArrowRight key', () => {
        // First grab the item
        const spaceKeyEvent = createMockKeyboardEvent('keydown', ' ');
        dragItem1.dispatchEvent(spaceKeyEvent);
        
        // Move right (same as down)
        const arrowRightEvent = createMockKeyboardEvent('keydown', 'ArrowRight');
        const preventDefaultSpy = jest.spyOn(arrowRightEvent, 'preventDefault');
        
        dragItem1.dispatchEvent(arrowRightEvent);
        
        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(dragItem2.nextSibling).toBe(dragItem1);
      });

      test('should move item left with ArrowLeft key', () => {
        // First grab dragItem2 (middle item)
        const spaceKeyEvent = createMockKeyboardEvent('keydown', ' ');
        dragItem2.dispatchEvent(spaceKeyEvent);
        
        // Move left (same as up)
        const arrowLeftEvent = createMockKeyboardEvent('keydown', 'ArrowLeft');
        const preventDefaultSpy = jest.spyOn(arrowLeftEvent, 'preventDefault');
        
        dragItem2.dispatchEvent(arrowLeftEvent);
        
        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(dragItem2.nextSibling).toBe(dragItem1);
      });

      test('should wrap around when moving beyond bounds', () => {
        // Grab last item (dragItem3, index 2 of 3 items)
        const spaceKeyEvent = createMockKeyboardEvent('keydown', ' ');
        dragItem3.dispatchEvent(spaceKeyEvent);
        
        // Move down (should wrap to beginning - target index should be 0)
        const arrowDownEvent = createMockKeyboardEvent('keydown', 'ArrowDown');
        dragItem3.dispatchEvent(arrowDownEvent);
        
        // When moving down, dragItem3 should be placed after dragItem1's nextSibling
        // Since dragItem1 is at index 0, dragItem3 should be between dragItem1 and dragItem2
        expect(dragItem1.nextSibling).toBe(dragItem3);
        expect(dragItem3.nextSibling).toBe(dragItem2);
      });

      test('should not move when not grabbed', () => {
        const originalOrder = [dragItem1, dragItem2, dragItem3];
        
        const arrowDownEvent = createMockKeyboardEvent('keydown', 'ArrowDown');
        dragItem1.dispatchEvent(arrowDownEvent);
        
        // Order should remain unchanged
        expect(contextElement.children[0]).toBe(originalOrder[0]);
        expect(contextElement.children[1]).toBe(originalOrder[1]);
        expect(contextElement.children[2]).toBe(originalOrder[2]);
      });
    });

    test('should ignore unsupported keys', () => {
      const unsupportedKeyEvent = createMockKeyboardEvent('keydown', 'a');
      const preventDefaultSpy = jest.spyOn(unsupportedKeyEvent, 'preventDefault');
      
      dragItem1.dispatchEvent(unsupportedKeyEvent);
      
      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(contextElement._dragContextState.isDragging).toBe(false);
    });
  });

  describe('Screen Reader Announcements', () => {
    test('should announce when item is grabbed via keyboard', () => {
      const spaceKeyEvent = createMockKeyboardEvent('keydown', ' ');
      dragItem1.dispatchEvent(spaceKeyEvent);
      
      const ariaLiveRegion = document.querySelector('[aria-live]');
      expect(ariaLiveRegion.textContent).toBe('Grabbed. Use arrow keys to move.');
      expect(ariaLiveRegion.getAttribute('aria-live')).toBe('assertive');
    });

    test('should announce when item is dropped via keyboard', () => {
      // First grab
      const spaceKeyEvent1 = createMockKeyboardEvent('keydown', ' ');
      dragItem1.dispatchEvent(spaceKeyEvent1);
      
      // Then drop
      const spaceKeyEvent2 = createMockKeyboardEvent('keydown', ' ');
      dragItem1.dispatchEvent(spaceKeyEvent2);
      
      const ariaLiveRegion = document.querySelector('[aria-live]');
      expect(ariaLiveRegion.textContent).toBe('Dropped.');
    });

    test('should announce when drag is cancelled', () => {
      // First grab
      const spaceKeyEvent = createMockKeyboardEvent('keydown', ' ');
      dragItem1.dispatchEvent(spaceKeyEvent);
      
      // Then cancel
      const escapeKeyEvent = createMockKeyboardEvent('keydown', 'Escape');
      dragItem1.dispatchEvent(escapeKeyEvent);
      
      const ariaLiveRegion = document.querySelector('[aria-live]');
      expect(ariaLiveRegion.textContent).toBe('Drag cancelled.');
    });

    test('should announce position when item is moved', () => {
      // First grab
      const spaceKeyEvent = createMockKeyboardEvent('keydown', ' ');
      dragItem1.dispatchEvent(spaceKeyEvent);
      
      // Move down
      const arrowDownEvent = createMockKeyboardEvent('keydown', 'ArrowDown');
      dragItem1.dispatchEvent(arrowDownEvent);
      
      const ariaLiveRegion = document.querySelector('[aria-live]');
      expect(ariaLiveRegion.textContent).toBe('Moved to position 2.');
    });

    test('should announce when item is grabbed via mouse', () => {
      const dragStartEvent = createMockDragEvent('dragstart');
      dragItem1.dispatchEvent(dragStartEvent);
      
      const ariaLiveRegion = document.querySelector('[aria-live]');
      expect(ariaLiveRegion.textContent).toBe('Item grabbed.');
      expect(ariaLiveRegion.getAttribute('aria-live')).toBe('assertive');
    });

    test('should announce when item is released via mouse', () => {
      // First start drag
      const dragStartEvent = createMockDragEvent('dragstart');
      dragItem1.dispatchEvent(dragStartEvent);
      
      // Then end drag
      const dragEndEvent = createMockDragEvent('dragend');
      dragItem1.dispatchEvent(dragEndEvent);
      
      const ariaLiveRegion = document.querySelector('[aria-live]');
      expect(ariaLiveRegion.textContent).toBe('Item released.');
    });
  });

  describe('Focus Management', () => {
    test('should maintain focus on item when moved via keyboard', () => {
      // First grab
      const spaceKeyEvent = createMockKeyboardEvent('keydown', ' ');
      dragItem1.dispatchEvent(spaceKeyEvent);
      
      // Clear previous focus calls
      HTMLElement.prototype.focus.mockClear();
      
      // Move item
      const arrowDownEvent = createMockKeyboardEvent('keydown', 'ArrowDown');
      dragItem1.dispatchEvent(arrowDownEvent);
      
      expect(HTMLElement.prototype.focus).toHaveBeenCalledWith();
    });

    test('should have proper tabindex for keyboard navigation', () => {
      expect(dragItem1.tabIndex).toBe(0);
      expect(dragItem2.tabIndex).toBe(0);
      expect(dragItem3.tabIndex).toBe(0);
    });
  });

  describe('Axe Accessibility Testing', () => {
    test('should have no accessibility violations in initial state', async () => {
      const results = await axe(contextElement);
      expect(results).toHaveNoViolations();
    });

    test('should have no accessibility violations when item is grabbed', async () => {
      const spaceKeyEvent = createMockKeyboardEvent('keydown', ' ');
      dragItem1.dispatchEvent(spaceKeyEvent);
      
      const results = await axe(contextElement);
      expect(results).toHaveNoViolations();
    });

    test('should have no accessibility violations with aria-live region', async () => {
      // Trigger aria-live region creation
      const spaceKeyEvent = createMockKeyboardEvent('keydown', ' ');
      dragItem1.dispatchEvent(spaceKeyEvent);
      
      const results = await axe(document.body);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle keyboard events when drag context is not found', () => {
      // Create an isolated drag item without context
      const isolatedItem = document.createElement('div');
      isolatedItem.setAttribute('x-drag-item', '');
      document.body.appendChild(isolatedItem);
      
      const dragItemDirective = mockAlpine._getDirective('drag-item');
      dragItemDirective(isolatedItem, { expression: null }, { 
        evaluate: jest.fn(), 
        cleanup: jest.fn() 
      });
      
      // Should not throw error
      expect(() => {
        const spaceKeyEvent = createMockKeyboardEvent('keydown', ' ');
        isolatedItem.dispatchEvent(spaceKeyEvent);
      }).not.toThrow();
      
      document.body.removeChild(isolatedItem);
    });

    test('should handle movement with single item', () => {
      // Remove other items to have just one
      contextElement.removeChild(dragItem2);
      contextElement.removeChild(dragItem3);
      
      // Grab the single item
      const spaceKeyEvent = createMockKeyboardEvent('keydown', ' ');
      dragItem1.dispatchEvent(spaceKeyEvent);
      
      // Try to move - should wrap to same position
      const arrowDownEvent = createMockKeyboardEvent('keydown', 'ArrowDown');
      expect(() => {
        dragItem1.dispatchEvent(arrowDownEvent);
      }).not.toThrow();
      
      expect(contextElement.firstChild).toBe(dragItem1);
    });

    test('should handle empty drag context', () => {
      // Remove all items
      contextElement.innerHTML = '';
      
      const dragItemDirective = mockAlpine._getDirective('drag-item');
      
      // Should not throw when initializing item in empty context
      expect(() => {
        dragItemDirective(dragItem1, { expression: null }, { 
          evaluate: jest.fn(), 
          cleanup: jest.fn() 
        });
      }).not.toThrow();
    });
  });
});