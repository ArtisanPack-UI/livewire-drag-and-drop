/**
 * Core functionality: registration, configuration, templates, context options,
 * and the shared live region.
 */

import { jest } from '@jest/globals';
import { defaultMessages, format, settings } from '../src/config.js';
import { announce, contextOptions, getItems, insertAtIndex, ownerContext } from '../src/dom.js';
import { Alpine, LivewireDragAndDrop, boot, liveText, mount, reset } from './helpers.js';

const $ = (selector) => document.querySelector(selector);

describe('registration', () => {
    afterEach(reset);

    test('registering the plugin twice is a no-op', () => {
        boot();
        const directive = jest.spyOn(Alpine, 'directive');
        LivewireDragAndDrop(Alpine);
        Alpine.plugin(LivewireDragAndDrop);
        expect(directive).not.toHaveBeenCalled();
        directive.mockRestore();
    });

    test('ignores objects that are not Alpine', () => {
        expect(() => LivewireDragAndDrop(undefined)).not.toThrow();
        expect(() => LivewireDragAndDrop({})).not.toThrow();
    });

    test('registers the Livewire morphed hook once', () => {
        const fake = { hook: jest.fn() };
        LivewireDragAndDrop.registerLivewireHooks(fake);
        LivewireDragAndDrop.registerLivewireHooks(fake);
        expect(fake.hook).toHaveBeenCalledTimes(1);
        expect(fake.hook).toHaveBeenCalledWith('morphed', expect.any(Function));
    });

    test('x-drag-item evaluates its expression in Alpine scope', async () => {
        await mount('<div x-drag-context><div x-drag-item="item.id">x</div></div>', '{ item: { id: 42 } }');
        expect(LivewireDragAndDrop.itemId($('[x-drag-item]'))).toBe(42);
    });
});

describe('configuration and templates', () => {
    afterEach(reset);

    test('format replaces known placeholders and keeps unknown ones', () => {
        expect(format('{item} at {position} of {total} in {container} {nope}', { item: 'A', position: 1, total: 3, container: 'List' }))
            .toBe('A at 1 of 3 in List {nope}');
    });

    test('format ignores inherited properties', () => {
        expect(format('{constructor} {toString} {item}', { item: 'A' })).toBe('{constructor} {toString} A');
    });

    test('configure merges messages and normalises keys', () => {
        LivewireDragAndDrop.configure({ messages: { dropped: 'Soltado.' }, keys: { grab: 'g' }, touchDelay: 300, autoScroll: { edge: 10 } });
        expect(settings.messages.dropped).toBe('Soltado.');
        expect(settings.messages.grabbed).toBe(defaultMessages.grabbed);
        expect(settings.keys.grab).toEqual(['g']);
        expect(settings.touchDelay).toBe(300);
        expect(settings.autoScroll).toEqual({ edge: 10, speed: 20 });
    });

    test('announcements go to a single polite/assertive live region and repeat when identical', () => {
        announce('Hello');
        announce('Hello', 'assertive');
        const regions = document.querySelectorAll('[aria-live]');
        expect(regions).toHaveLength(1);
        expect(regions[0]).toHaveAttribute('aria-live', 'assertive');
        expect(regions[0]).toHaveAttribute('aria-atomic', 'true');
        expect(regions[0].textContent).toBe('Hello ');
        expect(liveText()).toBe('Hello');
        announce('Hello');
        expect(regions[0].textContent).toBe('Hello');
    });
});

describe('context options', () => {
    afterEach(reset);

    test('reads data attributes', async () => {
        await mount(`
            <div x-drag-context id="ctx" data-drag-context-id="col-1" data-drag-group="cards" data-drag-label="Packing"
                 data-drag-disabled data-drag-orientation="horizontal" data-drag-messages='{"dropped": "Done"}'></div>
        `);
        expect(contextOptions($('#ctx'))).toMatchObject({
            id: 'col-1', group: 'cards', label: 'Packing', disabled: true, orientation: 'horizontal', messages: { dropped: 'Done' },
        });
    });

    test('falls back to the element id, the legacy data-group, and vertical orientation', async () => {
        await mount('<div x-drag-context id="ctx" data-group="todos"></div>');
        expect(contextOptions($('#ctx'))).toMatchObject({ id: 'ctx', group: 'todos', disabled: false, orientation: 'vertical' });
    });

    test('detects horizontal orientation from a flex row', async () => {
        await mount('<div x-drag-context id="ctx" style="display: flex"><span x-drag-item="1">a</span></div>');
        expect(contextOptions($('#ctx')).orientation).toBe('horizontal');
    });

    test('the expression object wins over attributes and modifiers', async () => {
        await mount(`<div x-drag-context.group.modifier="{ id: 'from-expr', group: 'expr', label }" data-drag-group="attr" data-drag-context-id="attr"></div>`, "{ label: 'Live' }");
        expect(contextOptions($('[data-drag-context]'))).toMatchObject({ id: 'from-expr', group: 'expr', label: 'Live' });
    });

    test('a non-object or failing expression is ignored', async () => {
        await mount('<div x-drag-context="handleDrop" id="a" data-drag-group="g"></div>', '{ handleDrop() {} }');
        expect(contextOptions($('#a')).group).toBe('g');
    });
});

describe('item ownership and insertion', () => {
    afterEach(reset);

    test('items belong to their nearest context, never to themselves', async () => {
        await mount(`
            <div x-drag-context id="outer">
                <section x-drag-item="'col'" x-drag-context id="col">
                    <div x-drag-item="'card'" id="card">card</div>
                </section>
            </div>
        `);
        expect(ownerContext($('#col'))).toBe($('#outer'));
        expect(ownerContext($('#card'))).toBe($('#col'));
        expect(getItems($('#outer'))).toEqual([$('#col')]);
        expect(getItems($('#col'))).toEqual([$('#card')]);
    });

    test('empty contexts insert into their [data-drag-items] element', async () => {
        await mount(`
            <div x-drag-context id="col"><h3>Title</h3><ul data-drag-items id="list"></ul></div>
            <div x-drag-context id="src"><div x-drag-item="1" id="card">card</div></div>
        `);
        insertAtIndex($('#col'), $('#card'), 0);
        expect($('#card').parentElement).toBe($('#list'));
    });
});
