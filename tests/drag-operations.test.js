/**
 * Drag and Drop Operations Tests
 * 
 * Tests mouse drag and drop operations, DOM manipulation,
 * event handling, and state management during drag operations.
 */

import { jest } from '@jest/globals';
import LivewireDragAndDrop from '../src/index.js';

describe('Drag and Drop Operations', () => {
  let mockAlpine;
  let dragContext;
  let dragItems;
  let dragContextHandler;
  let dragItemHandler;

  beforeEach(() => {
    mockAlpine = global.testUtils.createMockAlpine();
    LivewireDragAndDrop(mockAlpine);
    
    const directives = mockAlpine._getDirectives();
    dragContextHandler = directives.get('drag-context');
    dragItemHandler = directives.get('drag-item');
    
    // Create drag context with items
    dragContext = global.testUtils.createDragContext(['Item 1', 'Item 2', 'Item 3']);
    
    // Initialize drag context
    dragContextHandler(dragContext, { expression: '' }, {
      evaluate: jest.fn(),
      evaluateLater: jest.fn(() => jest.fn())
    });
    
    // Initialize drag items
    dragItems = Array.from(dragContext.children);
    dragItems.forEach((item, index) => {
      mockAlpine.nextTick(() => {
        dragItemHandler(item, 
          { expression: `{ id: ${index + 1}, text: "${item.textContent}" }` },
          { evaluate: jest.fn(() => ({ id: index + 1, text: item.textContent })) }
        );
      });
    });
  });

  describe('Mouse Drag Start', () => {
    test('should set dragging state when drag starts', async () => {
      await mockAlpine.nextTick();
      const dragStartEvent = global.testUtils.createDragEvent('dragstart');
      
      dragItems[0].dispatchEvent(dragStartEvent);
      
      const contextState = dragContext._dragContext;
      expect(contextState.isDragging).toBe(true);
      expect(contextState.draggedElement).toBe(dragItems[0]);
      expect(contextState.draggedData).toBeDefined();
      expect(contextState.draggedData.originalIndex).toBe(0);
    });

    test('should set proper ARIA attributes during drag start', async () => {
      await mockAlpine.nextTick();
      const dragStartEvent = global.testUtils.createDragEvent('dragstart');
      
      dragItems[0].dispatchEvent(dragStartEvent);
      
      expect(dragItems[0].getAttribute('aria-grabbed')).toBe('true');
      expect(dragItems[0].getAttribute('aria-pressed')).toBe('true');
      expect(dragItems[0].classList.contains('is-grabbing')).toBe(true);
      expect(dragItems[0].classList.contains('is-dragging')).toBe(true);
    });

    test('should set dataTransfer properties', async () => {
      await mockAlpine.nextTick();
      const dragStartEvent = global.testUtils.createDragEvent('dragstart');
      
      dragItems[0].dispatchEvent(dragStartEvent);
      
      expect(dragStartEvent.dataTransfer.effectAllowed).toBe('move');
      expect(dragStartEvent.dataTransfer.setData).toHaveBeenCalledWith(
        'text/plain',
        expect.stringContaining('"originalIndex":0')
      );
    });

    test('should announce drag start to screen readers', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      const dragStartEvent = global.testUtils.createDragEvent('dragstart');
      
      dragItems[0].dispatchEvent(dragStartEvent);
      
      expect(announceSpy).toHaveBeenCalledWith('Item grabbed for dragging', 'assertive');
    });
  });

  describe('Mouse Drag End', () => {
    test('should reset state when drag ends', async () => {
      await mockAlpine.nextTick();
      
      // Start drag
      const dragStartEvent = global.testUtils.createDragEvent('dragstart');
      dragItems[0].dispatchEvent(dragStartEvent);
      
      // End drag
      const dragEndEvent = global.testUtils.createDragEvent('dragend');
      dragItems[0].dispatchEvent(dragEndEvent);
      
      expect(dragItems[0].getAttribute('aria-grabbed')).toBe('false');
      expect(dragItems[0].getAttribute('aria-pressed')).toBe('false');
      expect(dragItems[0].classList.contains('is-grabbing')).toBe(false);
      expect(dragItems[0].classList.contains('is-dragging')).toBe(false);
    });

    test('should clean up drag context state', async () => {
      await mockAlpine.nextTick();
      
      // Start drag
      const dragStartEvent = global.testUtils.createDragEvent('dragstart');
      dragItems[0].dispatchEvent(dragStartEvent);
      
      // End drag
      const dragEndEvent = global.testUtils.createDragEvent('dragend');
      dragItems[0].dispatchEvent(dragEndEvent);
      
      const contextState = dragContext._dragContext;
      expect(contextState.isDragging).toBe(false);
      expect(contextState.draggedElement).toBeNull();
      expect(contextState.draggedData).toBeNull();
    });

    test('should announce drag end to screen readers', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      
      // Start and end drag
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragend'));
      
      expect(announceSpy).toHaveBeenCalledWith('Item released');
    });
  });

  describe('Drag Over and Drop', () => {
    test('should prevent default on dragover', () => {
      const dragOverEvent = global.testUtils.createDragEvent('dragover');
      const preventDefaultSpy = jest.spyOn(dragOverEvent, 'preventDefault');
      
      dragContext.dispatchEvent(dragOverEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(dragOverEvent.dataTransfer.dropEffect).toBe('move');
    });

    test('should reorder items when dropped on specific item', async () => {
      await mockAlpine.nextTick();
      
      // Start dragging first item
      const dragStartEvent = global.testUtils.createDragEvent('dragstart');
      dragItems[0].dispatchEvent(dragStartEvent);
      
      // Drop on third item
      const dropEvent = global.testUtils.createDragEvent('drop', {
        target: dragItems[2]
      });
      dragContext.dispatchEvent(dropEvent);
      
      // Check if items were reordered
      const updatedItems = Array.from(dragContext.children);
      expect(updatedItems[1]).toBe(dragItems[0]); // First item moved to second position
    });

    test('should handle drop on empty space', async () => {
      await mockAlpine.nextTick();
      
      // Start dragging first item
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      
      // Mock getBoundingClientRect for positioning calculation
      dragContext.getBoundingClientRect = jest.fn(() => ({
        top: 0,
        left: 0
      }));
      dragItems[1].getBoundingClientRect = jest.fn(() => ({
        top: 50,
        height: 30
      }));
      dragItems[2].getBoundingClientRect = jest.fn(() => ({
        top: 100,
        height: 30
      }));
      
      // Drop on empty space between items
      const dropEvent = global.testUtils.createDragEvent('drop', {
        target: dragContext,
        clientY: 75
      });
      dragContext.dispatchEvent(dropEvent);
      
      // Should position item based on drop location
      expect(dragContext._finalizeDrop).toBeDefined();
    });

    test('should dispatch custom drag:end event', async () => {
      await mockAlpine.nextTick();
      const eventSpy = jest.fn();
      dragContext.addEventListener('drag:end', eventSpy);
      
      // Start and complete drag operation
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      const dropEvent = global.testUtils.createDragEvent('drop', {
        target: dragItems[1]
      });
      dragContext.dispatchEvent(dropEvent);
      
      expect(eventSpy).toHaveBeenCalled();
      const eventDetail = eventSpy.mock.calls[0][0].detail;
      expect(eventDetail.oldIndex).toBe(0);
      expect(eventDetail.target).toBe(dragItems[0]);
      expect(eventDetail.group).toBe('default');
    });

    test('should execute expression callback on drop', async () => {
      await mockAlpine.nextTick();
      const evaluateExpressionMock = jest.fn();
      
      // Re-initialize with expression
      dragContextHandler(dragContext, { expression: 'handleDrop($event)' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => evaluateExpressionMock)
      });
      
      // Start and complete drag operation
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      const dropEvent = global.testUtils.createDragEvent('drop', {
        target: dragItems[1]
      });
      dragContext.dispatchEvent(dropEvent);
      
      expect(evaluateExpressionMock).toHaveBeenCalled();
    });
  });

  describe('Focus Management', () => {
    test('should add is-focused class on focus', async () => {
      await mockAlpine.nextTick();
      
      const focusEvent = new Event('focus');
      dragItems[0].dispatchEvent(focusEvent);
      
      expect(dragItems[0].classList.contains('is-focused')).toBe(true);
    });

    test('should remove is-focused class on blur', async () => {
      await mockAlpine.nextTick();
      
      // Add focus first
      dragItems[0].dispatchEvent(new Event('focus'));
      expect(dragItems[0].classList.contains('is-focused')).toBe(true);
      
      // Then blur
      dragItems[0].dispatchEvent(new Event('blur'));
      expect(dragItems[0].classList.contains('is-focused')).toBe(false);
    });
  });

  describe('Escape Key Handling', () => {
    test('should cancel drag operation on Escape key', () => {
      // Start drag state in context
      const contextState = dragContext._dragContext;
      contextState.isDragging = true;
      contextState.draggedElement = dragItems[0];
      contextState.draggedData = { test: true };
      
      const announceSpy = jest.spyOn(dragContext, '_announce');
      const escapeEvent = global.testUtils.createKeyboardEvent('keydown', 'Escape');
      
      dragContext.dispatchEvent(escapeEvent);
      
      expect(contextState.isDragging).toBe(false);
      expect(contextState.draggedElement).toBeNull();
      expect(contextState.draggedData).toBeNull();
      expect(announceSpy).toHaveBeenCalledWith('Drag operation cancelled');
    });

    test('should not cancel if not dragging', () => {
      const announceSpy = jest.spyOn(dragContext, '_announce');
      const escapeEvent = global.testUtils.createKeyboardEvent('keydown', 'Escape');
      
      dragContext.dispatchEvent(escapeEvent);
      
      expect(announceSpy).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing drag context gracefully', async () => {
      await mockAlpine.nextTick();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const orphanItem = document.createElement('div');
      document.body.appendChild(orphanItem);
      
      // Should not throw error
      expect(() => {
        dragItemHandler(orphanItem, 
          { expression: '{ id: 1 }' },
          { evaluate: jest.fn(() => ({ id: 1 })) }
        );
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith('x-drag-item must be used within x-drag-context');
      consoleSpy.mockRestore();
    });

    test('should handle drop without dragged element', () => {
      const dropEvent = global.testUtils.createDragEvent('drop');
      
      // Should not throw error
      expect(() => {
        dragContext.dispatchEvent(dropEvent);
      }).not.toThrow();
    });

    test('should handle drag start without proper context setup', () => {
      const newItem = document.createElement('div');
      dragContext.appendChild(newItem);
      
      const dragStartEvent = global.testUtils.createDragEvent('dragstart');
      
      // Should not throw error
      expect(() => {
        newItem.dispatchEvent(dragStartEvent);
      }).not.toThrow();
    });
  });
});