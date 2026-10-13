/**
 * DOM helpers: context/item lookup, context options, ARIA decoration, and announcements.
 *
 * @package    ArtisanPack UI
 * @subpackage Livewire Drag and Drop
 * @since      2.1.0
 */

import { settings, format } from './config.js';

export const CONTEXT_SELECTOR = '[x-drag-context], [data-drag-context]';
export const ITEM_SELECTOR = '[x-drag-item]';
const INSTRUCTIONS_PREFIX = 'ldd-instructions';

let liveRegion = null;
const registeredContexts = new Set();
let lastAnnouncement = '';
const instructionIds = new Map();

/**
 * Returns the context an item belongs to (the nearest context above it, never itself).
 *
 * @since 2.1.0
 *
 * @param {Element} item Item element.
 * @returns {Element|null}
 */
export function ownerContext(item) {
    const parent = item ? item.parentElement : null;
    return parent ? parent.closest(CONTEXT_SELECTOR) : null;
}

/**
 * Returns the context's own items in DOM order, excluding items of nested contexts.
 *
 * @since 2.1.0
 *
 * @param {Element} context Context element.
 * @returns {Element[]}
 */
export function getItems(context) {
    return Array.from(context.querySelectorAll(ITEM_SELECTOR)).filter((item) => ownerContext(item) === context);
}

/**
 * Returns the element new items are appended to when a context has no items.
 *
 * @since 2.1.0
 *
 * @param {Element} context Context element.
 * @returns {Element}
 */
export function itemsParent(context) {
    const marked = Array.from(context.querySelectorAll('[data-drag-items]'))
        .find((el) => el.parentElement && el.parentElement.closest(CONTEXT_SELECTOR) === context && !el.matches(CONTEXT_SELECTOR));
    if (marked) {
        return marked;
    }
    const items = getItems(context);
    return items.length ? items[0].parentNode : context;
}

/**
 * Inserts a node so it ends up at `index` among the context's items.
 *
 * @since 2.1.0
 *
 * @param {Element}   context Context element.
 * @param {Node}      node    Node to insert (an item or the drop indicator).
 * @param {number}    index   Target index, counted without `node` and `exclude`.
 * @param {Element[]} exclude Items to ignore when counting.
 */
export function insertAtIndex(context, node, index, exclude = []) {
    const items = getItems(context).filter((item) => item !== node && !exclude.includes(item));
    if (index < items.length) {
        const reference = items[Math.max(0, index)];
        reference.parentNode.insertBefore(node, reference);
    } else if (items.length) {
        const last = items[items.length - 1];
        last.parentNode.insertBefore(node, last.nextSibling);
    } else {
        itemsParent(context).appendChild(node);
    }
}

export function itemId(item) {
    if (!item) {
        return null;
    }
    if (item._dragItemId !== undefined) {
        return item._dragItemId;
    }
    return item.dataset.dragId ?? null;
}

export function orderedIds(context) {
    return getItems(context).map(itemId);
}

function parseMessages(value) {
    if (!value) {
        return {};
    }
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        console.warn('[livewire-drag-and-drop] Ignoring invalid data-drag-messages JSON.', error);
        return {};
    }
}

function detectOrientation(context) {
    const parent = itemsParent(context);
    if (typeof window.getComputedStyle !== 'function') {
        return 'vertical';
    }
    const style = window.getComputedStyle(parent);
    const isFlex = style.display === 'flex' || style.display === 'inline-flex';
    return isFlex && (style.flexDirection || 'row').startsWith('row') ? 'horizontal' : 'vertical';
}

/**
 * Resolves a context's options from its expression, data attributes, and directive modifiers.
 *
 * Precedence: `x-drag-context="{ ... }"` object > `data-drag-*` attributes > modifiers.
 *
 * @since 2.1.0
 *
 * @param {Element} context Context element.
 * @returns {{ id: string|null, group: string|null, label: string|null, disabled: boolean, accepts: Function|null, messages: Object, orientation: string }}
 */
export function contextOptions(context) {
    const options = typeof context._dragOptions === 'function' ? context._dragOptions() : {};
    const disabledAttr = context.getAttribute('data-drag-disabled');
    const attrDisabled = disabledAttr !== null && disabledAttr !== 'false';

    return {
        id: options.id ?? context.getAttribute('data-drag-context-id') ?? (context.id || null),
        group: options.group ?? context.getAttribute('data-drag-group') ?? context.getAttribute('data-group') ?? context._dragGroupModifier ?? null,
        label: options.label ?? context.getAttribute('data-drag-label') ?? context.getAttribute('aria-label') ?? null,
        disabled: options.disabled !== undefined ? Boolean(options.disabled) : attrDisabled,
        accepts: typeof options.accepts === 'function' ? options.accepts : null,
        messages: { ...parseMessages(context.getAttribute('data-drag-messages')), ...(options.messages || {}) },
        orientation: options.orientation ?? context.getAttribute('data-drag-orientation') ?? detectOrientation(context),
    };
}

export function contextId(context) {
    return context ? contextOptions(context).id : null;
}

/**
 * Returns all connected contexts sharing a group, in document order.
 *
 * @since 2.1.0
 *
 * @param {string} group Group name.
 * @returns {Element[]}
 */
export function contextsInGroup(group) {
    return Array.from(document.querySelectorAll(CONTEXT_SELECTOR)).filter((context) => contextOptions(context).group === group);
}

export function findContextById(id) {
    if (id === null || id === undefined) {
        return null;
    }
    return Array.from(document.querySelectorAll(CONTEXT_SELECTOR)).find((context) => String(contextId(context)) === String(id)) || null;
}

export function findItemById(id) {
    return Array.from(document.querySelectorAll(ITEM_SELECTOR)).find((item) => String(itemId(item)) === String(id)) || null;
}

export function messagesFor(context) {
    return context ? { ...settings.messages, ...contextOptions(context).messages } : { ...settings.messages };
}

/**
 * Builds the placeholder values describing an item's place in a context.
 *
 * @since 2.1.0
 *
 * @param {Element} item    Item element.
 * @param {Element} context Context element.
 * @returns {{ item: string, container: string, position: number, total: number }}
 */
export function describe(item, context) {
    const messages = messagesFor(context);
    const items = context ? getItems(context) : [];
    return {
        item: item.getAttribute('data-drag-label') || item.getAttribute('aria-label') || messages.item,
        container: (context && contextOptions(context).label) || messages.container,
        position: items.indexOf(item) + 1,
        total: items.length,
    };
}

function getLiveRegion() {
    if (!liveRegion || !liveRegion.isConnected) {
        liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.setAttribute('data-drag-live-region', '');
        liveRegion.className = 'sr-only';
        Object.assign(liveRegion.style, visuallyHidden);
        document.body.appendChild(liveRegion);
    }
    return liveRegion;
}

const visuallyHidden = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: '0',
};

/**
 * Speaks a message through the shared live region.
 *
 * Repeating the previous message toggles a trailing no-break space so screen
 * readers announce it again.
 *
 * @since 2.1.0
 *
 * @param {string} message  Text to announce.
 * @param {string} priority `polite` or `assertive`.
 */
export function announce(message, priority = 'polite') {
    if (!message) {
        return;
    }
    const region = getLiveRegion();
    let text = String(message);
    if (text === lastAnnouncement.replace(/ $/, '')) {
        text = lastAnnouncement.endsWith(' ') ? text : `${text} `;
    }
    region.setAttribute('aria-live', priority);
    region.textContent = text;
    lastAnnouncement = text;
}

/**
 * Formats and announces a message template for an item in a context.
 *
 * @since 2.1.0
 *
 * @param {string}  key      Message key.
 * @param {Element} item     Item element.
 * @param {Element} context  Context used for labels, counts, and messages.
 * @param {string}  priority Live region priority.
 */
export function announceFor(key, item, context, priority = 'polite') {
    announce(format(messagesFor(context)[key], describe(item, context)), priority);
}

function instructionsId(text) {
    let id = instructionIds.get(text);
    let element = id ? document.getElementById(id) : null;
    if (!element) {
        id = id || `${INSTRUCTIONS_PREFIX}-${instructionIds.size + 1}`;
        element = document.createElement('div');
        element.id = id;
        element.hidden = true;
        element.setAttribute('data-drag-instructions', '');
        element.textContent = text;
        document.body.appendChild(element);
        instructionIds.set(text, id);
    }
    return id;
}

/**
 * Applies the context's role and accessible name without overriding author markup.
 *
 * @since 2.1.0
 *
 * @param {Element} context Context element.
 */
export function decorateContext(context) {
    registeredContexts.add(context);
    if (!context.hasAttribute('data-drag-context')) {
        context.setAttribute('data-drag-context', '');
    }
    if (!context.hasAttribute('role')) {
        context.setAttribute('role', 'group');
    }
    const { label } = contextOptions(context);
    if (label && !context.hasAttribute('aria-label') && !context.hasAttribute('aria-labelledby')) {
        context.setAttribute('aria-label', label);
    }
}

export function unregisterContext(context) {
    registeredContexts.delete(context);
    context.removeAttribute('data-drag-context');
}

/**
 * Makes an item focusable and points `aria-describedby` at the usage instructions.
 *
 * @since 2.1.0
 *
 * @param {Element} item Item element.
 */
export function decorateItem(item) {
    const context = ownerContext(item);
    if (!context) {
        return;
    }
    if (!item.hasAttribute('tabindex')) {
        item.tabIndex = 0;
    }
    if (!item.hasAttribute('role')) {
        item.setAttribute('role', 'button');
    }
    item.removeAttribute('aria-grabbed');

    const id = instructionsId(messagesFor(context).instructions);
    const tokens = (item.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter((token) => token && !token.startsWith(INSTRUCTIONS_PREFIX));
    tokens.push(id);
    item.setAttribute('aria-describedby', tokens.join(' '));
}

/**
 * Re-applies decoration inside a subtree (after a Livewire morph strips attributes).
 *
 * @since 2.1.0
 *
 * @param {Element} root Subtree root.
 */
export function rehydrate(root) {
    if (!root || typeof root.querySelectorAll !== 'function') {
        return;
    }
    registeredContexts.forEach((context) => {
        if (context.isConnected && root.contains(context)) {
            decorateContext(context);
        }
    });
    const contexts = Array.from(root.querySelectorAll(CONTEXT_SELECTOR));
    if (root.matches(CONTEXT_SELECTOR)) {
        contexts.unshift(root);
    }
    contexts.forEach(decorateContext);
    const items = Array.from(root.querySelectorAll(ITEM_SELECTOR));
    if (root.matches(ITEM_SELECTOR)) {
        items.unshift(root);
    }
    items.forEach(decorateItem);
}

export function resetDom() {
    registeredContexts.clear();
    liveRegion = null;
    lastAnnouncement = '';
    instructionIds.clear();
}
