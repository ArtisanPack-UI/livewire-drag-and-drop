/**
 * Basic test to verify the Jest + Alpine harness.
 */

import { Alpine, LivewireDragAndDrop, mount, reset } from './helpers.js';

describe('Basic setup', () => {
    afterEach(reset);

    test('exposes the plugin with its API', () => {
        expect(typeof LivewireDragAndDrop).toBe('function');
        expect(typeof LivewireDragAndDrop.configure).toBe('function');
        expect(typeof LivewireDragAndDrop.revert).toBe('function');
        expect(window.LivewireDragAndDrop).toBe(LivewireDragAndDrop);
    });

    test('keeps the 2.0.1 named exports', async () => {
        const module = await import('../src/index.js');

        expect(module.default).toBe(LivewireDragAndDrop);
        expect(module.registerDirectives).toBe(LivewireDragAndDrop);
        expect(module.registerLivewireHooks).toBe(LivewireDragAndDrop.registerLivewireHooks);
    });

    test('runs against a real Alpine instance', async () => {
        await mount('<div x-drag-context><div x-drag-item="7">x</div></div>');
        expect(Alpine.version).toBeDefined();
        expect(document.querySelector('[x-drag-item]')._dragItemId).toBe(7);
    });
});
