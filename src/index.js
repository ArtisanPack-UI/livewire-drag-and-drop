/**
 * ArtisanPack UI Livewire Drag and Drop
 *
 * This file contains the Alpine.js directives for accessible drag-and-drop
 * functionality within the ArtisanPack UI ecosystem. Provides complete
 * keyboard navigation, screen reader support, and Livewire integration.
 *
 * @package ArtisanPack UI
 * @subpackage Livewire Drag and Drop
 * @since 1.0.0
 * @version 1.0.0
 * @author ArtisanPack UI Team
 * @copyright 2025 ArtisanPack UI
 * @license MIT
 */

// Global aria-live region for announcements
let globalAriaLiveRegion = null;

/**
 * Creates and returns the global aria-live region for drag and drop announcements.
 *
 * This function ensures only one aria-live region exists per document to follow
 * accessibility best practices and avoid duplicate announcements.
 *
 * @since 1.0.0
 * @return {HTMLElement} The global aria-live region element.
 */
function getGlobalAriaLiveRegion() {
    if ( !globalAriaLiveRegion ) {
        globalAriaLiveRegion = document.createElement( 'div' );
        globalAriaLiveRegion.setAttribute( 'aria-live', 'polite' );
        globalAriaLiveRegion.setAttribute( 'aria-atomic', 'true' );
        globalAriaLiveRegion.className = 'sr-only';
        globalAriaLiveRegion.style.position = 'absolute';
        globalAriaLiveRegion.style.left = '-10000px';
        globalAriaLiveRegion.style.width = '1px';
        globalAriaLiveRegion.style.height = '1px';
        globalAriaLiveRegion.style.overflow = 'hidden';
        document.body.appendChild( globalAriaLiveRegion );
    }
    return globalAriaLiveRegion;
}

/**
 * Creates an announce function that uses the global aria-live region.
 *
 * @since 1.0.0
 * @return {Function} The announce function.
 */
function createAnnounceFunction() {
    const liveRegion = getGlobalAriaLiveRegion();

    /**
     * Announces a message to screen readers using the global aria-live region.
     *
     * @since 1.0.0
     * @param {string} message The message to announce.
     * @param {string} priority The priority level ('polite' or 'assertive').
     * @return {void}
     */
    return function announce( message, priority = 'polite' ) {
        liveRegion.setAttribute( 'aria-live', priority );
        liveRegion.textContent = message;
    };
}

// Global storage for drag context state that survives DOM re-rendering
const dragContextState = new WeakMap();
const dragContextHelpers = new WeakMap();

/**
 * Helper function to find the drag context element and its state.
 * This works across DOM re-renders by checking WeakMap storage.
 *
 * @since 1.0.0
 * @param {HTMLElement} element The element to start searching from.
 * @return {Object|null} Object with dragContext element, state, and helpers, or null if not found.
 */
function findDragContext(element) {
    let current = element;
    
    // Traverse up the DOM tree looking for a drag context
    while (current && current !== document.body) {
        if (current.hasAttribute && current.hasAttribute('x-drag-context')) {
            const state = dragContextState.get(current);
            const helpers = dragContextHelpers.get(current);
            
            if (state && helpers) {
                return {
                    element: current,
                    state: state,
                    helpers: helpers
                };
            }
        }
        current = current.parentElement;
    }
    
    return null;
}

/**
 * Initializes the Alpine.js directives for accessible drag-and-drop functionality.
 *
 * This is the main export function that registers the x-drag-context and x-drag-item
 * directives with Alpine.js. It provides complete accessibility support including
 * keyboard navigation, screen reader announcements, and proper ARIA attributes.
 *
 * @since 1.0.0
 * @param {Object} Alpine The global Alpine.js instance.
 * @return {void}
 */
export default function LivewireDragAndDrop( Alpine ) {
    /**
     * Creates a drag-and-drop context for a set of related items.
     *
     * This directive manages the state for a group of draggable items,
     * handles drop events, and orchestrates communication with Livewire.
     * It uses the global aria-live region for accessibility announcements.
     *
     * @since 1.0.0
     * @param {HTMLElement} el The element this directive is attached to.
     * @param {Object} directive The directive configuration object.
     * @param {Object} Alpine The Alpine.js utilities object.
     * @return {Function|void} Alpine.js cleanup function or void.
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
        el.setAttribute( 'role', 'application' );
        el.setAttribute( 'aria-label', 'Drag and drop interface' );

        // Use global aria-live region for announcements
        const announce = createAnnounceFunction();

        // Helper function to finalize drop operations
        const finalizeDrop = ( grabbedElement ) => {
            if ( !grabbedElement ) return;

            // Get all draggable items to calculate indices
            const allItems = Array.from( el.querySelectorAll( '[x-drag-item]' ) );
            const sourceElement = grabbedElement;

            // Calculate old and new indices
            const oldIndex = dragState.draggedData && dragState.draggedData.originalIndex !== undefined
                ? dragState.draggedData.originalIndex
                : allItems.indexOf( sourceElement );
            const newIndex = allItems.indexOf( sourceElement );

            // Dispatch custom drag:end event
            const dragEndEvent = new CustomEvent( 'drag:end', {
                detail: {
                    oldIndex: oldIndex,
                    newIndex: newIndex,
                    group: el.getAttribute( 'x-drag-context' ) || 'default',
                    target: sourceElement,
                    item: sourceElement
                },
                bubbles: true
            } );
            el.dispatchEvent( dragEndEvent );

            // Reset drag state
            dragState.isDragging = false;
            dragState.draggedElement = null;
            dragState.draggedData = null;
        };

        // Store context state in WeakMap to survive DOM re-rendering
        dragContextState.set(el, dragState);
        dragContextHelpers.set(el, {
            announce: announce,
            finalizeDrop: finalizeDrop
        });

        // Handle dragover events for the context
        const handleDragOver = ( e ) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        };

        // Handle drop events
        const handleDrop = ( e ) => {
            e.preventDefault();

            if ( dragState.draggedElement ) {
                const targetElement = e.target.closest( '[x-drag-item]' ) || e.target;

                // Handle mouse drop positioning - move element to drop position if needed
                if ( targetElement && targetElement.hasAttribute( 'x-drag-item' ) && targetElement !== dragState.draggedElement ) {
                    // Move the dragged element to the target position
                    const allItems = Array.from( el.querySelectorAll( '[x-drag-item]' ) );
                    const targetIndex = allItems.indexOf( targetElement );
                    const draggedIndex = allItems.indexOf( dragState.draggedElement );

                    if ( draggedIndex < targetIndex ) {
                        targetElement.parentNode.insertBefore( dragState.draggedElement, targetElement.nextSibling );
                    } else {
                        targetElement.parentNode.insertBefore( dragState.draggedElement, targetElement );
                    }
                } else if ( !targetElement || !targetElement.hasAttribute( 'x-drag-item' ) ) {
                    // If dropped on container, find position based on mouse coordinates
                    const allItems = Array.from( el.querySelectorAll( '[x-drag-item]' ) );
                    const rect = el.getBoundingClientRect();
                    const dropY = e.clientY - rect.top;

                    // Find the item that should come after the dropped position
                    let insertBeforeElement = null;
                    for ( let i = 0; i < allItems.length; i++ ) {
                        if ( allItems[i] === dragState.draggedElement ) continue;
                        const itemRect = allItems[i].getBoundingClientRect();
                        const itemY = itemRect.top - rect.top;
                        if ( dropY < itemY + itemRect.height / 2 ) {
                            insertBeforeElement = allItems[i];
                            break;
                        }
                    }

                    if ( insertBeforeElement ) {
                        insertBeforeElement.parentNode.insertBefore( dragState.draggedElement, insertBeforeElement );
                    } else {
                        // Insert at end
                        el.appendChild( dragState.draggedElement );
                    }
                }

                // Finalize the drop operation
                finalizeDrop( dragState.draggedElement );

                // Evaluate the expression with drag data (only if expression exists)
                if ( expression && expression.trim() ) {
                    try {
                        const evaluateExpression = evaluateLater( expression );
                        evaluateExpression( () => ( {
                            draggedElement: dragState.draggedElement,
                            draggedData: dragState.draggedData,
                            dropTarget: e.target
                        } ) );
                    } catch ( error ) {
                        console.warn( 'Error evaluating x-drag-context expression:', error );
                    }
                }
            }
        };

        // Keyboard navigation support
        const handleKeyDown = ( e ) => {
            if ( e.key === 'Escape' && dragState.isDragging ) {
                // Cancel drag operation
                dragState.isDragging = false;
                dragState.draggedElement = null;
                dragState.draggedData = null;

                // Announce cancellation to screen readers
                announce( 'Drag operation cancelled' );
            }
        };

        // Add event listeners
        el.addEventListener( 'dragover', handleDragOver );
        el.addEventListener( 'drop', handleDrop );
        el.addEventListener( 'keydown', handleKeyDown );

        // Return cleanup function for Alpine.js
        return () => {
            el.removeEventListener( 'dragover', handleDragOver );
            el.removeEventListener( 'drop', handleDrop );
            el.removeEventListener( 'keydown', handleKeyDown );
        };
    });

    /**
     * Designates an element as a draggable item within a drag context.
     *
     * This directive adds the necessary attributes for dragging, keyboard
     * interaction, and accessibility to an individual item. It integrates
     * with the parent drag context for state management and announcements.
     *
     * @since 1.0.0
     * @param {HTMLElement} el The element this directive is attached to.
     * @param {Object} directive The directive configuration object.
     * @param {Object} Alpine The Alpine.js utilities object.
     * @return {Function|void} Alpine.js cleanup function or void.
     */
    Alpine.directive( 'drag-item', ( el, { expression }, { evaluate, evaluateLater } ) => {
        Alpine.nextTick( () => {
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

            // Find parent drag context using WeakMap storage
            const dragContextInfo = findDragContext(el);
            if (!dragContextInfo) {
                console.warn('x-drag-item must be used within x-drag-context');
                return;
            }

            const { element: dragContext, state: contextState, helpers } = dragContextInfo;
            const { announce, finalizeDrop } = helpers;

            // Handle drag start
            const handleDragStart = (e) => {
                contextState.isDragging = true;
                contextState.draggedElement = el;
                
                // CRITICAL: Capture original index BEFORE any DOM manipulation
                const allItems = Array.from(dragContext.querySelectorAll('[x-drag-item]'));
                const originalIndex = allItems.indexOf(el);
                
                // Safely evaluate the expression with fallback
                try {
                    const dragData = expression && expression.trim() ? evaluate(expression) : {};
                    contextState.draggedData = {
                        ...dragData,
                        originalIndex: originalIndex
                    };
                } catch (error) {
                    console.warn('Error evaluating x-drag-item expression:', error);
                    contextState.draggedData = {
                        originalIndex: originalIndex
                    };
                }

                el.setAttribute('aria-grabbed', 'true');
                el.setAttribute('aria-pressed', 'true');
                el.classList.add('is-grabbing', 'is-dragging');

                // Set drag data
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', JSON.stringify(contextState.draggedData));

                // Announce drag start to screen readers
                announce('Item grabbed for dragging', 'assertive');
            };

            // Handle drag end
            const handleDragEnd = (e) => {
                el.setAttribute('aria-grabbed', 'false');
                el.setAttribute('aria-pressed', 'false');
                el.classList.remove('is-grabbing', 'is-dragging');

                // Reset context state
                contextState.isDragging = false;
                contextState.draggedElement = null;
                contextState.draggedData = null;

                // Announce drag end to screen readers
                announce('Item released');
            };

            // Keyboard support
            let isGrabbed = false;

            const handleKeyDown = (e) => {
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
                            
                            // Safely evaluate the expression with fallback
                            let dragData = {};
                            try {
                                dragData = expression && expression.trim() ? evaluate(expression) : {};
                            } catch (error) {
                                console.warn('Error evaluating x-drag-item expression during keyboard navigation:', error);
                                dragData = {};
                            }
                            
                            contextState.draggedData = {
                                ...dragData,
                                originalIndex: originalIndex
                            };

                            el.setAttribute('aria-grabbed', 'true');
                            el.setAttribute('aria-pressed', 'true');
                            el.classList.add('is-grabbing', 'is-dragging');

                            // Announce grab
                            announce('Item grabbed. Use arrow keys to move, space to drop, escape to cancel.', 'assertive');
                        } else {
                            // Drop the item
                            isGrabbed = false;

                            // Finalize the drop operation using the shared helper function
                            finalizeDrop(contextState.draggedElement || el);

                            el.setAttribute('aria-grabbed', 'false');
                            el.setAttribute('aria-pressed', 'false');
                            el.classList.remove('is-grabbing', 'is-dragging');

                            // Trigger drop event
                            const dropEvent = new Event('drop', {bubbles: true});
                            el.dispatchEvent(dropEvent);
                        }
                        break;

                    case 'Escape':
                        if (isGrabbed) {
                            e.preventDefault();
                            isGrabbed = false;
                            el.setAttribute('aria-grabbed', 'false');
                            el.setAttribute('aria-pressed', 'false');
                            el.classList.remove('is-grabbing', 'is-dragging');

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
            };

            // Handle focus events for better UX
            const handleFocus = () => {
                el.classList.add('is-focused');
            };

            const handleBlur = () => {
                el.classList.remove('is-focused');
            };

            // Add event listeners
            el.addEventListener('dragstart', handleDragStart);
            el.addEventListener('dragend', handleDragEnd);
            el.addEventListener('keydown', handleKeyDown);
            el.addEventListener('focus', handleFocus);
            el.addEventListener('blur', handleBlur);

            // Return cleanup function for Alpine.js
            return () => {
                el.removeEventListener('dragstart', handleDragStart);
                el.removeEventListener('dragend', handleDragEnd);
                el.removeEventListener('keydown', handleKeyDown);
                el.removeEventListener('focus', handleFocus);
                el.removeEventListener('blur', handleBlur);
            };
        } );
    } );
}
