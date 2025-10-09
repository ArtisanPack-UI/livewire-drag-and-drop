/**
 * Livewire Integration Tests
 * 
 * Tests custom events, Livewire integration, expression evaluation,
 * and communication between drag and drop operations and Livewire components.
 */

import { jest } from '@jest/globals';
import LivewireDragAndDrop from '../src/index.js';

describe('Livewire Integration', () => {
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
    dragContext = global.testUtils.createDragContext(['Task A', 'Task B', 'Task C']);
    
    dragItems = Array.from(dragContext.children);
  });

  describe('Custom Events', () => {
    test('should dispatch drag:end event with correct details', async () => {
      // Initialize context
      dragContextHandler(dragContext, { expression: '' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => jest.fn())
      });
      
      // Initialize items
      await Promise.all(dragItems.map((item, index) => 
        mockAlpine.nextTick(() => {
          dragItemHandler(item, 
            { expression: `{ id: ${index + 1}, text: "${item.textContent}" }` },
            { evaluate: jest.fn(() => ({ id: index + 1, text: item.textContent })) }
          );
        })
      ));

      const eventSpy = jest.fn();
      dragContext.addEventListener('drag:end', eventSpy);
      
      // Start drag and drop operation
      await mockAlpine.nextTick();
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      
      const dropEvent = global.testUtils.createDragEvent('drop', {
        target: dragItems[2]
      });
      dragContext.dispatchEvent(dropEvent);
      
      expect(eventSpy).toHaveBeenCalled();
      
      const event = eventSpy.mock.calls[0][0];
      expect(event.type).toBe('drag:end');
      expect(event.bubbles).toBe(true);
      
      const detail = event.detail;
      expect(detail.oldIndex).toBe(0);
      expect(detail.target).toBe(dragItems[0]);
      expect(detail.item).toBe(dragItems[0]);
      expect(detail.group).toBe('default');
      expect(typeof detail.newIndex).toBe('number');
    });

    test('should use custom group name from context attribute', async () => {
      dragContext.setAttribute('x-drag-context', 'kanban-board');
      
      dragContextHandler(dragContext, { expression: '' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => jest.fn())
      });
      
      await Promise.all(dragItems.map((item, index) => 
        mockAlpine.nextTick(() => {
          dragItemHandler(item, 
            { expression: `{ id: ${index + 1} }` },
            { evaluate: jest.fn(() => ({ id: index + 1 })) }
          );
        })
      ));

      const eventSpy = jest.fn();
      dragContext.addEventListener('drag:end', eventSpy);
      
      await mockAlpine.nextTick();
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      dragContext.dispatchEvent(global.testUtils.createDragEvent('drop', { target: dragItems[1] }));
      
      const detail = eventSpy.mock.calls[0][0].detail;
      expect(detail.group).toBe('kanban-board');
    });

    test('should include original and new positions in event detail', async () => {
      dragContextHandler(dragContext, { expression: '' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => jest.fn())
      });
      
      await Promise.all(dragItems.map((item, index) => 
        mockAlpine.nextTick(() => {
          dragItemHandler(item, 
            { expression: `{ id: ${index + 1} }` },
            { evaluate: jest.fn(() => ({ id: index + 1 })) }
          );
        })
      ));

      const eventSpy = jest.fn();
      dragContext.addEventListener('drag:end', eventSpy);
      
      // Move first item to third position
      await mockAlpine.nextTick();
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      dragContext.dispatchEvent(global.testUtils.createDragEvent('drop', { target: dragItems[2] }));
      
      const detail = eventSpy.mock.calls[0][0].detail;
      expect(detail.oldIndex).toBe(0);
      expect(detail.newIndex).toBeGreaterThanOrEqual(0);
    });

    test('should dispatch drop event from keyboard interactions', async () => {
      dragContextHandler(dragContext, { expression: '' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => jest.fn())
      });
      
      await Promise.all(dragItems.map((item, index) => 
        mockAlpine.nextTick(() => {
          dragItemHandler(item, 
            { expression: `{ id: ${index + 1} }` },
            { evaluate: jest.fn(() => ({ id: index + 1 })) }
          );
        })
      ));

      const dropEventSpy = jest.fn();
      dragItems[0].addEventListener('drop', dropEventSpy);
      
      await mockAlpine.nextTick();
      
      // Keyboard grab and drop sequence
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      dragItems[0].dispatchEvent(global.testUtils.createKeyboardEvent('keydown', ' '));
      
      expect(dropEventSpy).toHaveBeenCalled();
    });
  });

  describe('Expression Evaluation', () => {
    test('should evaluate context expression on drop', async () => {
      const evaluateExpressionMock = jest.fn();
      const mockExpression = 'handleDrop($event)';
      
      dragContextHandler(dragContext, { expression: mockExpression }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => evaluateExpressionMock)
      });
      
      await Promise.all(dragItems.map((item, index) => 
        mockAlpine.nextTick(() => {
          dragItemHandler(item, 
            { expression: `{ id: ${index + 1} }` },
            { evaluate: jest.fn(() => ({ id: index + 1 })) }
          );
        })
      ));

      await mockAlpine.nextTick();
      
      // Perform drag and drop
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      dragContext.dispatchEvent(global.testUtils.createDragEvent('drop', { target: dragItems[1] }));
      
      expect(evaluateExpressionMock).toHaveBeenCalled();
    });

    test('should not evaluate expression if empty', async () => {
      const evaluateExpressionMock = jest.fn();
      
      dragContextHandler(dragContext, { expression: '' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => evaluateExpressionMock)
      });
      
      await Promise.all(dragItems.map((item, index) => 
        mockAlpine.nextTick(() => {
          dragItemHandler(item, 
            { expression: `{ id: ${index + 1} }` },
            { evaluate: jest.fn(() => ({ id: index + 1 })) }
          );
        })
      ));

      await mockAlpine.nextTick();
      
      // Perform drag and drop
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      dragContext.dispatchEvent(global.testUtils.createDragEvent('drop', { target: dragItems[1] }));
      
      expect(evaluateExpressionMock).not.toHaveBeenCalled();
    });

    test('should evaluate item expressions for drag data', async () => {
      const evaluateItemExpressionMock = jest.fn(() => ({ id: 42, title: 'Test Item', priority: 'high' }));
      
      dragContextHandler(dragContext, { expression: '' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => jest.fn())
      });
      
      await mockAlpine.nextTick(() => {
        dragItemHandler(dragItems[0], 
          { expression: '{ id: item.id, title: item.title, priority: item.priority }' },
          { evaluate: evaluateItemExpressionMock }
        );
      });

      await mockAlpine.nextTick();
      
      // Start drag
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      
      expect(evaluateItemExpressionMock).toHaveBeenCalled();
      
      // Check that drag data includes evaluated expression
      const contextState = dragContext._dragContext;
      expect(contextState.draggedData.id).toBe(42);
      expect(contextState.draggedData.title).toBe('Test Item');
      expect(contextState.draggedData.priority).toBe('high');
    });

    test('should provide context data to expression evaluation', async () => {
      const evaluateExpressionMock = jest.fn();
      
      dragContextHandler(dragContext, { expression: 'updateOrder(draggedElement, dropTarget)' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => evaluateExpressionMock)
      });
      
      await Promise.all(dragItems.map((item, index) => 
        mockAlpine.nextTick(() => {
          dragItemHandler(item, 
            { expression: `{ id: ${index + 1} }` },
            { evaluate: jest.fn(() => ({ id: index + 1 })) }
          );
        })
      ));

      await mockAlpine.nextTick();
      
      // Perform drag and drop
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      const dropEvent = global.testUtils.createDragEvent('drop', { target: dragItems[1] });
      dragContext.dispatchEvent(dropEvent);
      
      expect(evaluateExpressionMock).toHaveBeenCalledWith(expect.any(Function));
      
      // Call the function passed to evaluateExpressionMock to check context
      const contextFunction = evaluateExpressionMock.mock.calls[0][0];
      const context = contextFunction();
      
      expect(context.draggedElement).toBe(dragItems[0]);
      expect(context.dropTarget).toBe(dropEvent.target);
      expect(context.draggedData).toBeDefined();
    });
  });

  describe('Data Transfer', () => {
    test('should include drag data in dataTransfer', async () => {
      const itemData = { id: 123, title: 'Important Task', category: 'work' };
      
      dragContextHandler(dragContext, { expression: '' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => jest.fn())
      });
      
      await mockAlpine.nextTick(() => {
        dragItemHandler(dragItems[0], 
          { expression: '{ id: 123, title: "Important Task", category: "work" }' },
          { evaluate: jest.fn(() => itemData) }
        );
      });

      await mockAlpine.nextTick();
      
      const dragStartEvent = global.testUtils.createDragEvent('dragstart');
      dragItems[0].dispatchEvent(dragStartEvent);
      
      expect(dragStartEvent.dataTransfer.setData).toHaveBeenCalledWith(
        'text/plain',
        expect.stringContaining('"id":123')
      );
      expect(dragStartEvent.dataTransfer.setData).toHaveBeenCalledWith(
        'text/plain',
        expect.stringContaining('"title":"Important Task"')
      );
      expect(dragStartEvent.dataTransfer.setData).toHaveBeenCalledWith(
        'text/plain',
        expect.stringContaining('"originalIndex":0')
      );
    });

    test('should set correct effectAllowed', async () => {
      dragContextHandler(dragContext, { expression: '' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => jest.fn())
      });
      
      await mockAlpine.nextTick(() => {
        dragItemHandler(dragItems[0], 
          { expression: '{ id: 1 }' },
          { evaluate: jest.fn(() => ({ id: 1 })) }
        );
      });

      await mockAlpine.nextTick();
      
      const dragStartEvent = global.testUtils.createDragEvent('dragstart');
      dragItems[0].dispatchEvent(dragStartEvent);
      
      expect(dragStartEvent.dataTransfer.effectAllowed).toBe('move');
    });
  });

  describe('Livewire Component Integration', () => {
    test('should work with typical Livewire data structures', async () => {
      const livewireItems = [
        { id: 'task-1', title: 'Complete project', order: 1, status: 'todo' },
        { id: 'task-2', title: 'Review code', order: 2, status: 'todo' },
        { id: 'task-3', title: 'Deploy to staging', order: 3, status: 'todo' }
      ];
      
      const evaluateExpressionMock = jest.fn();
      
      dragContextHandler(dragContext, { expression: 'reorderTasks($event.detail)' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => evaluateExpressionMock)
      });
      
      await Promise.all(dragItems.map((item, index) => 
        mockAlpine.nextTick(() => {
          dragItemHandler(item, 
            { expression: `items[${index}]` },
            { evaluate: jest.fn(() => livewireItems[index]) }
          );
        })
      ));

      const eventSpy = jest.fn();
      dragContext.addEventListener('drag:end', eventSpy);
      
      await mockAlpine.nextTick();
      
      // Simulate drag and drop
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      dragContext.dispatchEvent(global.testUtils.createDragEvent('drop', { target: dragItems[2] }));
      
      // Should call Livewire method
      expect(evaluateExpressionMock).toHaveBeenCalled();
      
      // Should dispatch event with Livewire data
      expect(eventSpy).toHaveBeenCalled();
      const eventDetail = eventSpy.mock.calls[0][0].detail;
      expect(eventDetail.oldIndex).toBe(0);
      expect(eventDetail.target).toBe(dragItems[0]);
    });

    test('should handle complex nested data structures', async () => {
      const complexData = {
        task: {
          id: 'uuid-123',
          attributes: {
            title: 'Complex Task',
            metadata: {
              priority: 'high',
              tags: ['urgent', 'client-facing']
            }
          }
        },
        position: 0
      };
      
      dragContextHandler(dragContext, { expression: '' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => jest.fn())
      });
      
      await mockAlpine.nextTick(() => {
        dragItemHandler(dragItems[0], 
          { expression: 'complexTaskData' },
          { evaluate: jest.fn(() => complexData) }
        );
      });

      await mockAlpine.nextTick();
      
      const dragStartEvent = global.testUtils.createDragEvent('dragstart');
      dragItems[0].dispatchEvent(dragStartEvent);
      
      // Should serialize complex data structure
      expect(dragStartEvent.dataTransfer.setData).toHaveBeenCalledWith(
        'text/plain',
        expect.stringContaining('"id":"uuid-123"')
      );
      expect(dragStartEvent.dataTransfer.setData).toHaveBeenCalledWith(
        'text/plain',
        expect.stringContaining('"priority":"high"')
      );
    });
  });

  describe('Multiple Context Integration', () => {
    test('should handle multiple drag contexts independently', async () => {
      const secondContext = global.testUtils.createDragContext(['Item X', 'Item Y']);
      
      // Initialize both contexts
      dragContextHandler(dragContext, { expression: 'handleFirstContext($event)' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => jest.fn())
      });
      
      dragContextHandler(secondContext, { expression: 'handleSecondContext($event)' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => jest.fn())
      });
      
      const firstEventSpy = jest.fn();
      const secondEventSpy = jest.fn();
      
      dragContext.addEventListener('drag:end', firstEventSpy);
      secondContext.addEventListener('drag:end', secondEventSpy);
      
      // Initialize items
      await Promise.all(dragItems.map((item, index) => 
        mockAlpine.nextTick(() => {
          dragItemHandler(item, 
            { expression: `{ context: 'first', id: ${index + 1} }` },
            { evaluate: jest.fn(() => ({ context: 'first', id: index + 1 })) }
          );
        })
      ));
      
      const secondItems = Array.from(secondContext.children);
      await Promise.all(secondItems.map((item, index) => 
        mockAlpine.nextTick(() => {
          dragItemHandler(item, 
            { expression: `{ context: 'second', id: ${index + 1} }` },
            { evaluate: jest.fn(() => ({ context: 'second', id: index + 1 })) }
          );
        })
      ));

      await mockAlpine.nextTick();
      
      // Drag in first context
      dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      dragContext.dispatchEvent(global.testUtils.createDragEvent('drop', { target: dragItems[1] }));
      
      expect(firstEventSpy).toHaveBeenCalled();
      expect(secondEventSpy).not.toHaveBeenCalled();
      
      // Reset spies
      firstEventSpy.mockClear();
      secondEventSpy.mockClear();
      
      // Drag in second context
      secondItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      secondContext.dispatchEvent(global.testUtils.createDragEvent('drop', { target: secondItems[1] }));
      
      expect(firstEventSpy).not.toHaveBeenCalled();
      expect(secondEventSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle expression evaluation errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      dragContextHandler(dragContext, { expression: 'nonExistentFunction()' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => {
          throw new Error('Function not found');
        })
      });
      
      await Promise.all(dragItems.map((item, index) => 
        mockAlpine.nextTick(() => {
          dragItemHandler(item, 
            { expression: `{ id: ${index + 1} }` },
            { evaluate: jest.fn(() => ({ id: index + 1 })) }
          );
        })
      ));

      await mockAlpine.nextTick();
      
      // Should not throw error even if expression evaluation fails
      expect(() => {
        dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
        dragContext.dispatchEvent(global.testUtils.createDragEvent('drop', { target: dragItems[1] }));
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    test('should handle malformed item expressions', async () => {
      dragContextHandler(dragContext, { expression: '' }, {
        evaluate: jest.fn(),
        evaluateLater: jest.fn(() => jest.fn())
      });
      
      await mockAlpine.nextTick(() => {
        dragItemHandler(dragItems[0], 
          { expression: 'malformed.expression[' },
          { evaluate: jest.fn(() => {
            throw new Error('Syntax error');
          }) }
        );
      });

      await mockAlpine.nextTick();
      
      // Should still allow drag operations
      expect(() => {
        dragItems[0].dispatchEvent(global.testUtils.createDragEvent('dragstart'));
      }).not.toThrow();
    });
  });
});