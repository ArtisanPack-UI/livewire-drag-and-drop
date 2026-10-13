/**
 * Drag session lifecycle shared by pointer and keyboard input.
 *
 * A session runs drag:start → drag:over* → drag:drop (cancelable) → drag:end,
 * or ends with drag:cancel. Committed moves are kept so they can be reverted.
 *
 * @package    ArtisanPack UI
 * @subpackage Livewire Drag and Drop
 * @since      2.1.0
 */

import { format } from './config.js';
import {
    CONTEXT_SELECTOR,
    announce,
    announceFor,
    contextId,
    contextOptions,
    describe,
    findContextById,
    findItemById,
    getItems,
    insertAtIndex,
    itemId,
    messagesFor,
    orderedIds,
    ownerContext,
} from './dom.js';

const MAX_RECORDED_MOVES = 100;

let session = null;
let moveCounter = 0;
const moves = new Map();
let lastKeyboardDrop = null;

export function currentSession() {
    return session;
}

/**
 * Builds a JSON-safe event detail; element references are non-enumerable.
 *
 * @param {Object} data     Enumerable detail fields.
 * @param {Object} elements Non-enumerable extras (elements, functions).
 * @returns {Object}
 */
function makeDetail(data, elements = {}) {
    const detail = { ...data };
    Object.entries(elements).forEach(([key, value]) => {
        Object.defineProperty(detail, key, { value, enumerable: false, writable: true, configurable: true });
    });
    return detail;
}

function dispatch(context, name, detail, cancelable = false) {
    const event = new CustomEvent(name, { bubbles: false, cancelable, detail });
    context.dispatchEvent(event);
    return event;
}

function baseDetail(current) {
    return {
        moveId: current.moveId,
        itemId: current.itemId,
        group: current.group,
        fromContext: contextId(current.fromContext),
        fromIndex: current.fromIndex,
    };
}

function baseElements(current) {
    return { itemElement: current.item, fromElement: current.fromContext };
}

/**
 * Whether a context can take part in the current drag at all (same context or same group).
 *
 * @since 2.1.0
 */
export function isEligible(context, current = session) {
    if (!current || !context || current.item.contains(context)) {
        return false;
    }
    if (context === current.fromContext) {
        return true;
    }
    return current.group !== null && contextOptions(context).group === current.group;
}

/**
 * Whether an eligible context accepts the dragged item right now.
 *
 * @since 2.1.0
 */
export function isAllowed(context, current = session) {
    if (!isEligible(context, current)) {
        return false;
    }
    const options = contextOptions(context);
    if (options.disabled) {
        return false;
    }
    if (!options.accepts) {
        return true;
    }
    try {
        const detail = makeDetail({ ...baseDetail(current), toContext: options.id }, { ...baseElements(current), toElement: context });
        return options.accepts(detail) !== false;
    } catch (error) {
        console.error('[livewire-drag-and-drop] accepts callback threw; refusing the drop.', error);
        return false;
    }
}

function markContexts(current) {
    document.querySelectorAll(CONTEXT_SELECTOR).forEach((context) => {
        if (!isEligible(context, current)) {
            return;
        }
        context.setAttribute(isAllowed(context, current) ? 'data-drag-active' : 'data-drag-disallowed', '');
    });
}

function clearMarks() {
    document.querySelectorAll('[data-drag-active], [data-drag-disallowed], [data-drag-over]').forEach((el) => {
        el.removeAttribute('data-drag-active');
        el.removeAttribute('data-drag-disallowed');
        el.removeAttribute('data-drag-over');
    });
}

/**
 * Starts a drag session for an item. Returns null when there is no context or drag:start was prevented.
 *
 * @since 2.1.0
 *
 * @param {Element} item Item element.
 * @param {string}  mode `pointer` or `keyboard`.
 * @returns {Object|null}
 */
export function startDrag(item, mode) {
    const fromContext = ownerContext(item);
    if (session || !fromContext) {
        return null;
    }
    const candidate = {
        moveId: `move-${++moveCounter}`,
        mode,
        item,
        itemId: itemId(item),
        fromContext,
        fromIndex: getItems(fromContext).indexOf(item),
        group: contextOptions(fromContext).group,
        target: null,
        hooks: {},
    };

    const event = dispatch(fromContext, 'drag:start', makeDetail(baseDetail(candidate), baseElements(candidate)), true);
    if (event.defaultPrevented) {
        return null;
    }

    session = candidate;
    item.setAttribute('data-dragging', '');
    document.body.setAttribute('data-drag-in-progress', mode);
    markContexts(session);
    return session;
}

/**
 * Records the current drop target and dispatches drag:over when it changes.
 *
 * @since 2.1.0
 *
 * @param {Element|null} context Target context, or null when over nothing.
 * @param {number}       index   Insertion index among the target's items (excluding the dragged item).
 */
export function updateTarget(context, index) {
    if (!session) {
        return;
    }
    const previous = session.target;
    if (previous && previous.context === context && previous.index === index) {
        return;
    }
    if (previous && previous.context !== context) {
        previous.context.removeAttribute('data-drag-over');
    }
    if (!context) {
        session.target = null;
        return;
    }
    const allowed = isAllowed(context);
    session.target = { context, index, allowed };
    context.setAttribute('data-drag-over', '');
    dispatch(context, 'drag:over', makeDetail(
        { ...baseDetail(session), toContext: contextId(context), toIndex: index, allowed },
        { ...baseElements(session), toElement: context },
    ));
}

function restoreOrigin(current) {
    if (current.mode === 'keyboard' && current.item.isConnected && current.fromContext.isConnected) {
        insertAtIndex(current.fromContext, current.item, current.fromIndex);
        current.item.focus();
    }
}

function finish(current) {
    if (current.hooks.cleanup) {
        current.hooks.cleanup();
    }
    current.item.removeAttribute('data-dragging');
    document.body.removeAttribute('data-drag-in-progress');
    clearMarks();
    if (session === current) {
        session = null;
    }
}

/**
 * Cancels the session, restoring a keyboard-moved item to where it started.
 *
 * @since 2.1.0
 *
 * @param {string}      reason  `escape`, `blur`, `outside`, `not-allowed`, `rejected`, `pointercancel`, or `removed`.
 * @param {string|null} message Custom announcement; null uses the `cancelled` template.
 */
export function cancelDrag(reason, message = null) {
    const current = session;
    if (!current) {
        return;
    }
    restoreOrigin(current);
    finish(current);

    if (current.fromContext.isConnected) {
        dispatch(current.fromContext, 'drag:cancel', makeDetail({ ...baseDetail(current), reason }, baseElements(current)));
    }
    if (reason === 'removed') {
        return;
    }
    if (message) {
        announce(message, 'assertive');
    } else {
        announceFor('cancelled', current.item, current.fromContext);
    }
}

function recordMove(move) {
    moves.set(move.moveId, move);
    while (moves.size > MAX_RECORDED_MOVES) {
        moves.delete(moves.keys().next().value);
    }
}

/**
 * Drops the item on the current target: dispatches the cancelable drag:drop,
 * commits the DOM move, then dispatches drag:end on both contexts.
 *
 * @since 2.1.0
 *
 * @returns {boolean} Whether the move was committed.
 */
export function dropDrag() {
    const current = session;
    if (!current) {
        return false;
    }
    if (!current.item.isConnected) {
        cancelDrag('removed');
        return false;
    }
    const { item, fromContext } = current;
    const target = current.mode === 'keyboard'
        ? { context: ownerContext(item), index: getItems(ownerContext(item)).indexOf(item), allowed: isAllowed(ownerContext(item)) }
        : current.target;

    if (!target) {
        cancelDrag('outside');
        return false;
    }
    const toContext = target.context;
    if (!target.allowed) {
        cancelDrag('not-allowed', format(messagesFor(toContext).rejected, describe(item, toContext)));
        return false;
    }

    let rejectMessage = null;
    const dropDetail = makeDetail(
        { ...baseDetail(current), toContext: contextId(toContext), toIndex: target.index },
        {
            ...baseElements(current),
            toElement: toContext,
            reject(message) {
                rejectMessage = message ?? rejectMessage;
                dropEvents.forEach((event) => event.preventDefault());
            },
        },
    );
    const dropEvents = [];
    [toContext, fromContext].filter((context, index, list) => list.indexOf(context) === index).forEach((context) => {
        const event = new CustomEvent('drag:drop', { bubbles: false, cancelable: true, detail: dropDetail });
        dropEvents.push(event);
        context.dispatchEvent(event);
    });

    if (dropEvents.some((event) => event.defaultPrevented)) {
        const message = rejectMessage ?? dropDetail.message ?? format(messagesFor(toContext).rejected, describe(item, toContext));
        cancelDrag('rejected', message);
        return false;
    }

    if (current.mode === 'pointer') {
        insertAtIndex(toContext, item, target.index);
    }
    finish(current);

    const toIndex = getItems(toContext).indexOf(item);
    recordMove({
        moveId: current.moveId,
        itemId: current.itemId,
        item,
        fromContext,
        fromContextId: contextId(fromContext),
        fromIndex: current.fromIndex,
        toContext,
        toIndex,
    });
    if (current.mode === 'keyboard') {
        lastKeyboardDrop = { itemId: current.itemId, wireKey: item.getAttribute('wire:key'), at: Date.now() };
    }

    dispatchEnd('drag:end', {
        ...baseDetail(current),
        toContext: contextId(toContext),
        toIndex,
    }, current, fromContext, toContext);

    announceFor('dropped', item, toContext);
    return true;
}

function dispatchEnd(name, data, current, fromContext, toContext) {
    const fromOrderedIds = orderedIds(fromContext);
    const toOrderedIds = toContext === fromContext ? fromOrderedIds : orderedIds(toContext);
    const elements = { itemElement: current.item, fromElement: fromContext, toElement: toContext };

    dispatch(toContext, name, makeDetail({ ...data, orderedIds: toOrderedIds, fromOrderedIds, toOrderedIds }, elements));
    if (toContext !== fromContext) {
        dispatch(fromContext, name, makeDetail({ ...data, orderedIds: fromOrderedIds, fromOrderedIds, toOrderedIds }, elements));
    }
}

/**
 * Puts an item back where a committed move took it from and announces it.
 *
 * Later recorded moves of the same item are discarded. Dispatches drag:revert
 * on both contexts (`fromContext`/`toContext` describe the original move).
 *
 * @since 2.1.0
 *
 * @param {string} moveId The `moveId` from the move's events.
 * @returns {boolean} Whether anything was reverted.
 */
export function revert(moveId) {
    const move = moves.get(moveId);
    if (!move) {
        return false;
    }
    if (session && session.item === move.item) {
        cancelDrag('removed');
    }
    const item = move.item.isConnected ? move.item : findItemById(move.itemId);
    const fromContext = move.fromContext.isConnected ? move.fromContext : findContextById(move.fromContextId);
    if (!item || !fromContext) {
        moves.delete(moveId);
        return false;
    }
    const currentContext = ownerContext(item) || move.toContext;
    const hadFocus = document.activeElement === item;

    let discard = false;
    Array.from(moves.values()).forEach((entry) => {
        discard = discard || entry === move;
        if (discard && String(entry.itemId) === String(move.itemId)) {
            moves.delete(entry.moveId);
        }
    });

    insertAtIndex(fromContext, item, move.fromIndex);
    if (hadFocus) {
        item.focus();
    }

    dispatchEnd('drag:revert', {
        moveId: move.moveId,
        itemId: move.itemId,
        group: contextOptions(fromContext).group,
        fromContext: contextId(fromContext),
        fromIndex: move.fromIndex,
        toContext: contextId(currentContext),
        toIndex: move.toIndex,
    }, { item }, fromContext, currentContext);

    announceFor('reverted', item, fromContext, 'assertive');
    return true;
}

/**
 * Reverts the most recent recorded move of an item.
 *
 * @since 2.1.0
 *
 * @param {string|number} id Item id (the `x-drag-item` value).
 * @returns {boolean}
 */
export function revertItem(id) {
    const latest = Array.from(moves.values()).reverse().find((move) => String(move.itemId) === String(id));
    return latest ? revert(latest.moveId) : false;
}

export function takeLastKeyboardDrop() {
    return lastKeyboardDrop;
}

export function resetEngine() {
    if (session) {
        finish(session);
    }
    session = null;
    moves.clear();
    lastKeyboardDrop = null;
}
