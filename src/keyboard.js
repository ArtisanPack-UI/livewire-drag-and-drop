/**
 * Keyboard dragging: grab, move within a context, move between grouped contexts, drop, cancel.
 *
 * @package    ArtisanPack UI
 * @subpackage Livewire Drag and Drop
 * @since      2.1.0
 */

import { settings } from './config.js';
import { ITEM_SELECTOR, announceFor, contextOptions, contextsInGroup, getItems, insertAtIndex, messagesFor, announce, ownerContext } from './dom.js';
import { cancelDrag, currentSession, dropDrag, isAllowed, isEligible, startDrag, updateTarget } from './engine.js';

const SWAPPED = {
    previous: 'previousContainer',
    next: 'nextContainer',
    previousContainer: 'previous',
    nextContainer: 'next',
};

/**
 * Maps a key to an action, swapping within/between bindings for horizontal contexts.
 *
 * @since 2.1.0
 *
 * @param {string}  key        `KeyboardEvent.key`.
 * @param {boolean} horizontal Whether the item's context is horizontal.
 * @returns {string|null}
 */
export function resolveAction(key, horizontal) {
    const action = Object.keys(settings.keys).find((name) => settings.keys[name].includes(key)) || null;
    return horizontal && SWAPPED[action] ? SWAPPED[action] : action;
}

function moveWithin(current, action) {
    const context = ownerContext(current.item);
    const items = getItems(context);
    const index = items.indexOf(current.item);
    const targets = { previous: index - 1, next: index + 1, first: 0, last: items.length - 1 };
    const targetIndex = Math.min(Math.max(targets[action], 0), items.length - 1);
    if (targetIndex === index) {
        return;
    }
    insertAtIndex(context, current.item, targetIndex);
    current.item.focus();
    updateTarget(context, targetIndex);
    announceFor('moved', current.item, context);
}

function moveAcross(current, action) {
    const context = ownerContext(current.item);
    const contexts = current.group === null ? [] : contextsInGroup(current.group).filter((candidate) => isEligible(candidate, current));
    if (contexts.length < 2) {
        moveWithin(current, action === 'previousContainer' ? 'previous' : 'next');
        return;
    }
    const step = action === 'previousContainer' ? -1 : 1;
    let index = contexts.indexOf(context) + step;
    while (index >= 0 && index < contexts.length && !isAllowed(contexts[index], current)) {
        index += step;
    }
    if (index < 0 || index >= contexts.length) {
        announce(messagesFor(context).noContainer);
        return;
    }
    const target = contexts[index];
    const position = Math.min(getItems(context).indexOf(current.item), getItems(target).length);
    insertAtIndex(target, current.item, position);
    current.item.focus();
    updateTarget(target, position);
    announceFor('movedToContainer', current.item, target);
}

function onKeyDown(event) {
    const current = currentSession();
    const item = event.target.closest ? event.target.closest(ITEM_SELECTOR) : null;

    if (current && current.mode === 'pointer') {
        if (resolveAction(event.key, false) === 'cancel') {
            event.preventDefault();
            cancelDrag('escape');
        }
        return;
    }
    if (!item || event.target !== item) {
        return;
    }
    const context = ownerContext(item);
    if (!context) {
        return;
    }
    const action = resolveAction(event.key, contextOptions(context).orientation === 'horizontal');

    if (!current || current.item !== item) {
        if (action === 'grab' && !current) {
            event.preventDefault();
            if (startDrag(item, 'keyboard')) {
                announceFor('grabbed', item, context, 'assertive');
            }
        }
        return;
    }

    switch (action) {
        case 'grab':
            event.preventDefault();
            dropDrag();
            break;
        case 'cancel':
            event.preventDefault();
            cancelDrag('escape');
            break;
        case 'previous':
        case 'next':
        case 'first':
        case 'last':
            event.preventDefault();
            moveWithin(current, action);
            break;
        case 'previousContainer':
        case 'nextContainer':
            event.preventDefault();
            moveAcross(current, action);
            break;
        default:
            break;
    }
}

/**
 * Installs the delegated keyboard listener on the document.
 *
 * @since 2.1.0
 */
export function installKeyboardListeners() {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusout', onFocusOut);
}

/**
 * Cancels a keyboard drag when focus moves to another element.
 *
 * Moving the held item in the DOM blurs it with no `relatedTarget`; that is ignored.
 *
 * @since 2.1.0
 */
function onFocusOut(event) {
    const current = currentSession();
    if (current && current.mode === 'keyboard' && event.target === current.item && event.relatedTarget && event.relatedTarget !== current.item) {
        cancelDrag('blur');
    }
}
