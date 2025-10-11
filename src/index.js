/**
 * ArtisanPack UI Livewire Drag and Drop
 *
 * This file contains the Alpine.js directives for accessible drag-and-drop.
 * It uses a global event delegation pattern and a robust cleanup/re-initialization
 * strategy to be completely immune to all Livewire DOM replacement strategies.
 *
 * @package    ArtisanPack UI
 * @subpackage Livewire Drag and Drop
 * @since      2.2.0
 * @version    2.2.0
 * @author     ArtisanPack UI Team
 * @copyright  2025 ArtisanPack UI
 * @license    MIT
 */

// --- Global State & Helpers ---
let globalAriaLiveRegion = null;
let hooksInitialized = false;
let isDragUpdate = false;

function getGlobalAriaLiveRegion() { if (!globalAriaLiveRegion) { globalAriaLiveRegion = document.createElement('div'); globalAriaLiveRegion.setAttribute('aria-live', 'polite'); globalAriaLiveRegion.setAttribute('aria-atomic', 'true'); globalAriaLiveRegion.className = 'sr-only'; Object.assign(globalAriaLiveRegion.style, { position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: '0', }); document.body.appendChild(globalAriaLiveRegion); } return globalAriaLiveRegion; }
function createAnnounceFunction() { const liveRegion = getGlobalAriaLiveRegion(); return function announce(message, priority = 'polite') { liveRegion.setAttribute('aria-live', priority); liveRegion.textContent = message; }; }
function findDragContext(element) { const contextEl = element ? element.closest('[x-drag-context]') : null; if (contextEl && contextEl._dragContextState) { return { element: contextEl, state: contextEl._dragContextState, helpers: contextEl._dragContextHelpers }; } return null; }

// --- Core Initialization Logic ---

/**
 * Initializes state and helpers on a drag context element.
 * This function is idempotent.
 * @param {HTMLElement} el The [x-drag-context] element.
 */
function initializeDragContext(el) {
    if (el._dragContextInitialized) return;

    el._dragContextState = { isDragging: false, draggedElement: null, draggedData: null };
    el._dragContextHelpers = {
        announce: createAnnounceFunction(),
        finalizeDrop: (grabbedElement) => {
            if (!grabbedElement) return;
            isDragUpdate = true;
            const allItems = Array.from(el.querySelectorAll('[x-drag-item]'));
            const orderedIds = allItems.map(item => item._dragItemId);
            el._recentlyMovedKeys = allItems.map(item => item.getAttribute('wire:key'));
            el.dispatchEvent(new CustomEvent('drag:end', { bubbles: true, detail: { orderedIds } }));
            el._dragContextState.isDragging = false;
            el._dragContextState.draggedElement = null;
            el._dragContextState.draggedData = null;
        }
    };
    el._dragContextInitialized = true;
}

/**
 * Attaches permanent, delegated event listeners to the document body.
 */
function initializeGlobalListeners() {
    let contextState = null;
    let helpers = null;

    document.body.addEventListener('dragstart', (e) => {
        const dragItem = e.target.closest('[x-drag-item]');
        if (!dragItem) return;
        const contextInfo = findDragContext(dragItem);
        if (!contextInfo) return;
        contextState = contextInfo.state;
        helpers = contextInfo.helpers;
        contextState.isDragging = true; contextState.draggedElement = dragItem; contextState.draggedData = { id: dragItem._dragItemId };
        e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', JSON.stringify(contextState.draggedData));
        dragItem.setAttribute('aria-grabbed', 'true');
        helpers.announce('Item grabbed.', 'assertive');
    });

    document.body.addEventListener('dragover', (e) => {
        const contextEl = e.target.closest('[x-drag-context]');
        if (contextEl && contextState && contextState.isDragging) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }
    });

    document.body.addEventListener('drop', (e) => {
        const contextEl = e.target.closest('[x-drag-context]');
        if (!contextEl || !contextState || !contextState.isDragging) return;
        e.preventDefault();
        const { state, helpers } = findDragContext(contextEl);
        if (state.draggedElement) {
            const targetElement = e.target.closest('[x-drag-item]');
            if (targetElement && targetElement !== state.draggedElement) {
                const rect = targetElement.getBoundingClientRect();
                const isAfter = (e.clientY - rect.top) > (rect.height / 2);
                targetElement.parentNode.insertBefore(state.draggedElement, isAfter ? targetElement.nextSibling : targetElement);
            }
            helpers.finalizeDrop(state.draggedElement);
        }
    });

    document.body.addEventListener('dragend', (e) => {
        const dragItem = e.target.closest('[x-drag-item]');
        if (!dragItem || !contextState) return;
        dragItem.setAttribute('aria-grabbed', 'false');
        if (contextState) { contextState.isDragging = false; contextState.draggedElement = null; contextState.draggedData = null; }
        if (helpers) helpers.announce('Item released.');
        contextState = null; helpers = null;
    });

    document.body.addEventListener('keydown', (e) => {
        const dragItem = e.target.closest('[x-drag-item]');
        if (!dragItem || document.activeElement !== dragItem) return;
        const contextInfo = findDragContext(dragItem);
        if (!contextInfo) return;
        const { element: contextEl, state, helpers } = contextInfo;
        let isGrabbed = state.isDragging && state.draggedElement === dragItem;

        const keyActions = {
            ' ': () => {
                e.preventDefault();
                if (!isGrabbed) {
                    state.isDragging = true; state.draggedElement = dragItem; state.draggedData = { id: dragItem._dragItemId };
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
                    state.isDragging = false; state.draggedElement = null; state.draggedData = null;
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
            const targetIndex = direction === 'next' ? (currentIndex + 1) % allItems.length : (currentIndex - 1 + allItems.length) % allItems.length;
            const targetEl = allItems[targetIndex];
            targetEl.parentNode.insertBefore(dragItem, direction === 'next' ? targetEl.nextSibling : targetEl);
            dragItem.focus();
            helpers.announce(`Moved to position ${targetIndex + 1}.`);
        }

        if (keyActions[e.key]) keyActions[e.key]();
    });
}

function registerLivewireHooks(Livewire) {
    if (hooksInitialized) return;

    Livewire.hook('morph.updating', ({ el }) => {
        if (!isDragUpdate) return;
        const contextEl = el.matches('[x-drag-context]') ? el : el.querySelector('[x-drag-context]');
        if (contextEl && contextEl._recentlyMovedKeys && contextEl._recentlyMovedKeys.length > 0) {
            contextEl._recentlyMovedKeys.forEach(key => {
                const item = el.querySelector(`[wire\\:key="${key}"]`);
                if (item) item.__livewire_ignore = true;
            });
        }
    });

    Livewire.hook('message.processed', () => {
        // After ANY Livewire update, perform a full cleanup and re-initialization.
        isDragUpdate = false;

        document.querySelectorAll('[x-drag-item]').forEach(itemEl => {
            // 1. Proactively clean up any "sticky" ignore flags.
            if (itemEl.__livewire_ignore) {
                delete itemEl.__livewire_ignore;
            }
        });

        document.querySelectorAll('[x-drag-context]').forEach(contextEl => {
            // 2. Re-initialize any replaced parent containers.
            initializeDragContext(contextEl);

            // 3. Re-initialize children to catch any newly added items.
            if (window.Alpine) {
                window.Alpine.initTree(contextEl);
            }
        });
    });

    hooksInitialized = true;
}

function registerDirectives(Alpine) {
    let listenersInitialized = false;

    Alpine.directive('drag-context', (el) => {
        if (!listenersInitialized) {
            initializeGlobalListeners();
            listenersInitialized = true;
        }
        initializeDragContext(el);
    });

    Alpine.directive('drag-item', (el, { expression }, { evaluate }) => {
        el._dragItemId = evaluate(expression);
        Alpine.nextTick(() => {
            el.draggable = true;
            el.tabIndex = 0;
            el.setAttribute('role', 'button');
            el.setAttribute('aria-grabbed', 'false');
        });
    });
}

// --- Self-Initializing Setup ---
document.addEventListener('alpine:init', () => {
    registerDirectives(window.Alpine);
});

document.addEventListener('livewire:init', () => {
    registerLivewireHooks(window.Livewire);
});