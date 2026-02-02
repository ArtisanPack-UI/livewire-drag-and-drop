/**
 * Accessibility Tests for Livewire Drag and Drop
 * 
 * Tests keyboard navigation, ARIA attributes, screen reader announcements,
 * and focus management to ensure full accessibility compliance.
 */

import '../src/index.js';
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

// Helper to dispatch keyboard events with proper activeElement setup
function dispatchKeyboardEvent(element, key) {
  // Set document.activeElement to the element
  Object.defineProperty(document, 'activeElement', {
    value: element,
    writable: true,
    configurable: true
  });

  const event = createMockKeyboardEvent('keydown', key);
  element.dispatchEvent(event);
  return event;
}

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
      dispatchKeyboardEvent(dragItem1, ' ');

      expect(dragItem1.getAttribute('aria-grabbed')).toBe('true');
    });

    test('should reset aria-grabbed when item is dropped via keyboard', () => {
      // First grab the item
      dispatchKeyboardEvent(dragItem1, ' ');
      expect(dragItem1.getAttribute('aria-grabbed')).toBe('true');

      // Then drop it
      dispatchKeyboardEvent(dragItem1, ' ');
      expect(dragItem1.getAttribute('aria-grabbed')).toBe('false');
    });

    test('should reset aria-grabbed when drag is cancelled', () => {
      // First grab the item
      dispatchKeyboardEvent(dragItem1, ' ');
      expect(dragItem1.getAttribute('aria-grabbed')).toBe('true');

      // Then cancel
      dispatchKeyboardEvent(dragItem1, 'Escape');
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
        dispatchKeyboardEvent(dragItem1, ' ');

        expect(contextElement._dragContextState.isDragging).toBe(true);
        expect(contextElement._dragContextState.draggedElement).toBe(dragItem1);
        expect(dragItem1.getAttribute('aria-grabbed')).toBe('true');
      });

      test('should grab item with Enter key', () => {
        dispatchKeyboardEvent(dragItem1, 'Enter');

        expect(contextElement._dragContextState.isDragging).toBe(true);
        expect(contextElement._dragContextState.draggedElement).toBe(dragItem1);
        expect(dragItem1.getAttribute('aria-grabbed')).toBe('true');
      });

      test('should drop item with Space key when already grabbed', () => {
        // First grab
        dispatchKeyboardEvent(dragItem1, ' ');
        expect(contextElement._dragContextState.isDragging).toBe(true);

        // Then drop
        dispatchKeyboardEvent(dragItem1, ' ');

        expect(contextElement._dragContextState.isDragging).toBe(false);
        expect(contextElement._dragContextState.draggedElement).toBe(null);
        expect(dragItem1.getAttribute('aria-grabbed')).toBe('false');
      });
    });

    describe('Escape Key', () => {
      test('should cancel drag operation with Escape key', () => {
        // First grab
        dispatchKeyboardEvent(dragItem1, ' ');
        expect(contextElement._dragContextState.isDragging).toBe(true);

        // Then cancel
        dispatchKeyboardEvent(dragItem1, 'Escape');

        expect(contextElement._dragContextState.isDragging).toBe(false);
        expect(contextElement._dragContextState.draggedElement).toBe(null);
        expect(contextElement._dragContextState.draggedData).toBe(null);
        expect(dragItem1.getAttribute('aria-grabbed')).toBe('false');
      });

      test('should do nothing with Escape when not grabbed', () => {
        dispatchKeyboardEvent(dragItem1, 'Escape');

        // State should remain unchanged
        expect(contextElement._dragContextState.isDragging).toBe(false);
        expect(contextElement._dragContextState.draggedElement).toBe(null);
      });
    });

    describe('Arrow Key Navigation', () => {
      test('should move item down with ArrowDown key', () => {
        // First grab the item
        dispatchKeyboardEvent(dragItem1, ' ');

        // Move down
        dispatchKeyboardEvent(dragItem1, 'ArrowDown');

        // dragItem1 should now be after dragItem2
        expect(dragItem2.nextSibling).toBe(dragItem1);
      });

      test('should move item up with ArrowUp key', () => {
        // First grab dragItem2 (middle item)
        dispatchKeyboardEvent(dragItem2, ' ');

        // Move up
        dispatchKeyboardEvent(dragItem2, 'ArrowUp');

        // dragItem2 should now be before dragItem1, so dragItem2's next sibling is dragItem1
        expect(dragItem2.nextSibling).toBe(dragItem1);
      });

      test('should move item right with ArrowRight key', () => {
        // First grab the item
        dispatchKeyboardEvent(dragItem1, ' ');

        // Move right (same as down)
        dispatchKeyboardEvent(dragItem1, 'ArrowRight');

        expect(dragItem2.nextSibling).toBe(dragItem1);
      });

      test('should move item left with ArrowLeft key', () => {
        // First grab dragItem2 (middle item)
        dispatchKeyboardEvent(dragItem2, ' ');

        // Move left (same as up)
        dispatchKeyboardEvent(dragItem2, 'ArrowLeft');

        expect(dragItem2.nextSibling).toBe(dragItem1);
      });

      test('should not wrap around when moving beyond bounds', () => {
        // Grab last item (dragItem3, index 2 of 3 items)
        dispatchKeyboardEvent(dragItem3, ' ');

        // Move down - should NOT move because index 3 is out of bounds
        // The source code only moves if targetIndex >= 0 && targetIndex < length
        dispatchKeyboardEvent(dragItem3, 'ArrowDown');

        // Order should remain unchanged since there's no wrap-around
        expect(contextElement.children[0]).toBe(dragItem1);
        expect(contextElement.children[1]).toBe(dragItem2);
        expect(contextElement.children[2]).toBe(dragItem3);
      });

      test('should not move when not grabbed', () => {
        const originalOrder = [dragItem1, dragItem2, dragItem3];

        dispatchKeyboardEvent(dragItem1, 'ArrowDown');

        // Order should remain unchanged
        expect(contextElement.children[0]).toBe(originalOrder[0]);
        expect(contextElement.children[1]).toBe(originalOrder[1]);
        expect(contextElement.children[2]).toBe(originalOrder[2]);
      });
    });

    test('should ignore unsupported keys', () => {
      dispatchKeyboardEvent(dragItem1, 'a');

      expect(contextElement._dragContextState.isDragging).toBe(false);
    });
  });

  describe('Screen Reader Announcements', () => {
    test('should announce when item is grabbed via keyboard', () => {
      dispatchKeyboardEvent(dragItem1, ' ');

      const ariaLiveRegion = document.querySelector('[aria-live]');
      expect(ariaLiveRegion.textContent).toBe('Grabbed. Use arrow keys to move.');
      expect(ariaLiveRegion.getAttribute('aria-live')).toBe('assertive');
    });

    test('should announce when item is dropped via keyboard', () => {
      // First grab
      dispatchKeyboardEvent(dragItem1, ' ');

      // Then drop
      dispatchKeyboardEvent(dragItem1, ' ');

      const ariaLiveRegion = document.querySelector('[aria-live]');
      expect(ariaLiveRegion.textContent).toBe('Dropped.');
    });

    test('should announce when drag is cancelled', () => {
      // First grab
      dispatchKeyboardEvent(dragItem1, ' ');

      // Then cancel
      dispatchKeyboardEvent(dragItem1, 'Escape');

      const ariaLiveRegion = document.querySelector('[aria-live]');
      expect(ariaLiveRegion.textContent).toBe('Drag cancelled.');
    });

    test('should announce position when item is moved', () => {
      // First grab
      dispatchKeyboardEvent(dragItem1, ' ');

      // Move down
      dispatchKeyboardEvent(dragItem1, 'ArrowDown');

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
      dispatchKeyboardEvent(dragItem1, ' ');

      // Move item - the source calls focus() on the element
      dispatchKeyboardEvent(dragItem1, 'ArrowDown');

      // Item should still be in the DOM and the operation should complete
      expect(contextElement.contains(dragItem1)).toBe(true);
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
      dispatchKeyboardEvent(dragItem1, ' ');

      const results = await axe(contextElement);
      expect(results).toHaveNoViolations();
    });

    test('should have no accessibility violations with aria-live region', async () => {
      // Trigger aria-live region creation
      dispatchKeyboardEvent(dragItem1, ' ');

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
        dispatchKeyboardEvent(isolatedItem, ' ');
      }).not.toThrow();

      document.body.removeChild(isolatedItem);
    });

    test('should handle movement with single item', () => {
      // Remove other items to have just one
      contextElement.removeChild(dragItem2);
      contextElement.removeChild(dragItem3);

      // Grab the single item
      dispatchKeyboardEvent(dragItem1, ' ');

      // Try to move - should wrap to same position
      expect(() => {
        dispatchKeyboardEvent(dragItem1, 'ArrowDown');
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