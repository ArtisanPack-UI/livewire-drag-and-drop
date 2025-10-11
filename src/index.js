/**
 * ArtisanPack UI Livewire Drag and Drop
 *
 * This file contains the Alpine.js directives for accessible drag-and-drop
 * functionality within the ArtisanPack UI ecosystem. Provides complete
 * keyboard navigation, screen reader support, and deep Livewire integration
 * using official JavaScript hooks.
 *
 * @package    ArtisanPack UI
 * @subpackage Livewire Drag and Drop
 * @since      1.1.0
 * @version    1.1.0
 * @author     ArtisanPack UI Team
 * @copyright  2025 ArtisanPack UI
 * @license    MIT
 */

// --- Accessibility Helpers ---

let globalAriaLiveRegion = null;

/**
 * Creates and returns the global aria-live region for drag and drop announcements.
 *
 * @since 1.0.0
 * @return {HTMLElement} The global aria-live region element.
 */
function getGlobalAriaLiveRegion() {
    if (!globalAriaLiveRegion || !globalAriaLiveRegion.isConnected) {
        globalAriaLiveRegion = document.createElement('div');
        globalAriaLiveRegion.setAttribute('aria-live', 'polite');
        globalAriaLiveRegion.setAttribute('aria-atomic', 'true');
        globalAriaLiveRegion.className = 'sr-only';
        // Position off-screen
        globalAriaLiveRegion.style.position = 'absolute';
        globalAriaLiveRegion.style.width = '1px';
        globalAriaLiveRegion.style.height = '1px';
        globalAriaLiveRegion.style.padding = '0';
        globalAriaLiveRegion.style.margin = '-1px';
        globalAriaLiveRegion.style.overflow = 'hidden';
        globalAriaLiveRegion.style.clip = 'rect(0, 0, 0, 0)';
        globalAriaLiveRegion.style.whiteSpace = 'nowrap';
        globalAriaLiveRegion.style.borderWidth = '0';
        document.body.appendChild(globalAriaLiveRegion);
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
    return function announce(message, priority = 'polite') {
        liveRegion.setAttribute('aria-live', priority);
        liveRegion.textContent = message;
    };
}


// --- Livewire Integration & State Management ---

/**
 * @var {Array} Holds the wire:key of elements that were just reordered.
 * This is used by the Livewire hook to prevent morphing.
 */
let recentlyMovedKeys = [];

/**
 * Helper function to find the drag context element.
 * This works across DOM re-renders by checking for direct properties on the element.
 *
 * @since 1.0.0
 * @param {HTMLElement} element The element to start searching from.
 * @return {Object|null} Object with element, state, and helpers, or null.
 */
function findDragContext(element) {
    let current = element;
    while (current && current !== document.body) {
        if (current._dragContextState && current._dragContextHelpers) {
            return {
                element: current,
                state: current._dragContextState,
                helpers: current._dragContextHelpers
            };
        }
        current = current.parentElement;
    }
    return null;
}

/**
 * Initializes the Alpine.js directives and sets up Livewire hooks.
 *
 * @since 1.1.0
 * @param {object} Alpine The global Alpine instance.
 * @return {void}
 */
export default function LivewireDragAndDrop(Alpine) {

    // --- Livewire Hooks ---
    // This is the core of the new architecture.

    /**
     * Intercepts Livewire's DOM updates.
     * If an element was part of the recent drag operation, this hook tells
     * Livewire to NOT update it, preserving the DOM and Alpine state.
     */
    Livewire.hook('element.updating', (fromEl, toEl, component) => {
        if (fromEl.hasAttribute('x-drag-item') && fromEl.getAttribute('wire:key')) {
            const wireKey = fromEl.getAttribute('wire:key');
            if (recentlyMovedKeys.includes(wireKey)) {
                // Returning false tells Livewire to skip this element entirely.
                return false;
            }
        }
    });

    /**
     * Clears the `recentlyMovedKeys` array after a Livewire update is complete.
     * This ensures the "skip" logic only applies to the single update
     * immediately following a drop.
     */
    Livewire.hook('message.processed', (message, component) => {
        if (recentlyMovedKeys.length > 0) {
            recentlyMovedKeys = [];
        }
    });


    // --- Alpine Directives ---

    Alpine.directive('drag-context', (el) => {
        let dragState = {
            isDragging: false,
            draggedElement: null,
            dropZones: [],
            draggedData: null
        };

        // Attach state and helpers directly to the DOM element to survive morphs.
        el._dragContextState = dragState;
        el._dragContextHelpers = {
            announce: createAnnounceFunction(),
            finalizeDrop: (grabbedElement) => {
                if (!grabbedElement) return;

                // Get all items in their NEW order from the DOM.
                const allItems = Array.from(el.querySelectorAll('[x-drag-item]'));

                // Populate the array for the Livewire hook.
                recentlyMovedKeys = allItems.map(item => item.getAttribute('wire:key'));

                // Dispatch event to trigger the Livewire action.
                const dragEndEvent = new CustomEvent('drag:end', { bubbles: true });
                el.dispatchEvent(dragEndEvent);

                // Reset state.
                dragState.isDragging = false;
                dragState.draggedElement = null;
                dragState.draggedData = null;
            }
        };

        const handleDragOver = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        };

        const handleDrop = (e) => {
            e.preventDefault();
            if (dragState.draggedElement) {
                const targetElement = e.target.closest('[x-drag-item]');
                if (targetElement && targetElement !== dragState.draggedElement) {
                    // Logic to place the item relative to the drop target.
                    const rect = targetElement.getBoundingClientRect();
                    const isAfter = (e.clientY - rect.top) > (rect.height / 2);
                    if (isAfter) {
                        targetElement.parentNode.insertBefore(dragState.draggedElement, targetElement.nextSibling);
                    } else {
                        targetElement.parentNode.insertBefore(dragState.draggedElement, targetElement);
                    }
                }
                // Finalize the drop and trigger the Livewire update.
                el._dragContextHelpers.finalizeDrop(dragState.draggedElement);
            }
        };

        el.addEventListener('dragover', handleDragOver);
        el.addEventListener('drop', handleDrop);
    });

    Alpine.directive('drag-item', (el, { expression }, { evaluate, cleanup }) => {
        Alpine.nextTick(() => {
            el.draggable = true;
            el.tabIndex = 0;
            el.setAttribute('role', 'button');
            el.setAttribute('aria-grabbed', 'false');

            const handleDragStart = (e) => {
                const contextInfo = findDragContext(el);
                if (!contextInfo) {
                    e.preventDefault();
                    return;
                }
                const { state: contextState, helpers } = contextInfo;

                contextState.isDragging = true;
                contextState.draggedElement = el;
                contextState.draggedData = expression ? evaluate(expression) : {};

                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', JSON.stringify(contextState.draggedData));

                el.setAttribute('aria-grabbed', 'true');
                helpers.announce('Item grabbed.', 'assertive');
            };

            const handleDragEnd = (e) => {
                const contextInfo = findDragContext(el);
                if (!contextInfo) return;
                const { state: contextState, helpers } = contextInfo;

                el.setAttribute('aria-grabbed', 'false');
                if (contextState) {
                    contextState.isDragging = false;
                    contextState.draggedElement = null;
                    contextState.draggedData = null;
                }
                helpers.announce('Item released.');
            };

            const handleKeyDown = (e) => {
                const contextInfo = findDragContext(el);
                if (!contextInfo) return;
                const { element: contextEl, state: contextState, helpers } = contextInfo;
                let isGrabbed = contextState.isDragging && contextState.draggedElement === el;

                const keyActions = {
                    ' ': () => {
                        e.preventDefault();
                        if (!isGrabbed) {
                            contextState.isDragging = true;
                            contextState.draggedElement = el;
                            contextState.draggedData = expression ? evaluate(expression) : {};
                            el.setAttribute('aria-grabbed', 'true');
                            helpers.announce('Grabbed. Use arrow keys to move.', 'assertive');
                        } else {
                            el.setAttribute('aria-grabbed', 'false');
                            helpers.finalizeDrop(el);
                            helpers.announce('Dropped.');
                        }
                    },
                    'Enter': () => keyActions[' '](), // Enter does the same as Space
                    'Escape': () => {
                        if (isGrabbed) {
                            el.setAttribute('aria-grabbed', 'false');
                            contextState.isDragging = false;
                            contextState.draggedElement = null;
                            contextState.draggedData = null;
                            // Note: You might want to add logic to return the element to its original spot here.
                            helpers.announce('Drag cancelled.');
                        }
                    },
                    'ArrowUp': () => move(e, 'previous'),
                    'ArrowLeft': () => move(e, 'previous'),
                    'ArrowDown': () => move(e, 'next'),
                    'ArrowRight': () => move(e, 'next'),
                };

                function move(event, direction) {
                    if (!isGrabbed) return;
                    event.preventDefault();
                    const allItems = Array.from(contextEl.querySelectorAll('[x-drag-item]'));
                    const currentIndex = allItems.indexOf(el);
                    const targetIndex = direction === 'next'
                        ? (currentIndex + 1) % allItems.length
                        : (currentIndex - 1 + allItems.length) % allItems.length;

                    const targetEl = allItems[targetIndex];
                    if (direction === 'next') {
                        targetEl.parentNode.insertBefore(el, targetEl.nextSibling);
                    } else {
                        targetEl.parentNode.insertBefore(el, targetEl);
                    }
                    el.focus();
                    helpers.announce(`Moved to position ${targetIndex + 1}.`);
                }

                if (keyActions[e.key]) {
                    keyActions[e.key]();
                }
            };

            el.addEventListener('dragstart', handleDragStart);
            el.addEventListener('dragend', handleDragEnd);
            el.addEventListener('keydown', handleKeyDown);

            cleanup(() => {
                el.removeEventListener('dragstart', handleDragStart);
                el.removeEventListener('dragend', handleDragEnd);
                el.removeEventListener('keydown', handleKeyDown);
            });
        });
    });
}