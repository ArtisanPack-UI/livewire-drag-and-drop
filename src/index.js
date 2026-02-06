/**
 * ArtisanPack UI Livewire Drag and Drop
 *
 * This file contains the Alpine.js directives for accessible drag-and-drop.
 * It uses a global, stateless event delegation pattern and a robust
 * re-initialization and cleanup strategy.
 *
 * @package    ArtisanPack UI
 * @subpackage Livewire Drag and Drop
 * @since      2.0.0
 * @version    2.1.0
 * @author     ArtisanPack UI Team
 * @copyright  2025 ArtisanPack UI
 * @license    MIT
 */

// --- Global State & Helpers ---
let globalAriaLiveRegion = null;
let hooksInitialized = false;
let listenersInitialized = false;
let isDragUpdate = false;
const temporarilyIgnoredNodes = new Set();
let globalDragState = null; // Tracks current drag operation across contexts

function getGlobalAriaLiveRegion() { if (!globalAriaLiveRegion || !globalAriaLiveRegion.isConnected) { globalAriaLiveRegion = document.createElement('div'); globalAriaLiveRegion.setAttribute('aria-live', 'polite'); globalAriaLiveRegion.setAttribute('aria-atomic', 'true'); globalAriaLiveRegion.className = 'sr-only'; Object.assign(globalAriaLiveRegion.style, { position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: '0', }); document.body.appendChild(globalAriaLiveRegion); } return globalAriaLiveRegion; }

function createAnnounceFunction() { const liveRegion = getGlobalAriaLiveRegion(); return function announce(message, priority = 'polite') { liveRegion.setAttribute('aria-live', priority); liveRegion.textContent = message; }; }

function findDragContext(element) { const contextEl = element ? element.closest('[x-drag-context]') : null; if (contextEl && contextEl._dragContextState) { return { element: contextEl, state: contextEl._dragContextState, helpers: contextEl._dragContextHelpers, group: contextEl._dragGroup }; } return null; }

/**
 * Check if a drop target can accept items from the dragged source.
 * Returns true if same context OR same drag group.
 */
function canAcceptDrop(sourceContext, targetContext) {
    if (!sourceContext || !targetContext) return false;

    // Same context - always allow
    if (sourceContext.element === targetContext.element) return true;

    // Different contexts - check if they share a group
    if (sourceContext.group && targetContext.group && sourceContext.group === targetContext.group) {
        return true;
    }

    return false;
}

// --- Core Initialization Logic ---

function initializeDragContext(el) {
    if (el._dragContextInitialized) return;

    el._dragContextState = { isDragging: false, draggedElement: null, draggedData: null };
    el._dragContextHelpers = {
        announce: createAnnounceFunction(),
        finalizeDrop: (grabbedElement, sourceContextEl = null) => {
            if (!grabbedElement) return;
            isDragUpdate = true;
            const allItems = Array.from(el.querySelectorAll('[x-drag-item]'));
            const orderedIds = allItems.map(item => item._dragItemId);
            el._recentlyMovedKeys = allItems.map(item => item.getAttribute('wire:key'));

            // Check if this is a cross-context drop
            const isCrossContext = sourceContextEl && sourceContextEl !== el;

            if (isCrossContext) {
                // Cross-context drop - dispatch special event with source/target info
                const sourceItems = Array.from(sourceContextEl.querySelectorAll('[x-drag-item]'));
                const sourceOrderedIds = sourceItems.map(item => item._dragItemId);
                sourceContextEl._recentlyMovedKeys = sourceItems.map(item => item.getAttribute('wire:key'));

                el.dispatchEvent(new CustomEvent('drag:cross-context', {
                    bubbles: true,
                    detail: {
                        itemId: grabbedElement._dragItemId,
                        sourceContext: sourceContextEl,
                        sourceOrderedIds: sourceOrderedIds,
                        targetContext: el,
                        targetOrderedIds: orderedIds
                    }
                }));
            } else {
                // Same context drop - dispatch standard event
                el.dispatchEvent(new CustomEvent('drag:end', { bubbles: true, detail: { orderedIds } }));
            }

            el._dragContextState.isDragging = false;
            el._dragContextState.draggedElement = null;
            el._dragContextState.draggedData = null;
        }
    };
    el._dragContextInitialized = true;
}

function forceRehydrateDraggableItems(container) {
    container.querySelectorAll('[x-drag-item]').forEach(itemEl => {
        if (itemEl._dragItemId) {
            itemEl.draggable = true;
            itemEl.tabIndex = 0;
            itemEl.setAttribute('role', 'button');
            if (!itemEl.hasAttribute('aria-grabbed')) {
                itemEl.setAttribute('aria-grabbed', 'false');
            }
        }
    });
}

function initializeGlobalListeners() {
    document.body.addEventListener('dragstart', (e) => {
        const dragItem = e.target.closest('[x-drag-item]');
        const contextInfo = findDragContext(dragItem);
        if (!contextInfo) return;

        const { element: contextEl, state, helpers } = contextInfo;
        state.isDragging = true;
        state.draggedElement = dragItem;
        state.draggedData = { id: dragItem._dragItemId };

        // Store global drag state for cross-context operations
        globalDragState = {
            sourceContext: contextInfo,
            draggedElement: dragItem
        };

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(state.draggedData));
        dragItem.setAttribute('aria-grabbed', 'true');
        helpers.announce('Item grabbed.', 'assertive');
    });

    document.body.addEventListener('dragover', (e) => {
        if (!globalDragState) return;

        const targetContextInfo = findDragContext(e.target);
        if (!targetContextInfo) return;

        // Check if target can accept drop from source
        if (canAcceptDrop(globalDragState.sourceContext, targetContextInfo)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }
    });

    document.body.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!globalDragState) return;

        const targetContextInfo = findDragContext(e.target);
        if (!targetContextInfo) return;

        // Verify drop is allowed
        if (!canAcceptDrop(globalDragState.sourceContext, targetContextInfo)) return;

        const { element: sourceContextEl, state: sourceState } = globalDragState.sourceContext;
        const { element: targetContextEl, helpers: targetHelpers } = targetContextInfo;
        const draggedElement = globalDragState.draggedElement;

        if (draggedElement) {
            const targetElement = e.target.closest('[x-drag-item]');

            // Handle drop positioning
            if (targetElement && targetElement !== draggedElement) {
                const rect = targetElement.getBoundingClientRect();
                const isAfter = (e.clientY - rect.top) > (rect.height / 2);
                targetElement.parentNode.insertBefore(draggedElement, isAfter ? targetElement.nextSibling : targetElement);
            } else if (!targetElement && targetContextEl.contains(e.target)) {
                // Dropped in empty space of context - append to end
                targetContextEl.appendChild(draggedElement);
            }

            // Finalize drop with source context for cross-context detection
            targetHelpers.finalizeDrop(draggedElement, sourceContextEl);
        }
    });

    document.body.addEventListener('dragend', (e) => {
        const dragItem = e.target.closest('[x-drag-item]');
        const contextInfo = findDragContext(dragItem);

        if (dragItem) {
            dragItem.setAttribute('aria-grabbed', 'false');
        }

        if (contextInfo) {
            if (contextInfo.state.isDragging) {
                contextInfo.helpers.announce('Item released.');
            }
            contextInfo.state.isDragging = false;
            contextInfo.state.draggedElement = null;
            contextInfo.state.draggedData = null;
        }

        // Clear global drag state
        globalDragState = null;
    });

    document.body.addEventListener('keydown', (e) => {
        const dragItem = e.target.closest('[x-drag-item]');
        if (!dragItem || document.activeElement !== dragItem) return;
        const contextInfo = findDragContext(dragItem);
        if (!contextInfo) return;

        const { element: contextEl, state, helpers } = contextInfo;
        const isGrabbed = state.isDragging && state.draggedElement === dragItem;

        const keyActions = {
            ' ': () => {
                e.preventDefault();
                if (!isGrabbed) {
                    state.isDragging = true;
                    state.draggedElement = dragItem;
                    dragItem.setAttribute('aria-grabbed', 'true');
                    helpers.announce('Grabbed. Use arrow keys to move.', 'assertive');
                } else {
                    dragItem.setAttribute('aria-grabbed', 'false');
                    helpers.finalizeDrop(dragItem);
                    helpers.announce('Dropped.');
                }
            },
            'Enter': () => keyActions[' '](),
            'Escape': () => {
                if (isGrabbed) {
                    e.preventDefault();
                    dragItem.setAttribute('aria-grabbed', 'false');
                    state.isDragging = false;
                    state.draggedElement = null;
                    helpers.announce('Drag cancelled.');
                }
            },
            'ArrowUp': () => move('previous'), 'ArrowLeft': () => move('previous'),
            'ArrowDown': () => move('next'), 'ArrowRight': () => move('next'),
        };

        function move(direction) {
            if (!isGrabbed) return;
            e.preventDefault();
            const allItems = Array.from(contextEl.querySelectorAll('[x-drag-item]'));
            const currentIndex = allItems.indexOf(dragItem);
            const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

            if (targetIndex >= 0 && targetIndex < allItems.length) {
                const targetEl = allItems[targetIndex];
                targetEl.parentNode.insertBefore(dragItem, direction === 'next' ? targetEl.nextSibling : targetEl);
                dragItem.focus();
                helpers.announce(`Moved to position ${targetIndex + 1}.`);
            }
        }

        if (keyActions[e.key]) keyActions[e.key]();
    });
}

// --- Livewire & Alpine Registration ---

function registerLivewireHooks(Livewire) {
    if (hooksInitialized) return;

    Livewire.hook('morph.updating', ({ el }) => {
        if (!isDragUpdate) return;
        const contextEl = el.matches('[x-drag-context]') ? el : el.querySelector('[x-drag-context]');
        if (contextEl && contextEl._recentlyMovedKeys) {
            contextEl._recentlyMovedKeys.forEach(key => {
                const item = el.querySelector(`[wire\\:key="${key}"]`);
                if (item) {
                    item.__livewire_ignore = true;
                    temporarilyIgnoredNodes.add(item);
                }
            });
        }
    });

    Livewire.hook('message.processed', () => {
        isDragUpdate = false;

        temporarilyIgnoredNodes.forEach(node => {
            delete node.__livewire_ignore;
        });
        temporarilyIgnoredNodes.clear();

        document.querySelectorAll('[x-drag-context]').forEach(contextEl => {
            delete contextEl._dragContextInitialized;
            initializeDragContext(contextEl);

            if (window.Alpine) {
                Alpine.initTree(contextEl);
            }

            forceRehydrateDraggableItems(contextEl);
        });
    });

    hooksInitialized = true;
}

function registerDirectives(Alpine) {
    Alpine.directive('drag-context', (el) => {
        if (!listenersInitialized) {
            initializeGlobalListeners();
            listenersInitialized = true;
        }
        initializeDragContext(el);
    });

    Alpine.directive('drag-group', (el, { expression }, { evaluate }) => {
        // Store the group name on the drag context element
        const groupName = evaluate(expression);
        el._dragGroup = groupName;
    });

    Alpine.directive('drag-item', (el, { expression }, { evaluate }) => {
        el._dragItemId = evaluate(expression);
        el.draggable = true;
        el.tabIndex = 0;
        el.setAttribute('role', 'button');
        el.setAttribute('aria-grabbed', 'false');
    });
}

// --- Default Export for Manual Registration ---

export default function LivewireDragAndDrop(Alpine) {
    registerDirectives(Alpine);

    // Also register Livewire hooks if Livewire is available
    if (window.Livewire) {
        registerLivewireHooks(window.Livewire);
    }
}

// Export individual functions for advanced usage
export { registerDirectives, registerLivewireHooks };

// Reset function for testing purposes
// Note: We don't reset listenersInitialized because the listeners on document.body
// are not removed, so resetting the flag would cause duplicate listeners
export function resetGlobalState() {
    globalAriaLiveRegion = null;
    hooksInitialized = false;
    isDragUpdate = false;
    globalDragState = null;
    temporarilyIgnoredNodes.clear();
}

// --- Automatic Registration (for backward compatibility) ---

document.addEventListener('alpine:init', () => {
    registerDirectives(window.Alpine);
});

document.addEventListener('livewire:init', () => {
    registerLivewireHooks(window.Livewire);
});