/**
 * Shared test helpers: a real Alpine instance, a Livewire hook stub, and event factories.
 */

import AlpineModule from 'alpinejs';
import LivewireDragAndDrop from '../src/index.js';
import { resetConfiguration } from '../src/config.js';
import { resetDom } from '../src/dom.js';
import { resetEngine } from '../src/engine.js';
import { resetPointer } from '../src/pointer.js';

export const Alpine = AlpineModule.default ?? AlpineModule;
export { LivewireDragAndDrop };

const livewireHooks = {};
export const Livewire = {
    hook(name, callback) {
        (livewireHooks[name] = livewireHooks[name] || []).push(callback);
    },
    trigger(name, payload) {
        (livewireHooks[name] || []).forEach((callback) => callback(payload));
    },
};

let started = false;

/**
 * Starts Alpine once per test file and registers the plugin and Livewire hooks.
 */
export function boot() {
    if (started) {
        return;
    }
    started = true;
    window.Alpine = Alpine;
    window.Livewire = Livewire;
    Alpine.plugin(LivewireDragAndDrop);
    LivewireDragAndDrop.registerLivewireHooks(Livewire);
    Alpine.start();
}

/**
 * Mounts markup inside an Alpine root and waits for directives to initialise.
 */
export async function mount(html, data = '{}') {
    boot();
    const root = document.createElement('div');
    root.setAttribute('x-data', data);
    root.innerHTML = html;
    document.body.appendChild(root);
    Alpine.initTree(root);
    await Alpine.nextTick();
    return root;
}

export function reset() {
    resetEngine();
    resetPointer();
    resetConfiguration();
    document.body.querySelectorAll('[x-data]').forEach((el) => Alpine.destroyTree(el));
    document.body.innerHTML = '';
    document.body.removeAttribute('style');
    resetDom();
}

export function ids(context) {
    return Array.from(context.querySelectorAll('[x-drag-item]'))
        .filter((item) => item.parentElement.closest('[x-drag-context], [data-drag-context]') === context)
        .map((item) => item.textContent.trim());
}

export function liveText() {
    const region = document.querySelector('[data-drag-live-region]');
    return region ? region.textContent.replace(/ $/, '') : '';
}

export function press(element, key) {
    element.focus();
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    element.dispatchEvent(event);
    return event;
}

export function pointer(type, target, { x = 0, y = 0, pointerType = 'mouse', pointerId = 1, button = 0 } = {}) {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button });
    Object.defineProperty(event, 'pointerType', { value: pointerType });
    Object.defineProperty(event, 'pointerId', { value: pointerId });
    target.dispatchEvent(event);
    return event;
}

/**
 * Gives elements fixed boxes so index calculation works in jsdom.
 * `layout` maps elements to { top, left, width, height }.
 */
export function setRects(layout) {
    layout.forEach(([element, box]) => {
        const { top = 0, left = 0, width = 100, height = 20 } = box;
        element.getBoundingClientRect = () => ({
            top, left, width, height, right: left + width, bottom: top + height, x: left, y: top,
        });
    });
}

/**
 * Lays out items in a vertical stack starting at `top`, 20px each.
 */
export function stack(items, top = 0, left = 0) {
    setRects(items.map((item, index) => [item, { top: top + index * 20, left }]));
}

/**
 * Makes document.elementFromPoint return `element` for the next calls.
 */
export function pointAt(element) {
    document.elementFromPoint = () => element;
}

/**
 * Drags `item` with a mouse onto `target` at (x, y) and releases.
 */
export function mouseDrag(item, target, x, y) {
    pointer('pointerdown', item, { x: 1, y: 1 });
    pointAt(target);
    pointer('pointermove', document, { x, y });
    pointer('pointermove', document, { x, y: y + 0.5 });
    pointer('pointerup', document, { x, y });
}
