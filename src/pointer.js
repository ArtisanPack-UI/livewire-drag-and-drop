/**
 * Pointer (mouse, pen, touch) dragging with a drop indicator and edge auto-scroll.
 *
 * Mouse and pen drags start after the pointer moves past a small threshold;
 * touch drags start after a press-and-hold so plain swipes still scroll.
 *
 * @package    ArtisanPack UI
 * @subpackage Livewire Drag and Drop
 * @since      2.1.0
 */

import { settings } from './config.js';
import { CONTEXT_SELECTOR, ITEM_SELECTOR, contextOptions, getItems, insertAtIndex, ownerContext } from './dom.js';
import { cancelDrag, currentSession, dropDrag, isEligible, startDrag, updateTarget } from './engine.js';

const IGNORED_TARGETS = 'input, textarea, select, option, [contenteditable=""], [contenteditable="true"], [data-drag-ignore]';

let pending = null;
let suppressNextClick = false;

const raf = (callback) => (typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame(callback)
    : setTimeout(callback, 16));

function isHorizontal(context) {
    return contextOptions(context).orientation === 'horizontal';
}

/**
 * Returns the insertion index for a pointer position among a context's items.
 *
 * @since 2.1.0
 *
 * @param {Element} context Target context.
 * @param {number}  x       Client X.
 * @param {number}  y       Client Y.
 * @param {Element} dragged Item being dragged (not counted).
 * @returns {number}
 */
export function indexAtPoint(context, x, y, dragged) {
    const horizontal = isHorizontal(context);
    const items = getItems(context).filter((item) => item !== dragged);
    const index = items.findIndex((item) => {
        const rect = item.getBoundingClientRect();
        return horizontal ? x < rect.left + rect.width / 2 : y < rect.top + rect.height / 2;
    });
    return index === -1 ? items.length : index;
}

/**
 * Finds the nearest eligible context at or above an element.
 *
 * @since 2.1.0
 */
export function resolveTargetContext(element, current) {
    let context = element && element.closest ? element.closest(CONTEXT_SELECTOR) : null;
    while (context && !isEligible(context, current)) {
        context = context.parentElement ? context.parentElement.closest(CONTEXT_SELECTOR) : null;
    }
    return context;
}

function createGhost(item, x, y) {
    const rect = item.getBoundingClientRect();
    const ghost = item.cloneNode(true);
    [ghost, ...ghost.querySelectorAll('*')].forEach((el) => {
        Array.from(el.attributes).forEach(({ name }) => {
            if (name === 'id' || name.startsWith('x-') || name.startsWith('@') || name.startsWith(':') || name.startsWith('wire:')) {
                el.removeAttribute(name);
            }
        });
    });
    ghost.setAttribute('aria-hidden', 'true');
    ghost.setAttribute('data-drag-ghost', '');
    ghost.removeAttribute('tabindex');
    ghost.removeAttribute('data-dragging');
    Object.assign(ghost.style, {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: '0',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        zIndex: '9999',
        opacity: '0.85',
        willChange: 'transform',
    });
    document.body.appendChild(ghost);
    return { element: ghost, offsetX: x - rect.left, offsetY: y - rect.top, left: rect.left, top: rect.top };
}

function createIndicator(context) {
    const parent = getItems(context)[0]?.parentNode;
    const tag = parent && ['UL', 'OL'].includes(parent.nodeName) ? 'li' : 'div';
    const indicator = document.createElement(tag);
    indicator.setAttribute('data-drag-indicator', '');
    indicator.setAttribute('aria-hidden', 'true');
    const horizontal = isHorizontal(context);
    Object.assign(indicator.style, {
        pointerEvents: 'none',
        listStyle: 'none',
        flex: '0 0 auto',
        alignSelf: 'stretch',
        boxSizing: 'border-box',
        ...(horizontal
            ? { width: '0', minHeight: '1.5rem', borderLeft: '3px solid var(--drag-indicator-color, #2563eb)' }
            : { height: '0', borderTop: '3px solid var(--drag-indicator-color, #2563eb)' }),
    });
    return indicator;
}

function placeIndicator(current) {
    const target = current.target;
    if (!target || !target.allowed) {
        removeIndicator(current);
        return;
    }
    if (!current.indicator || current.indicatorContext !== target.context) {
        removeIndicator(current);
        current.indicator = createIndicator(target.context);
        current.indicatorContext = target.context;
    }
    insertAtIndex(target.context, current.indicator, target.index, [current.item]);
}

function removeIndicator(current) {
    if (current.indicator) {
        current.indicator.remove();
        current.indicator = null;
        current.indicatorContext = null;
    }
}

function scrollableAxis(el, axis) {
    const style = window.getComputedStyle(el);
    const overflow = axis === 'x' ? style.overflowX : style.overflowY;
    const scrollSize = axis === 'x' ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
    return /(auto|scroll|overlay)/.test(overflow) && scrollSize > 0;
}

function edgeDelta(position, start, end) {
    const { edge, speed } = settings.autoScroll;
    if (position < start + edge) {
        return -Math.ceil(speed * (1 - Math.max(0, position - start) / edge));
    }
    if (position > end - edge) {
        return Math.ceil(speed * (1 - Math.max(0, end - position) / edge));
    }
    return 0;
}

/**
 * Scrolls the nearest scrollable ancestor (per axis) of the point, then the window, when the pointer is near an edge.
 *
 * @since 2.1.0
 *
 * @param {number} x Client X.
 * @param {number} y Client Y.
 * @returns {boolean} Whether anything scrolled.
 */
export function autoScrollAt(x, y) {
    let scrolled = false;
    const done = { x: false, y: false };
    let el = document.elementFromPoint ? document.elementFromPoint(x, y) : null;

    while (el && el !== document.body && el !== document.documentElement && !(done.x && done.y)) {
        ['x', 'y'].forEach((axis) => {
            if (done[axis] || !scrollableAxis(el, axis)) {
                return;
            }
            const rect = el.getBoundingClientRect();
            const delta = axis === 'x' ? edgeDelta(x, rect.left, rect.right) : edgeDelta(y, rect.top, rect.bottom);
            done[axis] = true;
            if (delta) {
                const before = axis === 'x' ? el.scrollLeft : el.scrollTop;
                if (axis === 'x') {
                    el.scrollLeft += delta;
                } else {
                    el.scrollTop += delta;
                }
                scrolled = scrolled || (axis === 'x' ? el.scrollLeft : el.scrollTop) !== before;
            }
        });
        el = el.parentElement;
    }

    const page = document.scrollingElement || document.documentElement;
    const dx = done.x || page.scrollWidth <= window.innerWidth ? 0 : edgeDelta(x, 0, window.innerWidth);
    const dy = done.y || page.scrollHeight <= window.innerHeight ? 0 : edgeDelta(y, 0, window.innerHeight);
    if ((dx || dy) && typeof window.scrollBy === 'function') {
        const beforeX = window.scrollX;
        const beforeY = window.scrollY;
        window.scrollBy(dx, dy);
        scrolled = scrolled || window.scrollX !== beforeX || window.scrollY !== beforeY;
    }
    return scrolled;
}

function updatePointer(current, x, y) {
    current.point = { x, y };
    window.getSelection?.()?.removeAllRanges?.();
    if (current.ghost) {
        const { element, offsetX, offsetY, left, top } = current.ghost;
        element.style.transform = `translate(${x - offsetX - left}px, ${y - offsetY - top}px)`;
    }
    const element = document.elementFromPoint ? document.elementFromPoint(x, y) : null;
    const context = resolveTargetContext(element, current);
    updateTarget(context, context ? indexAtPoint(context, x, y, current.item) : null);
    document.body.style.cursor = current.target && !current.target.allowed ? 'not-allowed' : 'grabbing';
    placeIndicator(current);
}

function autoScrollLoop(current) {
    if (currentSession() !== current) {
        return;
    }
    if (current.point && autoScrollAt(current.point.x, current.point.y)) {
        updatePointer(current, current.point.x, current.point.y);
    }
    raf(() => autoScrollLoop(current));
}

function beginDrag(start, x, y) {
    const current = startDrag(start.item, 'pointer');
    pending = null;
    if (!current) {
        return;
    }
    current.pointerId = start.pointerId;
    const previousUserSelect = document.body.style.userSelect;
    current.ghost = createGhost(start.item, start.x, start.y);
    document.body.style.userSelect = 'none';
    current.hooks.cleanup = () => {
        removeIndicator(current);
        current.ghost?.element.remove();
        document.body.style.userSelect = previousUserSelect;
        document.body.style.cursor = '';
    };
    window.getSelection?.()?.removeAllRanges?.();
    updatePointer(current, x, y);
    raf(() => autoScrollLoop(current));
}

/**
 * Whether an event comes from a pointer other than the one that started the drag (or pending press).
 *
 * @since 2.1.0
 *
 * @param {PointerEvent}  event     Pointer event.
 * @param {number|undefined} pointerId Initiating pointer id.
 * @returns {boolean}
 */
function isOtherPointer(event, pointerId) {
    return pointerId !== undefined && event.pointerId !== pointerId;
}

function clearPending() {
    if (pending && pending.timer) {
        clearTimeout(pending.timer);
    }
    pending = null;
}

function onPointerDown(event) {
    if (currentSession() || (event.pointerType !== 'touch' && event.button !== 0)) {
        return;
    }
    const item = event.target.closest ? event.target.closest(ITEM_SELECTOR) : null;
    if (!item || !ownerContext(item) || event.target.closest(IGNORED_TARGETS)) {
        return;
    }
    clearPending();
    pending = { item, pointerId: event.pointerId, pointerType: event.pointerType, x: event.clientX, y: event.clientY, timer: null };
    if (event.pointerType === 'touch') {
        const start = pending;
        start.timer = setTimeout(() => {
            start.timer = null;
            if (pending === start) {
                beginDrag(start, start.x, start.y);
            }
        }, settings.touchDelay);
    }
}

function onPointerMove(event) {
    const current = currentSession();
    if (current && current.mode === 'pointer') {
        if (!isOtherPointer(event, current.pointerId)) {
            updatePointer(current, event.clientX, event.clientY);
        }
        return;
    }
    if (!pending || event.pointerId !== pending.pointerId) {
        return;
    }
    const distance = Math.hypot(event.clientX - pending.x, event.clientY - pending.y);
    if (distance < settings.dragThreshold) {
        return;
    }
    if (pending.pointerType === 'touch') {
        if (pending.timer) {
            clearPending();
        }
        return;
    }
    beginDrag(pending, event.clientX, event.clientY);
}

function onPointerUp(event) {
    const current = currentSession();
    if (pending && !isOtherPointer(event, pending.pointerId)) {
        clearPending();
    }
    if (current && current.mode === 'pointer' && !isOtherPointer(event, current.pointerId)) {
        updatePointer(current, event.clientX, event.clientY);
        suppressNextClick = true;
        setTimeout(() => {
            suppressNextClick = false;
        }, 0);
        dropDrag();
    }
}

function onPointerCancel(event) {
    const current = currentSession();
    if (pending && !isOtherPointer(event, pending.pointerId)) {
        clearPending();
    }
    if (current && current.mode === 'pointer' && !isOtherPointer(event, current.pointerId)) {
        cancelDrag('pointercancel');
    }
}

/**
 * Installs the delegated pointer listeners on the document.
 *
 * @since 2.1.0
 */
export function installPointerListeners() {
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerCancel);
    document.addEventListener('touchmove', (event) => {
        const current = currentSession();
        if ((current && current.mode === 'pointer') || (pending && pending.pointerType === 'touch' && !pending.timer)) {
            event.preventDefault();
        }
    }, { passive: false });
    document.addEventListener('click', (event) => {
        if (suppressNextClick) {
            suppressNextClick = false;
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);
    document.addEventListener('dragstart', (event) => {
        if (event.target.closest && event.target.closest(ITEM_SELECTOR)) {
            event.preventDefault();
        }
    });
    document.addEventListener('selectstart', (event) => {
        if (pending || (currentSession() && currentSession().mode === 'pointer')) {
            event.preventDefault();
        }
    });
    document.addEventListener('contextmenu', (event) => {
        if (currentSession() || (pending && pending.pointerType === 'touch')) {
            event.preventDefault();
        }
    });
}

export function resetPointer() {
    clearPending();
    suppressNextClick = false;
}
