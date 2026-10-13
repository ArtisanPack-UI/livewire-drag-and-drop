/**
 * Accessibility: ARIA decoration, the keyboard model (within and between
 * contexts), translatable announcements, focus management, and axe checks.
 */

import jestAxe from 'jest-axe';
import { LivewireDragAndDrop, ids, liveText, mount, press, reset } from './helpers.js';

const { axe, toHaveNoViolations } = jestAxe;
expect.extend(toHaveNoViolations);

const $ = (selector) => document.querySelector(selector);
const item = (id) => $(`[x-drag-item="'${id}'"]`);

const board = `
    <div x-drag-context data-drag-group="cards" data-drag-label="Packing" id="packing">
        <div x-drag-item="'1042'" data-drag-label="Order 1042">Order 1042</div>
        <div x-drag-item="'1043'" data-drag-label="Order 1043">Order 1043</div>
    </div>
    <div x-drag-context data-drag-group="cards" data-drag-label="QC" id="qc" data-drag-disabled></div>
    <div x-drag-context data-drag-group="cards" data-drag-label="Shipped" id="shipped">
        <div x-drag-item="'1001'" data-drag-label="Order 1001">Order 1001</div>
        <div x-drag-item="'1002'" data-drag-label="Order 1002">Order 1002</div>
    </div>
`;

describe('ARIA decoration', () => {
    afterEach(reset);

    test('contexts get role="group" and an accessible name from data-drag-label', async () => {
        await mount(board);
        expect($('#packing')).toHaveAttribute('role', 'group');
        expect($('#packing')).toHaveAttribute('aria-label', 'Packing');
    });

    test('author-provided roles and labels are kept', async () => {
        await mount(`
            <ul x-drag-context role="list" aria-label="Mine" data-drag-label="Ignored" id="ctx">
                <li x-drag-item="1" role="listitem" tabindex="-1" aria-describedby="hint">One</li>
            </ul>
            <p id="hint">Hint</p>
        `);
        expect($('#ctx')).toHaveAttribute('role', 'list');
        expect($('#ctx')).toHaveAttribute('aria-label', 'Mine');
        const li = $('li');
        expect(li).toHaveAttribute('role', 'listitem');
        expect(li).toHaveAttribute('tabindex', '-1');
        expect(li.getAttribute('aria-describedby').split(' ')).toEqual(['hint', 'ldd-instructions-1']);
    });

    test('items are focusable buttons described by the instructions, without aria-grabbed', async () => {
        await mount(board);
        const order = item('1042');
        expect(order).toHaveAttribute('tabindex', '0');
        expect(order).toHaveAttribute('role', 'button');
        expect(order).not.toHaveAttribute('aria-grabbed');
        expect(order).not.toHaveAttribute('draggable');
        const instructions = document.getElementById(order.getAttribute('aria-describedby'));
        expect(instructions.textContent).toContain('Press Space or Enter to pick up');
    });

    test('instructions text is configurable per context', async () => {
        await mount(`
            <div x-drag-context data-drag-messages='{"instructions": "Pulsa Espacio para coger."}'>
                <div x-drag-item="1">Uno</div>
            </div>
        `);
        const instructions = document.getElementById($('[x-drag-item]').getAttribute('aria-describedby'));
        expect(instructions.textContent).toBe('Pulsa Espacio para coger.');
    });

    test('has no axe violations at rest and while grabbed', async () => {
        const root = await mount(board);
        expect(await axe(root)).toHaveNoViolations();
        press(item('1042'), ' ');
        expect(await axe(root)).toHaveNoViolations();
        press(item('1042'), 'Escape');
    });
});

describe('keyboard model', () => {
    afterEach(reset);

    test('Space grabs and announces the position and container', async () => {
        await mount(board);
        press(item('1043'), ' ');
        expect(item('1043')).toHaveAttribute('data-dragging');
        expect(liveText()).toBe('Order 1043 grabbed. Position 2 of 2 in Packing.');
    });

    test('Up/Down move within the context; Home/End jump to the ends', async () => {
        await mount(board);
        const order = item('1001');
        press(order, 'Enter');
        press(order, 'ArrowDown');
        expect(ids($('#shipped'))).toEqual(['Order 1002', 'Order 1001']);
        expect(liveText()).toBe('Order 1001 moved to position 2 of 2 in Shipped.');
        press(order, 'Home');
        expect(ids($('#shipped'))).toEqual(['Order 1001', 'Order 1002']);
        press(order, 'End');
        expect(ids($('#shipped'))).toEqual(['Order 1002', 'Order 1001']);
        expect(document.activeElement).toBe(order);
    });

    test('Right moves to the next allowed context in the group, skipping disabled ones', async () => {
        await mount(board);
        const order = item('1042');
        press(order, ' ');
        press(order, 'ArrowRight');
        expect(ids($('#shipped'))).toEqual(['Order 1042', 'Order 1001', 'Order 1002']);
        expect(ids($('#qc'))).toEqual([]);
        expect(liveText()).toBe('Order 1042 moved to Shipped, position 1 of 3.');
        expect(document.activeElement).toBe(order);

        press(order, 'ArrowRight');
        expect(liveText()).toBe('There is no other container in that direction.');

        press(order, 'ArrowLeft');
        expect(ids($('#packing'))).toEqual(['Order 1042', 'Order 1043']);
    });

    test('Space drops and dispatches drag:end describing the cross-context move', async () => {
        await mount(board);
        const ends = [];
        $('#shipped').addEventListener('drag:end', (event) => ends.push(event.detail));
        const order = item('1043');
        press(order, ' ');
        press(order, 'ArrowRight');
        press(order, ' ');
        expect(ends[0]).toMatchObject({ itemId: '1043', fromIndex: 1, toIndex: 1, toOrderedIds: ['1001', '1043', '1002'] });
        expect(liveText()).toBe('Order 1043 dropped in Shipped, position 2 of 3.');
        expect(order).not.toHaveAttribute('data-dragging');
    });

    test('Escape restores the original container and position and announces it', async () => {
        await mount(board);
        const order = item('1043');
        press(order, ' ');
        press(order, 'ArrowRight');
        press(order, 'ArrowUp');
        press(order, 'Escape');
        expect(ids($('#packing'))).toEqual(['Order 1042', 'Order 1043']);
        expect(ids($('#shipped'))).toEqual(['Order 1001', 'Order 1002']);
        expect(liveText()).toBe('Move cancelled. Order 1043 returned to Packing, position 2 of 2.');
        expect(document.activeElement).toBe(order);
    });

    test('moving focus to another element cancels a keyboard drag and restores the item', async () => {
        await mount(`${board}<button id="elsewhere">Elsewhere</button>`);
        const cancels = [];
        $('#packing').addEventListener('drag:cancel', (event) => cancels.push(event.detail.reason));
        const order = item('1042');
        press(order, ' ');
        press(order, 'ArrowRight');
        $('#elsewhere').focus();

        expect(cancels).toEqual(['blur']);
        expect(ids($('#packing'))).toEqual(['Order 1042', 'Order 1043']);
        expect(order).not.toHaveAttribute('data-dragging');
        expect($('#shipped')).not.toHaveAttribute('data-drag-active');
    });

    test('ungrouped vertical lists keep Left/Right as within-list moves', async () => {
        await mount('<div x-drag-context id="list"><div x-drag-item="1">a</div><div x-drag-item="2">b</div></div>');
        const first = $('[x-drag-item="1"]');
        press(first, ' ');
        press(first, 'ArrowRight');
        expect(ids($('#list'))).toEqual(['b', 'a']);
    });

    test('horizontal contexts use Left/Right within the list', async () => {
        await mount(`
            <div x-drag-context data-drag-group="row" data-drag-orientation="horizontal" id="r1"><span x-drag-item="1">a</span><span x-drag-item="2">b</span></div>
            <div x-drag-context data-drag-group="row" data-drag-orientation="horizontal" id="r2"><span x-drag-item="3">c</span></div>
        `);
        const first = $('[x-drag-item="1"]');
        press(first, ' ');
        press(first, 'ArrowRight');
        expect(ids($('#r1'))).toEqual(['b', 'a']);
        press(first, 'ArrowDown');
        expect(ids($('#r2'))).toEqual(['c', 'a']);
    });

    test('key bindings are configurable', async () => {
        LivewireDragAndDrop.configure({ keys: { nextContainer: ['l'], previousContainer: 'h' } });
        await mount(board);
        const order = item('1042');
        press(order, ' ');
        press(order, 'l');
        expect(ids($('#shipped'))[0]).toBe('Order 1042');
        press(order, 'h');
        expect(ids($('#packing'))[0]).toBe('Order 1042');
        press(order, 'Escape');
    });

    test('arrow keys do nothing until an item is grabbed', async () => {
        await mount(board);
        const event = press(item('1042'), 'ArrowDown');
        expect(event.defaultPrevented).toBe(false);
        expect(ids($('#packing'))).toEqual(['Order 1042', 'Order 1043']);
    });

    test('keys pressed inside a control within an item are ignored', async () => {
        await mount('<div x-drag-context><div x-drag-item="1">a <button id="btn">Edit</button></div></div>');
        const event = press($('#btn'), ' ');
        expect(event.defaultPrevented).toBe(false);
        expect($('[x-drag-item]')).not.toHaveAttribute('data-dragging');
    });
});

describe('translatable announcements', () => {
    afterEach(reset);

    test('global templates via configure()', async () => {
        LivewireDragAndDrop.configure({
            messages: {
                grabbed: '{item} cogido. Posición {position} de {total} en {container}.',
                movedToContainer: '{item} movido a {container}, posición {position} de {total}.',
            },
        });
        await mount(board);
        const order = item('1042');
        press(order, ' ');
        expect(liveText()).toBe('Order 1042 cogido. Posición 1 de 2 en Packing.');
        press(order, 'ArrowRight');
        expect(liveText()).toBe('Order 1042 movido a Shipped, posición 1 de 3.');
        press(order, 'Escape');
    });

    test('per-context templates via data-drag-messages override the globals', async () => {
        await mount(`
            <div x-drag-context data-drag-messages='{"grabbed": "Saisi : {item}", "item": "Élément", "container": "la liste"}'>
                <div x-drag-item="1">a</div>
            </div>
        `);
        press($('[x-drag-item]'), ' ');
        expect(liveText()).toBe('Saisi : Élément');
        press($('[x-drag-item]'), 'Escape');
        expect(liveText()).toBe('Move cancelled. Élément returned to la liste, position 1 of 1.');
    });

    test('invalid data-drag-messages JSON falls back to defaults', async () => {
        const warn = console.warn;
        console.warn = () => {};
        await mount('<div x-drag-context data-drag-messages="{nope"><div x-drag-item="1">a</div></div>');
        press($('[x-drag-item]'), ' ');
        expect(liveText()).toBe('Item grabbed. Position 1 of 1 in the list.');
        console.warn = warn;
    });
});
