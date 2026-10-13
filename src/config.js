/**
 * Global configuration: announcement templates, keyboard bindings, and tuning.
 *
 * @package    ArtisanPack UI
 * @subpackage Livewire Drag and Drop
 * @since      2.1.0
 */

/**
 * Default announcement templates.
 *
 * Placeholders: {item}, {position}, {total}, {container}. `item` and
 * `container` are the fallback labels used when an element has no
 * `data-drag-label`.
 *
 * @since 2.1.0
 */
export const defaultMessages = {
    item: 'Item',
    container: 'the list',
    instructions: 'Press Space or Enter to pick up. While holding, use the arrow keys to move, Home or End to jump to the start or end, Space or Enter to drop, and Escape to cancel.',
    grabbed: '{item} grabbed. Position {position} of {total} in {container}.',
    moved: '{item} moved to position {position} of {total} in {container}.',
    movedToContainer: '{item} moved to {container}, position {position} of {total}.',
    dropped: '{item} dropped in {container}, position {position} of {total}.',
    cancelled: 'Move cancelled. {item} returned to {container}, position {position} of {total}.',
    rejected: '{item} cannot be dropped in {container}.',
    reverted: '{item} moved back to {container}, position {position} of {total}.',
    noContainer: 'There is no other container in that direction.',
};

/**
 * Default key bindings (values of `KeyboardEvent.key`).
 *
 * For horizontal contexts the within-list and between-container bindings swap.
 *
 * @since 2.1.0
 */
export const defaultKeys = {
    grab: [' ', 'Enter'],
    cancel: ['Escape'],
    previous: ['ArrowUp'],
    next: ['ArrowDown'],
    previousContainer: ['ArrowLeft'],
    nextContainer: ['ArrowRight'],
    first: ['Home'],
    last: ['End'],
};

export const settings = {
    messages: { ...defaultMessages },
    keys: cloneKeys(defaultKeys),
    dragThreshold: 5,
    touchDelay: 200,
    autoScroll: { edge: 48, speed: 20 },
};

function cloneKeys(keys) {
    return Object.fromEntries(Object.entries(keys).map(([action, list]) => [action, [...list]]));
}

/**
 * Merges options into the global configuration.
 *
 * @since 2.1.0
 *
 * @param {Object} options              Options to merge.
 * @param {Object} [options.messages]   Announcement templates to override.
 * @param {Object} [options.keys]       Key bindings to override (string or array per action).
 * @param {number} [options.dragThreshold] Pointer distance in px before a mouse drag starts.
 * @param {number} [options.touchDelay]    Press-and-hold time in ms before a touch drag starts.
 * @param {Object} [options.autoScroll]    `{ edge, speed }` for auto-scrolling while dragging.
 * @returns {Object} The resulting settings.
 */
export function configure(options = {}) {
    if (options.messages) {
        Object.assign(settings.messages, options.messages);
    }
    if (options.keys) {
        Object.entries(options.keys).forEach(([action, list]) => {
            settings.keys[action] = Array.isArray(list) ? [...list] : [list];
        });
    }
    if (typeof options.dragThreshold === 'number') {
        settings.dragThreshold = options.dragThreshold;
    }
    if (typeof options.touchDelay === 'number') {
        settings.touchDelay = options.touchDelay;
    }
    if (options.autoScroll) {
        Object.assign(settings.autoScroll, options.autoScroll);
    }
    return settings;
}

/**
 * Restores the default configuration.
 *
 * @since 2.1.0
 */
export function resetConfiguration() {
    settings.messages = { ...defaultMessages };
    settings.keys = cloneKeys(defaultKeys);
    settings.dragThreshold = 5;
    settings.touchDelay = 200;
    settings.autoScroll = { edge: 48, speed: 20 };
}

/**
 * Replaces `{placeholder}` tokens in a template.
 *
 * Unknown placeholders are left untouched.
 *
 * @since 2.1.0
 *
 * @param {string} template Template string.
 * @param {Object} values   Placeholder values.
 * @returns {string}
 */
export function format(template, values = {}) {
    return String(template ?? '').replace(/\{(\w+)\}/g, (match, key) => (
        Object.prototype.hasOwnProperty.call(values, key) && values[key] !== undefined && values[key] !== null ? String(values[key]) : match
    ));
}
