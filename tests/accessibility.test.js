/**
 * Accessibility Tests
 * 
 * Comprehensive accessibility testing using jest-axe for WCAG compliance,
 * screen reader support, ARIA attributes, and accessibility best practices.
 */

import { jest } from '@jest/globals';
import jestAxe from 'jest-axe';
const { axe } = jestAxe;
import LivewireDragAndDrop from '../src/index.js';

describe('Accessibility Compliance', () => {
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
    dragContext = global.testUtils.createDragContext(['Task 1', 'Task 2', 'Task 3']);
    
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

  describe('WCAG Compliance', () => {
    test('should have no accessibility violations in initial state', async () => {
      await mockAlpine.nextTick();
      
      const results = await axe(dragContext);
      expect(results).toHaveNoViolations();
    });

    test('should have no accessibility violations during drag operation', async () => {
      await mockAlpine.nextTick();
      
      // Start drag operation
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      
      const results = await axe(dragContext);
      expect(results).toHaveNoViolations();
    });

    test('should have no accessibility violations with keyboard grab', async () => {
      await mockAlpine.nextTick();
      
      // Grab with keyboard
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      
      const results = await axe(dragContext);
      expect(results).toHaveNoViolations();
    });

    test('should have no accessibility violations in complex scenarios', async () => {
      await mockAlpine.nextTick();
      
      // Complex interaction: grab, move, and various states
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', 'ArrowDown'));
      dragItems[1].focus();
      
      const results = await axe(dragContext);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ARIA Attributes', () => {
    test('should have proper role attributes', async () => {
      await mockAlpine.nextTick();
      
      // Context should have application role
      expect(dragContext.getAttribute('role')).toBe('application');
      
      // Items should have button role
      dragItems.forEach(item => {
        expect(item.getAttribute('role')).toBe('button');
      });
    });

    test('should have proper aria-label for context', async () => {
      await mockAlpine.nextTick();
      
      expect(dragContext.getAttribute('aria-label')).toBe('Drag and drop interface');
    });

    test('should manage aria-grabbed states correctly', async () => {
      await mockAlpine.nextTick();
      
      // Initial state
      dragItems.forEach(item => {
        expect(item.getAttribute('aria-grabbed')).toBe('false');
      });
      
      // After mouse drag start
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      expect(dragItems[0].getAttribute('aria-grabbed')).toBe('true');
      expect(dragItems[1].getAttribute('aria-grabbed')).toBe('false'); // Others remain false
      
      // After drag end
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragend'));
      expect(dragItems[0].getAttribute('aria-grabbed')).toBe('false');
    });

    test('should manage aria-pressed states correctly', async () => {
      await mockAlpine.nextTick();
      
      // Initial state (should be false or null)
      dragItems.forEach(item => {
        const pressed = item.getAttribute('aria-pressed');
        expect(pressed === 'false' || pressed === null).toBe(true);
      });
      
      // After keyboard grab
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      expect(dragItems[0].getAttribute('aria-pressed')).toBe('true');
      
      // After keyboard drop
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      expect(dragItems[0].getAttribute('aria-pressed')).toBe('false');
    });

    test('should have aria-describedby pointing to instructions', async () => {
      await mockAlpine.nextTick();
      
      dragItems.forEach(item => {
        expect(item.getAttribute('aria-describedby')).toBe('drag-instructions');
      });
      
      // Instructions should exist
      const instructions = document.getElementById('drag-instructions');
      expect(instructions).not.toBeNull();
      expect(instructions.textContent).toBe(
        'Press space or enter to grab, arrow keys to move, space or enter to drop, escape to cancel'
      );
    });
  });

  describe('Screen Reader Support', () => {
    test('should create global aria-live region', async () => {
      await mockAlpine.nextTick();
      
      // Trigger announce to create live region
      dragContext._announce('Test message');
      
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).not.toBeNull();
      expect(liveRegion.getAttribute('aria-atomic')).toBe('true');
      expect(liveRegion.textContent).toBe('Test message');
    });

    test('should announce drag start events', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      
      // Mouse drag start
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      expect(announceSpy).toHaveBeenCalledWith('Item grabbed for dragging', 'assertive');
      
      // Keyboard grab
      dragItems[1].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      expect(announceSpy).toHaveBeenCalledWith(
        'Item grabbed. Use arrow keys to move, space to drop, escape to cancel.',
        'assertive'
      );
    });

    test('should announce movement during keyboard navigation', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      
      // Grab and move
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', 'ArrowDown'));
      
      expect(announceSpy).toHaveBeenCalledWith('Moved to position 2 of 3');
    });

    test('should announce drop completion', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      
      // Keyboard grab and drop
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      
      expect(announceSpy).toHaveBeenCalledWith('Item dropped at position 1 of 3.');
      
      // Mouse drag end
      dragItems[1].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      dragItems[1].dispatchEvent(global.testUtils.createDragEvent('dragend'));
      
      expect(announceSpy).toHaveBeenCalledWith('Item released');
    });

    test('should announce cancellation', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      
      // Grab and cancel
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', 'Escape'));
      
      expect(announceSpy).toHaveBeenCalledWith('Drag cancelled');
    });

    test('should use appropriate announcement priorities', async () => {
      await mockAlpine.nextTick();
      const announceSpy = jest.spyOn(dragContext, '_announce');
      
      // Assertive announcements for user actions
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      expect(announceSpy).toHaveBeenCalledWith('Item grabbed for dragging', 'assertive');
      
      // Polite announcements for status updates (default)
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragend'));
      expect(announceSpy).toHaveBeenCalledWith('Item released'); // Uses default 'polite'
    });
  });

  describe('Focus Management', () => {
    test('should have proper tabindex for keyboard navigation', async () => {
      await mockAlpine.nextTick();
      
      dragItems.forEach(item => {
        expect(item.tabIndex).toBe(0);
      });
    });

    test('should maintain focus after keyboard movement', async () => {
      await mockAlpine.nextTick();
      
      const focusSpy = jest.spyOn(dragItems[0], 'focus');
      
      // Grab and move
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', 'ArrowDown'));
      
      expect(focusSpy).toHaveBeenCalled();
    });

    test('should manage visual focus indicators', async () => {
      await mockAlpine.nextTick();
      
      // Focus event
      dragItems[0].dispatchEvent(new Event('focus'));
      expect(dragItems[0].classList.contains('is-focused')).toBe(true);
      
      // Blur event
      dragItems[0].dispatchEvent(new Event('blur'));
      expect(dragItems[0].classList.contains('is-focused')).toBe(false);
    });

    test('should have visible focus indicators', async () => {
      await mockAlpine.nextTick();
      
      // Focus item
      dragItems[0].focus();
      dragItems[0].dispatchEvent(new Event('focus'));
      
      // Should have visual focus class
      expect(dragItems[0].classList.contains('is-focused')).toBe(true);
      
      // Test with axe for focus visibility
      const results = await axe(dragContext, {
        rules: {
          'focus-order-semantics': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Accessibility', () => {
    test('should support standard keyboard interactions', async () => {
      await mockAlpine.nextTick();
      
      // Space and Enter should work for grab/drop
      const spaceEvent = global.testUtils.createKeyboardEvent('keydown', ' ');
      const enterEvent = global.testUtils.createKeyboardEvent('keydown', 'Enter');
      
      // Both should prevent default
      const spacePreventSpy = jest.spyOn(spaceEvent, 'preventDefault');
      const enterPreventSpy = jest.spyOn(enterEvent, 'preventDefault');
      
      dragItems[0].dispatchEvent(spaceEvent);
      dragItems[1].dispatchEvent(enterEvent);
      
      expect(spacePreventSpy).toHaveBeenCalled();
      expect(enterPreventSpy).toHaveBeenCalled();
    });

    test('should support arrow key navigation', async () => {
      await mockAlpine.nextTick();
      
      // All arrow keys should work when grabbed
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      
      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      arrowKeys.forEach(key => {
        const originalOrder = Array.from(dragContext.children);
        const event = global.testUtils.createKeyboardEvent('keydown', key);
        const preventSpy = jest.spyOn(event, 'preventDefault');
        
        dragItems[0].dispatchEvent(event);
        
        expect(preventSpy).toHaveBeenCalled();
        // Position should change (unless wrapping prevents it)
      });
    });

    test('should support escape key for cancellation', async () => {
      await mockAlpine.nextTick();
      
      // Grab item
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      expect(dragItems[0].getAttribute('aria-grabbed')).toBe('true');
      
      // Cancel with Escape
      const escapeEvent = global.testUtils.createKeyboardEvent('keydown', 'Escape');
      const preventSpy = jest.spyOn(escapeEvent, 'preventDefault');
      
      dragItems[0].dispatchEvent(escapeEvent);
      
      expect(preventSpy).toHaveBeenCalled();
      expect(dragItems[0].getAttribute('aria-grabbed')).toBe('false');
    });
  });

  describe('Semantic Structure', () => {
    test('should have proper semantic roles', async () => {
      await mockAlpine.nextTick();
      
      // Context should be an application
      expect(dragContext.getAttribute('role')).toBe('application');
      
      // Items should be buttons (interactive elements)
      dragItems.forEach(item => {
        expect(item.getAttribute('role')).toBe('button');
      });
    });

    test('should have proper labeling and descriptions', async () => {
      await mockAlpine.nextTick();
      
      // Context should be labeled
      expect(dragContext.getAttribute('aria-label')).toBe('Drag and drop interface');
      
      // Items should be described by instructions
      dragItems.forEach(item => {
        expect(item.getAttribute('aria-describedby')).toBe('drag-instructions');
      });
      
      // Instructions should exist and be screen reader only
      const instructions = document.getElementById('drag-instructions');
      expect(instructions).not.toBeNull();
      expect(instructions.className).toBe('sr-only');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should maintain accessibility during error states', async () => {
      await mockAlpine.nextTick();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Create orphan item (should trigger warning)
      const orphanItem = document.createElement('div');
      orphanItem.setAttribute('x-drag-item', '{}');
      document.body.appendChild(orphanItem);
      
      dragItemHandler(orphanItem, { expression: '{}' }, { evaluate: jest.fn(() => ({})) });
      
      // Should still pass accessibility tests (excluding region rule for utility elements)
      const results = await axe(document.body, {
        rules: {
          'region': { enabled: false }
        }
      });
      expect(results).toHaveNoViolations();
      
      consoleSpy.mockRestore();
    });

    test('should handle multiple drag contexts accessibly', async () => {
      await mockAlpine.nextTick();
      
      // Create second context
      const secondContext = global.testUtils.createDragContext(['Second 1', 'Second 2']);
      dragContextHandler(secondContext, { expression: '' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => jest.fn())
      });
      
      const secondItems = Array.from(secondContext.children);
      await Promise.all(secondItems.map((item, index) => 
        mockAlpine.nextTick(() => {
          dragItemHandler(item, 
            { expression: `{ id: ${index + 1} }` },
            { evaluate: jest.fn(() => ({ id: index + 1 })) }
          );
        })
      ));
      
      // Both contexts should be accessible (excluding region rule for utility elements)
      const results = await axe(document.body, {
        rules: {
          'region': { enabled: false }
        }
      });
      expect(results).toHaveNoViolations();
      
      // Should share the same aria-live region
      const liveRegions = document.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBe(1);
    });
  });

  describe('Dynamic Content Accessibility', () => {
    test('should maintain accessibility when items are added', async () => {
      await mockAlpine.nextTick();
      
      // Add new item
      const newItem = document.createElement('div');
      newItem.textContent = 'New Item';
      newItem.setAttribute('x-drag-item', '{ id: 4, text: "New Item" }');
      dragContext.appendChild(newItem);
      
      // Initialize new item
      await mockAlpine.nextTick(() => {
        dragItemHandler(newItem, 
          { expression: '{ id: 4, text: "New Item" }' },
          { evaluate: jest.fn(() => ({ id: 4, text: "New Item" })) }
        );
      });
      
      const results = await axe(dragContext);
      expect(results).toHaveNoViolations();
    });

    test('should maintain accessibility when items are removed', async () => {
      await mockAlpine.nextTick();
      
      // Remove an item
      const itemToRemove = dragItems[1];
      itemToRemove.remove();
      
      const results = await axe(dragContext);
      expect(results).toHaveNoViolations();
    });
  });
});