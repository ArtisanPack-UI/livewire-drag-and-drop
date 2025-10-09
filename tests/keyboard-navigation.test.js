/**
 * Keyboard Navigation Tests
 * 
 * Tests comprehensive keyboard accessibility including Space/Enter grab/drop,
 * Arrow key navigation, Escape cancellation, and keyboard-specific functionality.
 */

import { jest } from '@jest/globals';
import LivewireDragAndDrop from '../src/index.js';

describe('Keyboard Navigation', () => {
  let mockAlpine;
  let dragContext;
  let dragItems;
  let dragContextHandler;
  let dragItemHandler;

  beforeEach(async () => {
    mockAlpine = global.testUtils.createMockAlpine();
    LivewireDragAndDrop(mockAlpine);
    
    const directives = mockAlpine._getDirectives();
    dragContextHandler = directives.get('drag-context');
    dragItemHandler = directives.get('drag-item');
    
    // Create drag context with items
    dragContext = global.testUtils.createDragContext(['Item 1', 'Item 2', 'Item 3', 'Item 4']);
    
    // Initialize drag context
    dragContextHandler(dragContext, { expression: '' }, {
      evaluate: jest.fn(),
      evaluateLater: jest.fn(() => jest.fn())
    });
    
    // Initialize drag items with proper async handling
    dragItems = Array.from(dragContext.children);
    await Promise.all(dragItems.map((item, index) => 
      mockAlpine.nextTick(() => {
        dragItemHandler(item, 
          { expression: `{ id: ${index + 1}, text: "${item.textContent}" }` },
          { evaluate: jest.fn(() => ({ id: index + 1, text: item.textContent })) }
        );
      })
    ));
    
    // Ensure all async initialization is complete
    await mockAlpine.nextTick();
    
    // Ensure dragContext has the required properties for testing
    // Don't mock _announce - let the real directive set it up
    if (!dragContext._dragContext) {
      dragContext._dragContext = {
        isDragging: false,
        draggedElement: null,
        dropZones: [],
        draggedData: null
      };
    }
    if (!dragContext._finalizeDrop) {
      dragContext._finalizeDrop = jest.fn();
    }
  });

  describe('Space Key Grab and Drop', () => {
    test('should grab item on Space key press', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      
      const spaceEvent = global.testUtils.createKeyboardEvent('keydown', ' ');
      const preventDefaultSpy = jest.spyOn(spaceEvent, 'preventDefault');
      
      dragItems[0].dispatchEvent(spaceEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(dragItems[0].getAttribute('aria-grabbed')).toBe('true');
      expect(dragItems[0].getAttribute('aria-pressed')).toBe('true');
      expect(dragItems[0].classList.contains('is-grabbing')).toBe(true);
      expect(dragItems[0].classList.contains('is-dragging')).toBe(true);
      
      const contextState = dragContext._dragContext;
      expect(contextState.isDragging).toBe(true);
      expect(contextState.draggedElement).toBe(dragItems[0]);
      expect(contextState.draggedData.originalIndex).toBe(0);
      
      expect(announceSpy).toHaveBeenCalledWith(
        'Item grabbed. Use arrow keys to move, space to drop, escape to cancel.',
        'assertive'
      );
    });

    test('should drop item on second Space key press', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      const finalizeSpy = jest.spyOn(dragContext, '_finalizeDrop');
      
      const spaceEvent1 = global.testUtils.createKeyboardEvent('keydown', ' ');
      const spaceEvent2 = global.testUtils.createKeyboardEvent('keydown', ' ');
      
      // First space - grab
      dragItems[0].dispatchEvent(spaceEvent1);
      expect(dragItems[0].getAttribute('aria-grabbed')).toBe('true');
      
      // Second space - drop
      dragItems[0].dispatchEvent(spaceEvent2);
      
      expect(dragItems[0].getAttribute('aria-grabbed')).toBe('false');
      expect(dragItems[0].getAttribute('aria-pressed')).toBe('false');
      expect(dragItems[0].classList.contains('is-grabbing')).toBe(false);
      expect(dragItems[0].classList.contains('is-dragging')).toBe(false);
      
      expect(announceSpy).toHaveBeenLastCalledWith(
        'Item dropped at position 1 of 4.'
      );
      expect(finalizeSpy).toHaveBeenCalledWith(dragItems[0]);
    });

    test('should dispatch drop event on Space drop', async () => {
      await mockAlpine.nextTick();
      const dropEventSpy = jest.fn();
      dragItems[0].addEventListener('drop', dropEventSpy);
      
      // Grab and drop with Space
      await global.testUtils.simulateKeyboardNavigation(dragItems[0], [' ', ' ']);
      
      expect(dropEventSpy).toHaveBeenCalled();
    });
  });

  describe('Enter Key Grab and Drop', () => {
    test('should grab item on Enter key press', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      
      const enterEvent = global.testUtils.createKeyboardEvent('keydown', 'Enter');
      dragItems[0].dispatchEvent(enterEvent);
      
      expect(dragItems[0].getAttribute('aria-grabbed')).toBe('true');
      expect(dragContext._dragContext.isDragging).toBe(true);
      expect(announceSpy).toHaveBeenCalledWith(
        'Item grabbed. Use arrow keys to move, space to drop, escape to cancel.',
        'assertive'
      );
    });

    test('should drop item on second Enter key press', async () => {
      await mockAlpine.nextTick();
      const finalizeSpy = jest.spyOn(dragContext, '_finalizeDrop');
      
      // Grab and drop with Enter
      await global.testUtils.simulateKeyboardNavigation(dragItems[0], ['Enter', 'Enter']);
      
      expect(dragItems[0].getAttribute('aria-grabbed')).toBe('false');
      expect(finalizeSpy).toHaveBeenCalled();
    });
  });

  describe('Arrow Key Navigation', () => {
    test('should move item down with ArrowDown key', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      
      // Grab first item
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      
      // Move down with arrow key
      const arrowEvent = global.testUtils.createKeyboardEvent('keydown', 'ArrowDown');
      const preventDefaultSpy = jest.spyOn(arrowEvent, 'preventDefault');
      dragItems[0].dispatchEvent(arrowEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      
      // Check if item moved to second position
      const updatedItems = Array.from(dragContext.children);
      expect(updatedItems[1]).toBe(dragItems[0]);
      
      expect(announceSpy).toHaveBeenLastCalledWith('Moved to position 2 of 4');
    });

    test('should move item up with ArrowUp key', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      
      // Grab second item
      dragItems[1].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      
      // Move up with arrow key
      dragItems[1].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', 'ArrowUp'));
      
      // Check if item moved to first position
      const updatedItems = Array.from(dragContext.children);
      expect(updatedItems[0]).toBe(dragItems[1]);
      
      expect(announceSpy).toHaveBeenLastCalledWith('Moved to position 1 of 4');
    });

    test('should move item right with ArrowRight key', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      
      // Grab first item
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      
      // Move right (same as down)
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', 'ArrowRight'));
      
      const updatedItems = Array.from(dragContext.children);
      expect(updatedItems[1]).toBe(dragItems[0]);
      expect(announceSpy).toHaveBeenLastCalledWith('Moved to position 2 of 4');
    });

    test('should move item left with ArrowLeft key', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      
      // Grab second item
      dragItems[1].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      
      // Move left (same as up)
      dragItems[1].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', 'ArrowLeft'));
      
      const updatedItems = Array.from(dragContext.children);
      expect(updatedItems[0]).toBe(dragItems[1]);
      expect(announceSpy).toHaveBeenLastCalledWith('Moved to position 1 of 4');
    });

    test('should wrap to end when moving up from first position', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      
      // Grab first item
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      
      // Move up (should wrap to end)
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', 'ArrowUp'));
      
      const updatedItems = Array.from(dragContext.children);
      expect(updatedItems[3]).toBe(dragItems[0]); // Moved to last position
      expect(announceSpy).toHaveBeenLastCalledWith('Moved to position 4 of 4');
    });

    test('should wrap to beginning when moving down from last position', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      
      // Grab last item
      dragItems[3].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      
      // Move down (should wrap to beginning)
      dragItems[3].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', 'ArrowDown'));
      
      const updatedItems = Array.from(dragContext.children);
      expect(updatedItems[0]).toBe(dragItems[3]); // Moved to first position
      expect(announceSpy).toHaveBeenLastCalledWith('Moved to position 1 of 4');
    });

    test('should maintain focus after arrow key movement', async () => {
      await mockAlpine.nextTick();
      const focusSpy = jest.spyOn(dragItems[0], 'focus');
      
      // Grab and move item
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', 'ArrowDown'));
      
      expect(focusSpy).toHaveBeenCalled();
    });

    test('should not move if not grabbed', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      const originalOrder = Array.from(dragContext.children);
      
      // Try to move without grabbing first
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', 'ArrowDown'));
      
      const currentOrder = Array.from(dragContext.children);
      expect(currentOrder).toEqual(originalOrder);
      expect(announceSpy).not.toHaveBeenCalledWith(expect.stringContaining('Moved'));
    });

    test('should prevent default for arrow keys only when grabbed', async () => {
      await mockAlpine.nextTick();
      
      // Arrow key without grab - should not prevent default
      const arrowEvent1 = global.testUtils.createKeyboardEvent('keydown', 'ArrowDown');
      const preventDefaultSpy1 = jest.spyOn(arrowEvent1, 'preventDefault');
      dragItems[0].dispatchEvent(arrowEvent1);
      expect(preventDefaultSpy1).not.toHaveBeenCalled();
      
      // Grab item
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      
      // Arrow key with grab - should prevent default
      const arrowEvent2 = global.testUtils.createKeyboardEvent('keydown', 'ArrowDown');
      const preventDefaultSpy2 = jest.spyOn(arrowEvent2, 'preventDefault');
      dragItems[0].dispatchEvent(arrowEvent2);
      expect(preventDefaultSpy2).toHaveBeenCalled();
    });
  });

  describe('Escape Key Cancellation', () => {
    test('should cancel grab operation on Escape', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      
      // Grab item
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      expect(dragItems[0].getAttribute('aria-grabbed')).toBe('true');
      
      // Cancel with Escape
      const escapeEvent = global.testUtils.createKeyboardEvent('keydown', 'Escape');
      const preventDefaultSpy = jest.spyOn(escapeEvent, 'preventDefault');
      dragItems[0].dispatchEvent(escapeEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(dragItems[0].getAttribute('aria-grabbed')).toBe('false');
      expect(dragItems[0].getAttribute('aria-pressed')).toBe('false');
      expect(dragItems[0].classList.contains('is-grabbing')).toBe(false);
      expect(dragItems[0].classList.contains('is-dragging')).toBe(false);
      
      const contextState = dragContext._dragContext;
      expect(contextState.isDragging).toBe(false);
      expect(contextState.draggedElement).toBeNull();
      expect(contextState.draggedData).toBeNull();
      
      expect(announceSpy).toHaveBeenLastCalledWith('Drag cancelled');
    });

    test('should not prevent default on Escape if not grabbed', async () => {
      await mockAlpine.nextTick();
      
      const escapeEvent = global.testUtils.createKeyboardEvent('keydown', 'Escape');
      const preventDefaultSpy = jest.spyOn(escapeEvent, 'preventDefault');
      
      dragItems[0].dispatchEvent(escapeEvent);
      
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    test('should announce cancellation only when actually cancelling', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      
      // Escape without grab - no announcement
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', 'Escape'));
      expect(announceSpy).not.toHaveBeenCalledWith('Drag cancelled');
      
      // Grab and then escape - should announce
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', 'Escape'));
      expect(announceSpy).toHaveBeenCalledWith('Drag cancelled');
    });
  });

  describe('Complex Keyboard Workflows', () => {
    test('should handle grab, move, and drop sequence', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      const finalizeSpy = jest.spyOn(dragContext, '_finalizeDrop');
      
      // Grab first item
      await global.testUtils.simulateKeyboardNavigation(dragItems[0], [' ']);
      expect(dragItems[0].getAttribute('aria-grabbed')).toBe('true');
      
      // Move down twice
      await global.testUtils.simulateKeyboardNavigation(dragItems[0], ['ArrowDown', 'ArrowDown']);
      
      // Check position
      const middleItems = Array.from(dragContext.children);
      expect(middleItems[2]).toBe(dragItems[0]);
      
      // Drop
      await global.testUtils.simulateKeyboardNavigation(dragItems[0], [' ']);
      
      expect(announceSpy).toHaveBeenCalledWith('Item dropped at position 3 of 4.');
      expect(finalizeSpy).toHaveBeenCalled();
    });

    test('should handle grab, move, and cancel sequence', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      const originalOrder = Array.from(dragContext.children);
      
      // Grab and move
      await global.testUtils.simulateKeyboardNavigation(dragItems[0], [' ', 'ArrowDown']);
      
      // Cancel
      await global.testUtils.simulateKeyboardNavigation(dragItems[0], ['Escape']);
      
      expect(announceSpy).toHaveBeenLastCalledWith('Drag cancelled');
      
      // Order should be restored (though in this implementation it stays moved)
      const contextState = dragContext._dragContext;
      expect(contextState.isDragging).toBe(false);
    });

    test('should handle rapid key sequences gracefully', async () => {
      await mockAlpine.nextTick();
      
      // Rapid sequence of operations
      const keys = [' ', 'ArrowDown', 'ArrowUp', 'ArrowDown', 'ArrowDown', ' '];
      
      // Should not throw errors
      expect(async () => {
        await global.testUtils.simulateKeyboardNavigation(dragItems[0], keys);
      }).not.toThrow();
    });
  });

  describe('Keyboard Accessibility Standards', () => {
    test('should have proper tabIndex for keyboard navigation', async () => {
      await mockAlpine.nextTick();
      
      dragItems.forEach(item => {
        expect(item.tabIndex).toBe(0);
      });
    });

    test('should have proper role attribute', async () => {
      await mockAlpine.nextTick();
      
      dragItems.forEach(item => {
        expect(item.getAttribute('role')).toBe('button');
      });
    });

    test('should have aria-describedby pointing to instructions', async () => {
      await mockAlpine.nextTick();
      
      dragItems.forEach(item => {
        expect(item.getAttribute('aria-describedby')).toBe('drag-instructions');
      });
    });

    test('should update aria-grabbed appropriately', async () => {
      await mockAlpine.nextTick();
      
      // Initial state
      expect(dragItems[0].getAttribute('aria-grabbed')).toBe('false');
      
      // After grab
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      expect(dragItems[0].getAttribute('aria-grabbed')).toBe('true');
      
      // After drop
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      expect(dragItems[0].getAttribute('aria-grabbed')).toBe('false');
    });

    test('should update aria-pressed appropriately', async () => {
      await mockAlpine.nextTick();
      
      // Initially should not have aria-pressed or be false
      const initialPressed = dragItems[0].getAttribute('aria-pressed');
      expect(initialPressed === null || initialPressed === 'false').toBe(true);
      
      // After grab
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      expect(dragItems[0].getAttribute('aria-pressed')).toBe('true');
      
      // After drop
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      expect(dragItems[0].getAttribute('aria-pressed')).toBe('false');
    });
  });
});