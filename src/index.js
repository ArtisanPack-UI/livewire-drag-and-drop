/**
 * ArtisanPack UI Livewire Drag and Drop
 *
 * Alpine.js directives for accessible drag-and-drop with connected containers.
 * All input is handled by delegated document listeners, so items survive
 * Livewire morphs; decoration is re-applied after each morph.
 *
 * @package    ArtisanPack UI
 * @subpackage Livewire Drag and Drop
 * @since      2.0.0
 * @version    2.1.0
 * @author     ArtisanPack UI Team
 * @copyright  2025 ArtisanPack UI
 * @license    MIT
 */

import { configure } from './config.js';
import { ITEM_SELECTOR, decorateContext, decorateItem, findItemById, itemId, rehydrate, unregisterContext } from './dom.js';
import { cancelDrag, currentSession, revert, revertItem, takeLastKeyboardDrop } from './engine.js';
import { installKeyboardListeners } from './keyboard.js';
import { installPointerListeners } from './pointer.js';

const FOCUS_RESTORE_WINDOW = 10000;

let listenersInstalled = false;

function installListeners() {
    if (listenersInstalled) {
        return;
    }
    listenersInstalled = true;
    installPointerListeners();
    installKeyboardListeners();
}

/**
 * Puts focus back on the last keyboard-dropped item if a morph replaced it.
 *
 * @since 2.1.0
 */
function restoreFocus() {
    const drop = takeLastKeyboardDrop();
    if (!drop || Date.now() - drop.at > FOCUS_RESTORE_WINDOW) {
        return;
    }
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) {
        return;
    }
    const target = (drop.wireKey && Array.from(document.querySelectorAll(ITEM_SELECTOR)).find((item) => item.getAttribute('wire:key') === drop.wireKey))
        || findItemById(drop.itemId);
    if (target) {
        target.focus();
    }
}

/**
 * Registers the Livewire morph hook (Livewire 3 and 4).
 *
 * @since 2.0.0
 *
 * @param {Object} Livewire The Livewire global.
 */
function registerLivewireHooks(Livewire) {
    if (!Livewire || typeof Livewire.hook !== 'function' || Livewire.__livewireDragAndDropHooks) {
        return;
    }
    Livewire.__livewireDragAndDropHooks = true;

    Livewire.hook('morphed', ({ el } = {}) => {
        const current = currentSession();
        if (current && !current.item.isConnected) {
            cancelDrag('removed');
        }
        rehydrate(el && el.isConnected ? el : document.body);
        setTimeout(restoreFocus, 0);
    });
}

/**
 * Alpine plugin: registers `x-drag-context`, `x-drag-item`, and `$dragRevert`.
 *
 * Usable as `Alpine.plugin(LivewireDragAndDrop)` or `LivewireDragAndDrop(Alpine)`;
 * it also registers itself on `alpine:init`, so calling it is optional.
 *
 * @since 2.1.0
 *
 * @param {Object} Alpine The Alpine global.
 */
function LivewireDragAndDrop(Alpine) {
    if (!Alpine || typeof Alpine.directive !== 'function' || Alpine.__livewireDragAndDrop) {
        return;
    }
    Alpine.__livewireDragAndDrop = true;
    installListeners();

    Alpine.directive('drag-context', (el, { expression, modifiers }, { evaluate, cleanup }) => {
        const groupIndex = modifiers.indexOf('group');
        el._dragGroupModifier = groupIndex !== -1 ? (modifiers[groupIndex + 1] ?? null) : null;
        el._dragOptions = expression ? () => {
            try {
                const value = evaluate(expression);
                return value && typeof value === 'object' ? value : {};
            } catch (error) {
                return {};
            }
        } : null;
        el._dragContextInitialized = true;
        decorateContext(el);

        cleanup(() => {
            delete el._dragContextInitialized;
            delete el._dragOptions;
            unregisterContext(el);
        });
    });

    Alpine.directive('drag-item', (el, { expression }, { evaluate, cleanup }) => {
        el._dragItemId = expression ? evaluate(expression) : null;
        decorateItem(el);

        cleanup(() => {
            const current = currentSession();
            if (current && current.item === el && !el.isConnected) {
                cancelDrag('removed');
            }
        });
    });

    Alpine.magic('dragRevert', () => (id) => revertItem(id));
}

LivewireDragAndDrop.configure = configure;
LivewireDragAndDrop.revert = revert;
LivewireDragAndDrop.revertItem = revertItem;
LivewireDragAndDrop.itemId = itemId;
LivewireDragAndDrop.registerLivewireHooks = registerLivewireHooks;

if (typeof window !== 'undefined') {
    window.LivewireDragAndDrop = window.LivewireDragAndDrop || LivewireDragAndDrop;

    document.addEventListener('alpine:init', () => LivewireDragAndDrop(window.Alpine));
    document.addEventListener('livewire:init', () => registerLivewireHooks(window.Livewire));

    if (window.Livewire) {
        registerLivewireHooks(window.Livewire);
    }
}

export default LivewireDragAndDrop;
