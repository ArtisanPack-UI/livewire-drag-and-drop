/**
 * ArtisanPack UI Livewire Drag and Drop
 *
 * Initializes the Alpine.js directives for accessible drag-and-drop
 * functionality within the ArtisanPack UI ecosystem.
 *
 * @since 1.0.0
 *
 * @param {object} Alpine The global Alpine.js instance.
 * @return {void}
 */
export default function LivewireDragAndDrop( Alpine ) {
    /**
     * Creates a drag-and-drop context for a set of related items.
     *
     * This directive manages the state for a group of draggable items,
     * handles drop events, and orchestrates communication with Livewire.
     *
     * @since 1.0.0
     */
    Alpine.directive( 'drag-context', ( el, { expression }, { evaluate, evaluateLater } ) => {
        // Initialize drag context state
        let dragState = {
            isDragging: false,
            draggedElement: null,
            dropZones: [],
            draggedData: null
        };

        // Set up accessibility attributes
        el.setAttribute('role', 'application');
        el.setAttribute('aria-label', 'Drag and drop interface');

        // Create persistent aria-live region for announcements
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        el.appendChild(liveRegion);

        // Helper function to announce messages
        const announce = (message, priority = 'polite') => {
            liveRegion.setAttribute('aria-live', priority);
            liveRegion.textContent = message;
        };

        // Initialize context
        el._dragContext = dragState;
        el._announce = announce;

        // Handle dragover events for the context
        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        // Handle drop events
        el.addEventListener('drop', (e) => {
            e.preventDefault();
            
            if (dragState.draggedElement) {
                // Get all draggable items to calculate indices
                const allItems = Array.from(el.querySelectorAll('[x-drag-item]'));
                const sourceElement = dragState.draggedElement;
                const targetElement = e.target.closest('[x-drag-item]') || e.target;
                
                // Calculate old and new indices
                const oldIndex = allItems.indexOf(sourceElement);
                let newIndex = -1;
                
                // For drop target, find the closest drag item or use current position
                if (targetElement && targetElement.hasAttribute('x-drag-item')) {
                    newIndex = allItems.indexOf(targetElement);
                } else {
                    // If dropped on container, find position based on mouse coordinates
                    const rect = el.getBoundingClientRect();
                    const dropY = e.clientY - rect.top;
                    
                    // Find the item that should come after the dropped position
                    for (let i = 0; i < allItems.length; i++) {
                        const itemRect = allItems[i].getBoundingClientRect();
                        const itemY = itemRect.top - rect.top;
                        if (dropY < itemY + itemRect.height / 2) {
                            newIndex = i;
                            break;
                        }
                    }
                    if (newIndex === -1) newIndex = allItems.length - 1;
                }
                
                // Dispatch custom drag:end event
                const dragEndEvent = new CustomEvent('drag:end', {
                    detail: {
                        group: el.getAttribute('x-drag-context') || 'default',
                        oldIndex: oldIndex,
                        newIndex: newIndex,
                        sourceElement: sourceElement,
                        targetElement: targetElement
                    },
                    bubbles: true
                });
                el.dispatchEvent(dragEndEvent);
                
                // Evaluate the expression with drag data
                const evaluateExpression = evaluateLater(expression);
                evaluateExpression(() => ({
                    draggedElement: dragState.draggedElement,
                    draggedData: dragState.draggedData,
                    dropTarget: e.target
                }));
            }

            // Reset drag state
            dragState.isDragging = false;
            dragState.draggedElement = null;
            dragState.draggedData = null;
        });

        // Keyboard navigation support
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dragState.isDragging) {
                // Cancel drag operation
                dragState.isDragging = false;
                dragState.draggedElement = null;
                dragState.draggedData = null;
                
                // Announce cancellation to screen readers
                announce('Drag operation cancelled');
            }
        });
    });

    /**
     * Designates an element as a draggable item within a drag context.
     *
     * This directive adds the necessary attributes for dragging, keyboard
     * interaction, and accessibility to an individual item.
     *
     * @since 1.0.0
     */
    Alpine.directive( 'drag-item', ( el, { expression }, { evaluate, evaluateLater } ) => {
        // Make element draggable
        el.draggable = true;
        el.tabIndex = 0;

        // Set up accessibility attributes
        el.setAttribute('role', 'button');
        el.setAttribute('aria-grabbed', 'false');
        el.setAttribute('aria-describedby', 'drag-instructions');

        // Add drag instructions for screen readers (create once)
        if (!document.getElementById('drag-instructions')) {
            const instructions = document.createElement('div');
            instructions.id = 'drag-instructions';
            instructions.className = 'sr-only';
            instructions.textContent = 'Press space or enter to grab, arrow keys to move, space or enter to drop, escape to cancel';
            instructions.style.position = 'absolute';
            instructions.style.left = '-10000px';
            document.body.appendChild(instructions);
        }

        // Find parent drag context
        const dragContext = el.closest('[x-drag-context]');
        if (!dragContext || !dragContext._dragContext) {
            console.warn('x-drag-item must be used within x-drag-context');
            return;
        }

        const contextState = dragContext._dragContext;
        const announce = dragContext._announce;

        // Handle drag start
        el.addEventListener('dragstart', (e) => {
            contextState.isDragging = true;
            contextState.draggedElement = el;
            contextState.draggedData = evaluate(expression);
            
            el.setAttribute('aria-grabbed', 'true');
            el.setAttribute('aria-pressed', 'true');
            el.classList.add('is-grabbing');
            el.style.opacity = '0.5';
            
            // Set drag data
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify(contextState.draggedData));

            // Announce drag start to screen readers
            announce('Item grabbed for dragging', 'assertive');
        });

        // Handle drag end
        el.addEventListener('dragend', (e) => {
            el.setAttribute('aria-grabbed', 'false');
            el.setAttribute('aria-pressed', 'false');
            el.classList.remove('is-grabbing');
            el.style.opacity = '';
            
            // Reset context state
            contextState.isDragging = false;
            contextState.draggedElement = null;
            contextState.draggedData = null;

            // Announce drag end to screen readers
            announce('Item released');
        });

        // Keyboard support
        let isGrabbed = false;
        
        el.addEventListener('keydown', (e) => {
            switch (e.key) {
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    if (!isGrabbed) {
                        // Grab the item
                        isGrabbed = true;
                        contextState.isDragging = true;
                        contextState.draggedElement = el;
                        
                        // Store original index and data for keyboard navigation
                        const allItems = Array.from(dragContext.querySelectorAll('[x-drag-item]'));
                        const originalIndex = allItems.indexOf(el);
                        const dragData = evaluate(expression);
                        contextState.draggedData = {
                            ...dragData,
                            originalIndex: originalIndex
                        };
                        
                        el.setAttribute('aria-grabbed', 'true');
                        el.setAttribute('aria-pressed', 'true');
                        el.classList.add('is-grabbing');
                        el.style.opacity = '0.5';
                        
                        // Announce grab
                        announce('Item grabbed. Use arrow keys to move, space to drop, escape to cancel.', 'assertive');
                    } else {
                        // Drop the item
                        isGrabbed = false;
                        
                        // Get all draggable items to calculate current position for keyboard drop
                        const allItems = Array.from(dragContext.querySelectorAll('[x-drag-item]'));
                        const oldIndex = contextState.draggedData ? contextState.draggedData.originalIndex || allItems.indexOf(contextState.draggedElement) : allItems.indexOf(el);
                        const newIndex = allItems.indexOf(el);
                        
                        // Dispatch custom drag:end event for keyboard navigation
                        const dragEndEvent = new CustomEvent('drag:end', {
                            detail: {
                                group: dragContext.getAttribute('x-drag-context') || 'default',
                                oldIndex: oldIndex,
                                newIndex: newIndex,
                                sourceElement: contextState.draggedElement || el,
                                targetElement: el
                            },
                            bubbles: true
                        });
                        dragContext.dispatchEvent(dragEndEvent);
                        
                        el.setAttribute('aria-grabbed', 'false');
                        el.setAttribute('aria-pressed', 'false');
                        el.classList.remove('is-grabbing');
                        el.style.opacity = '';
                        
                        // Trigger drop event
                        const dropEvent = new Event('drop', { bubbles: true });
                        el.dispatchEvent(dropEvent);
                        
                        // Reset state
                        contextState.isDragging = false;
                        contextState.draggedElement = null;
                        contextState.draggedData = null;
                    }
                    break;
                    
                case 'Escape':
                    if (isGrabbed) {
                        e.preventDefault();
                        isGrabbed = false;
                        el.setAttribute('aria-grabbed', 'false');
                        el.setAttribute('aria-pressed', 'false');
                        el.classList.remove('is-grabbing');
                        el.style.opacity = '';
                        
                        // Reset state
                        contextState.isDragging = false;
                        contextState.draggedElement = null;
                        contextState.draggedData = null;
                        
                        // Announce cancellation
                        announce('Drag cancelled');
                    }
                    break;
                    
                case 'ArrowUp':
                case 'ArrowDown':
                case 'ArrowLeft':
                case 'ArrowRight':
                    if (isGrabbed) {
                        e.preventDefault();
                        // Find next/previous draggable item based on arrow direction
                        const draggableItems = Array.from(dragContext.querySelectorAll('[x-drag-item]'));
                        const currentIndex = draggableItems.indexOf(el);
                        let targetIndex;
                        
                        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                            targetIndex = currentIndex > 0 ? currentIndex - 1 : draggableItems.length - 1;
                        } else {
                            targetIndex = currentIndex < draggableItems.length - 1 ? currentIndex + 1 : 0;
                        }
                        
                        const targetElement = draggableItems[targetIndex];
                        if (targetElement && targetElement !== el) {
                            // Actually move the element in the DOM
                            if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                                // Moving up/left - insert before target element
                                targetElement.parentNode.insertBefore(el, targetElement);
                            } else {
                                // Moving down/right - insert after target element
                                targetElement.parentNode.insertBefore(el, targetElement.nextSibling);
                            }
                            
                            // Keep focus on the moved element
                            el.focus();
                            
                            // Announce movement
                            announce(`Moved to position ${targetIndex + 1} of ${draggableItems.length}`);
                        }
                    }
                    break;
            }
        });

        // Handle focus events for better UX
        el.addEventListener('focus', () => {
            el.style.outline = '2px solid #007cba';
        });

        el.addEventListener('blur', () => {
            el.style.outline = '';
        });
    });
}