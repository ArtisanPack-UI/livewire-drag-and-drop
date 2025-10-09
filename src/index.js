/**
 * ArtisanPack UI Livewire Drag and Drop
 *
 * This file contains the Alpine.js directives for accessible drag-and-drop
 * functionality within the ArtisanPack UI ecosystem. Provides complete
 * keyboard navigation, screen reader support, and Livewire integration.
 *
 * @package    ArtisanPack UI
 * @subpackage Livewire Drag and Drop
 * @since      1.0.0
 * @version    1.0.3
 * @author     ArtisanPack UI Team
 * @copyright  2025 ArtisanPack UI
 * @license    MIT
 */

// Global aria-live region for announcements.
let globalAriaLiveRegion = null;

/**
 * Creates and returns the global aria-live region for drag and drop announcements.
 *
 * This function ensures only one aria-live region exists per document to follow
 * accessibility best practices and avoid duplicate announcements.
 *
 * @since  1.0.0
 * @return {HTMLElement} The global aria-live region element.
 */
function getGlobalAriaLiveRegion() {
    if ( ! globalAriaLiveRegion ) {
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
 * @since  1.0.0
 * @return {Function} The announce function.
 */
function createAnnounceFunction() {
    const liveRegion = getGlobalAriaLiveRegion();

    /**
     * Announces a message to screen readers using the global aria-live region.
     *
     * @since  1.0.0
     * @param {string} message The message to announce.
     * @param {string} priority The priority level ('polite' or 'assertive').
     * @return {void}
     */
    return function announce( message, priority = 'polite' ) {
        liveRegion.setAttribute( 'aria-live', priority );
        liveRegion.textContent = message;
    };
}

/**
 * Initializes the Alpine.js directives for accessible drag-and-drop functionality.
 *
 * @since 1.0.0
 * @param {object} Alpine The global Alpine.js instance.
 * @return {void}
 */
export default function LivewireDragAndDrop( Alpine ) {
    /**
     * Creates a drag-and-drop context for a set of related items.
     *
     * @since 1.0.0
     * @param {HTMLElement} el         The element this directive is attached to.
     * @param {object}      directive  The directive configuration object.
     * @param {object}      Alpine     The Alpine.js utilities object.
     * @return {Function|void} Alpine.js cleanup function or void.
     */
    Alpine.directive( 'drag-context', ( el, { expression }, { evaluate, evaluateLater } ) => {
        let dragState = {
            isDragging: false,
            draggedElement: null,
            dropZones: [],
            draggedData: null
        };

        el.setAttribute( 'role', 'application' );
        el.setAttribute( 'aria-label', 'Drag and drop interface' );

        const announce = createAnnounceFunction();

        const finalizeDrop = ( grabbedElement ) => {
            if ( ! grabbedElement ) return;

            const allItems = Array.from( el.querySelectorAll( '[x-drag-item]' ) );
            const sourceElement = grabbedElement;

            const oldIndex = dragState.draggedData && dragState.draggedData.originalIndex !== undefined
                ? dragState.draggedData.originalIndex
                : -1;
            const newIndex = allItems.indexOf( sourceElement );

            const dragEndEvent = new CustomEvent( 'drag:end', {
                detail: {
                    oldIndex,
                    newIndex,
                    group: el.getAttribute( 'x-drag-context' ) || 'default',
                    target: sourceElement,
                    item: sourceElement
                },
                bubbles: true
            } );
            el.dispatchEvent( dragEndEvent );

            dragState.isDragging = false;
            dragState.draggedElement = null;
            dragState.draggedData = null;
        };

        el._dragContext = dragState;
        el._announce = announce;
        el._finalizeDrop = finalizeDrop;

        const handleDragOver = ( e ) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        };

        const handleDrop = ( e ) => {
            e.preventDefault();
            if ( dragState.draggedElement ) {
                const targetElement = e.target.closest( '[x-drag-item]' ) || e.target;

                if ( targetElement && targetElement.hasAttribute( 'x-drag-item' ) && targetElement !== dragState.draggedElement ) {
                    const allItems = Array.from( el.querySelectorAll( '[x-drag-item]' ) );
                    const targetIndex = allItems.indexOf( targetElement );
                    const draggedIndex = allItems.indexOf( dragState.draggedElement );
                    if ( draggedIndex < targetIndex ) {
                        targetElement.parentNode.insertBefore( dragState.draggedElement, targetElement.nextSibling );
                    } else {
                        targetElement.parentNode.insertBefore( dragState.draggedElement, targetElement );
                    }
                } else if ( ! targetElement || ! targetElement.hasAttribute( 'x-drag-item' ) ) {
                    const allItems = Array.from( el.querySelectorAll( '[x-drag-item]' ) );
                    const rect = el.getBoundingClientRect();
                    const dropY = e.clientY - rect.top;
                    let insertBeforeElement = null;
                    for ( let i = 0; i < allItems.length; i++ ) {
                        if ( allItems[ i ] === dragState.draggedElement ) continue;
                        const itemRect = allItems[ i ].getBoundingClientRect();
                        const itemY = itemRect.top - rect.top;
                        if ( dropY < itemY + itemRect.height / 2 ) {
                            insertBeforeElement = allItems[ i ];
                            break;
                        }
                    }
                    if ( insertBeforeElement ) {
                        insertBeforeElement.parentNode.insertBefore( dragState.draggedElement, insertBeforeElement );
                    } else {
                        el.appendChild( dragState.draggedElement );
                    }
                }

                finalizeDrop( dragState.draggedElement );

                if ( expression && expression.trim() !== '' ) {
                    const evaluateExpression = evaluateLater( expression );
                    evaluateExpression( () => ( {
                        draggedElement: dragState.draggedElement,
                        draggedData: dragState.draggedData,
                        dropTarget: e.target
                    } ) );
                }
            }
        };

        const handleKeyDown = ( e ) => {
            if ( e.key === 'Escape' && dragState.isDragging ) {
                dragState.isDragging = false;
                dragState.draggedElement = null;
                dragState.draggedData = null;
                announce( 'Drag operation cancelled' );
            }
        };

        el.addEventListener( 'dragover', handleDragOver );
        el.addEventListener( 'drop', handleDrop );
        el.addEventListener( 'keydown', handleKeyDown );

        return () => {
            el.removeEventListener( 'dragover', handleDragOver );
            el.removeEventListener( 'drop', handleDrop );
            el.removeEventListener( 'keydown', handleKeyDown );
        };
    } );

    /**
     * Designates an element as a draggable item within a drag context.
     *
     * @since 1.0.0
     * @param {HTMLElement} el         The element this directive is attached to.
     * @param {object}      directive  The directive configuration object.
     * @param {object}      Alpine     The Alpine.js utilities object.
     * @return {Function|void} Alpine.js cleanup function or void.
     */
    Alpine.directive( 'drag-item', ( el, { expression }, { evaluate } ) => {
        Alpine.nextTick( () => {
            el.draggable = true;
            el.tabIndex = 0;

            el.setAttribute( 'role', 'button' );
            el.setAttribute( 'aria-grabbed', 'false' );
            el.setAttribute( 'aria-describedby', 'drag-instructions' );

            if ( ! document.getElementById( 'drag-instructions' ) ) {
                const instructions = document.createElement( 'div' );
                instructions.id = 'drag-instructions';
                instructions.className = 'sr-only';
                instructions.textContent = 'Press space or enter to grab, arrow keys to move, space or enter to drop, escape to cancel';
                instructions.style.position = 'absolute';
                instructions.style.left = '-10000px';
                document.body.appendChild( instructions );
            }

            const dragContext = el.closest( '[x-drag-context]' );
            if ( ! dragContext || ! dragContext._dragContext ) {
                console.warn( 'x-drag-item must be used within x-drag-context' );
                return;
            }

            const contextState = dragContext._dragContext;
            const announce = dragContext._announce;

            const handleDragStart = ( e ) => {
                contextState.isDragging = true;
                contextState.draggedElement = el;

                // **BUG FIX**: Capture original index for mouse drags.
                const allItems = Array.from( dragContext.querySelectorAll( '[x-drag-item]' ) );
                const originalIndex = allItems.indexOf( el );
                const dragData = evaluate( expression );

                contextState.draggedData = {
                    ...dragData,
                    originalIndex: originalIndex
                };

                el.setAttribute( 'aria-grabbed', 'true' );
                el.setAttribute( 'aria-pressed', 'true' );
                el.classList.add( 'is-grabbing', 'is-dragging' );

                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData( 'text/plain', JSON.stringify( contextState.draggedData ) );

                announce( 'Item grabbed for dragging', 'assertive' );
            };

            const handleDragEnd = () => {
                el.setAttribute( 'aria-grabbed', 'false' );
                el.setAttribute( 'aria-pressed', 'false' );
                el.classList.remove( 'is-grabbing', 'is-dragging' );

                if ( contextState.isDragging ) {
                    contextState.isDragging = false;
                    contextState.draggedElement = null;
                    contextState.draggedData = null;
                }

                announce( 'Item released' );
            };

            let isGrabbed = false;
            const handleKeyDown = ( e ) => {
                switch ( e.key ) {
                    case ' ':
                    case 'Enter':
                        e.preventDefault();
                        if ( ! isGrabbed ) {
                            isGrabbed = true;
                            contextState.isDragging = true;
                            contextState.draggedElement = el;

                            const allItems = Array.from( dragContext.querySelectorAll( '[x-drag-item]' ) );
                            const originalIndex = allItems.indexOf( el );
                            const dragData = evaluate( expression );
                            contextState.draggedData = {
                                ...dragData,
                                originalIndex: originalIndex
                            };

                            el.setAttribute( 'aria-grabbed', 'true' );
                            el.setAttribute( 'aria-pressed', 'true' );
                            el.classList.add( 'is-grabbing', 'is-dragging' );
                            announce( 'Item grabbed. Use arrow keys to move, space to drop, escape to cancel.', 'assertive' );
                        } else {
                            isGrabbed = false;
                            const allItems = Array.from( dragContext.querySelectorAll( '[x-drag-item]' ) );
                            const finalIndex = allItems.indexOf( el );
                            announce( `Item dropped at position ${ finalIndex + 1 } of ${ allItems.length }.` );

                            dragContext._finalizeDrop( contextState.draggedElement || el );

                            el.setAttribute( 'aria-grabbed', 'false' );
                            el.setAttribute( 'aria-pressed', 'false' );
                            el.classList.remove( 'is-grabbing', 'is-dragging' );

                            const dropEvent = new Event( 'drop', { bubbles: true } );
                            el.dispatchEvent( dropEvent );
                        }
                        break;

                    case 'Escape':
                        if ( isGrabbed ) {
                            e.preventDefault();
                            isGrabbed = false;
                            el.setAttribute( 'aria-grabbed', 'false' );
                            el.setAttribute( 'aria-pressed', 'false' );
                            el.classList.remove( 'is-grabbing', 'is-dragging' );
                            contextState.isDragging = false;
                            contextState.draggedElement = null;
                            contextState.draggedData = null;
                            announce( 'Drag cancelled' );
                        }
                        break;

                    case 'ArrowUp':
                    case 'ArrowDown':
                    case 'ArrowLeft':
                    case 'ArrowRight':
                        if ( isGrabbed ) {
                            e.preventDefault();
                            const draggableItems = Array.from( dragContext.querySelectorAll( '[x-drag-item]' ) );
                            const currentIndex = draggableItems.indexOf( el );
                            let targetIndex;
                            if ( e.key === 'ArrowUp' || e.key === 'ArrowLeft' ) {
                                targetIndex = currentIndex > 0 ? currentIndex - 1 : draggableItems.length - 1;
                            } else {
                                targetIndex = currentIndex < draggableItems.length - 1 ? currentIndex + 1 : 0;
                            }
                            const targetElement = draggableItems[ targetIndex ];
                            if ( targetElement && targetElement !== el ) {
                                if ( e.key === 'ArrowUp' || e.key === 'ArrowLeft' ) {
                                    targetElement.parentNode.insertBefore( el, targetElement );
                                } else {
                                    targetElement.parentNode.insertBefore( el, targetElement.nextSibling );
                                }
                                el.focus();
                                announce( `Moved to position ${ targetIndex + 1 } of ${ draggableItems.length }` );
                            }
                        }
                        break;
                }
            };

            const handleFocus = () => el.classList.add( 'is-focused' );
            const handleBlur = () => el.classList.remove( 'is-focused' );

            el.addEventListener( 'dragstart', handleDragStart );
            el.addEventListener( 'dragend', handleDragEnd );
            el.addEventListener( 'keydown', handleKeyDown );
            el.addEventListener( 'focus', handleFocus );
            el.addEventListener( 'blur', handleBlur );

            return () => {
                el.removeEventListener( 'dragstart', handleDragStart );
                el.removeEventListener( 'dragend', handleDragEnd );
                el.removeEventListener( 'keydown', handleKeyDown );
                el.removeEventListener( 'focus', handleFocus );
                el.removeEventListener( 'blur', handleBlur );
            };
        } );
    } );
}
