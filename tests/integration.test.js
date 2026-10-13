/**
 * Lifecycle events (start/over/drop/cancel), vetoes, accept rules, the revert
 * API with in-flight moves, and Livewire morph integration.
 */

import { jest } from '@jest/globals';
import { Alpine, Livewire, LivewireDragAndDrop, ids, liveText, mount, mouseDrag, pointAt, pointer, press, reset, stack } from './helpers.js';

const $ = (selector) => document.querySelector(selector);
const item = (id) => $(`[x-drag-item="'${id}'"]`);

const board = `
    <div x-drag-context data-drag-group="cards" data-drag-context-id="packing" data-drag-label="Packing" id="packing">
        <div x-drag-item="'a'" data-drag-label="Card A" wire:key="card-a">a</div>
        <div x-drag-item="'b'" data-drag-label="Card B" wire:key="card-b">b</div>
    </div>
    <div x-drag-context data-drag-group="cards" data-drag-context-id="shipped" data-drag-label="Shipped" id="shipped">
        <div x-drag-item="'c'" data-drag-label="Card C" wire:key="card-c">c</div>
    </div>
`;

async function mountBoard(html = board, data = '{}') {
    const root = await mount(html, data);
    stack([item('a'), item('b')], 0);
    stack([item('c')], 200);
    return root;
}

function collect(element, names) {
    const events = [];
    names.forEach((name) => element.addEventListener(name, (event) => events.push([name, event.detail])));
    return events;
}

describe('lifecycle events', () => {
    afterEach(reset);

    test('drag:start, drag:over, drag:drop, drag:end fire in order with a shared moveId', async () => {
        await mountBoard();
        const names = ['drag:start', 'drag:over', 'drag:drop', 'drag:end', 'drag:cancel'];
        const from = collect($('#packing'), names);
        const to = collect($('#shipped'), names);

        mouseDrag(item('a'), item('c'), 10, 215);

        expect(from.map(([name]) => name)).toEqual(['drag:start', 'drag:drop', 'drag:end']);
        expect(to.map(([name]) => name)).toEqual(['drag:over', 'drag:drop', 'drag:end']);
        expect(from[0][1]).toEqual({ moveId: expect.any(String), itemId: 'a', group: 'cards', fromContext: 'packing', fromIndex: 0 });
        expect(to[0][1]).toMatchObject({ toContext: 'shipped', toIndex: 1, allowed: true });
        const moveIds = new Set([...from, ...to].map(([, detail]) => detail.moveId));
        expect(moveIds.size).toBe(1);
    });

    test('drag:over fires only when the target or index changes', async () => {
        await mountBoard();
        const overs = collect($('#shipped'), ['drag:over']);
        pointer('pointerdown', item('a'), { x: 1, y: 1 });
        pointAt(item('c'));
        pointer('pointermove', document, { x: 10, y: 215 });
        pointer('pointermove', document, { x: 11, y: 216 });
        pointer('pointermove', document, { x: 12, y: 217 });
        pointer('pointermove', document, { x: 12, y: 202 });
        pointer('pointerup', document, { x: 12, y: 202 });
        expect(overs.map(([, detail]) => detail.toIndex)).toEqual([1, 0]);
    });

    test('preventing drag:start stops the drag', async () => {
        await mountBoard();
        $('#packing').addEventListener('drag:start', (event) => event.preventDefault());
        press(item('a'), ' ');
        expect(item('a')).not.toHaveAttribute('data-dragging');
        mouseDrag(item('a'), item('c'), 10, 215);
        expect(ids($('#shipped'))).toEqual(['c']);
    });

    test('preventDefault on drag:drop keeps the item in place and announces the message', async () => {
        await mountBoard();
        const ends = jest.fn();
        const cancels = collect($('#packing'), ['drag:cancel']);
        $('#shipped').addEventListener('drag:end', ends);
        $('#shipped').addEventListener('drag:drop', (event) => {
            event.preventDefault();
            event.detail.message = 'Shipped is at its WIP limit.';
        });

        mouseDrag(item('a'), item('c'), 10, 215);

        expect(ids($('#packing'))).toEqual(['a', 'b']);
        expect(ids($('#shipped'))).toEqual(['c']);
        expect(ends).not.toHaveBeenCalled();
        expect(cancels[0][1].reason).toBe('rejected');
        expect(liveText()).toBe('Shipped is at its WIP limit.');
    });

    test('detail.reject() vetoes a keyboard drop and restores the origin', async () => {
        await mountBoard();
        $('#packing').addEventListener('drag:drop', (event) => {
            if (event.detail.toContext !== event.detail.fromContext) {
                event.detail.reject();
            }
        });
        const card = item('b');
        press(card, ' ');
        press(card, 'ArrowRight');
        expect(ids($('#shipped'))).toEqual(['c', 'b']);
        press(card, ' ');
        expect(ids($('#packing'))).toEqual(['a', 'b']);
        expect(liveText()).toBe('Card B cannot be dropped in Shipped.');
        expect(document.activeElement).toBe(card);
    });
});

describe('accept rules', () => {
    afterEach(reset);

    test('data-drag-disabled marks the context not-allowed and refuses the drop', async () => {
        await mountBoard(board.replace('id="shipped"', 'id="shipped" data-drag-disabled'));
        const cancels = collect($('#packing'), ['drag:cancel']);
        pointer('pointerdown', item('a'), { x: 1, y: 1 });
        pointAt(item('c'));
        pointer('pointermove', document, { x: 10, y: 215 });

        expect($('#shipped')).toHaveAttribute('data-drag-disallowed');
        expect($('#packing')).toHaveAttribute('data-drag-active');
        expect($('[data-drag-indicator]')).toBeNull();
        expect(document.body.style.cursor).toBe('not-allowed');

        pointer('pointerup', document, { x: 10, y: 215 });
        expect(ids($('#shipped'))).toEqual(['c']);
        expect(cancels[0][1].reason).toBe('not-allowed');
        expect(liveText()).toBe('Card A cannot be dropped in Shipped.');
    });

    test('data-drag-disabled="false" is treated as enabled', async () => {
        await mountBoard(board.replace('id="shipped"', 'id="shipped" data-drag-disabled="false"'));
        mouseDrag(item('a'), item('c'), 10, 215);
        expect(ids($('#shipped'))).toEqual(['c', 'a']);
    });

    test('an accepts callback in the context options can refuse items', async () => {
        await mountBoard(
            board.replace('x-drag-context data-drag-group="cards" data-drag-context-id="shipped"', `x-drag-context="{ accepts: (detail) => detail.itemId !== 'a' }" data-drag-group="cards" data-drag-context-id="shipped"`),
        );
        mouseDrag(item('a'), item('c'), 10, 215);
        expect(ids($('#shipped'))).toEqual(['c']);
        stack([item('a'), item('b')], 0);
        mouseDrag(item('b'), item('c'), 10, 215);
        expect(ids($('#shipped'))).toEqual(['c', 'b']);
    });

    test('options are reactive (e.g. a WIP limit)', async () => {
        await mountBoard(
            board.replace('x-drag-context data-drag-group="cards" data-drag-context-id="shipped"', 'x-drag-context="{ disabled: full }" data-drag-group="cards" data-drag-context-id="shipped"'),
            '{ full: true }',
        );
        mouseDrag(item('a'), item('c'), 10, 215);
        expect(ids($('#shipped'))).toEqual(['c']);

        Alpine.$data($('[x-data]')).full = false;
        stack([item('a'), item('b')], 0);
        mouseDrag(item('a'), item('c'), 10, 215);
        expect(ids($('#shipped'))).toEqual(['c', 'a']);
    });

    test('an accepts callback that throws refuses the drop', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        try {
            await mountBoard(
                board.replace('x-drag-context data-drag-group="cards" data-drag-context-id="shipped"', `x-drag-context="{ accepts: () => { throw new Error('boom') } }" data-drag-group="cards" data-drag-context-id="shipped"`),
            );
            mouseDrag(item('a'), item('c'), 10, 215);
            expect(ids($('#shipped'))).toEqual(['c']);
        } finally {
            spy.mockRestore();
        }
    });

    test('the group modifier connects contexts', async () => {
        await mount(`
            <div x-drag-context.group.cards id="one"><div x-drag-item="'a'">a</div></div>
            <div x-drag-context.group.cards id="two"></div>
        `);
        mouseDrag(item('a'), $('#two'), 10, 300);
        expect(ids($('#two'))).toEqual(['a']);
    });
});

describe('revert', () => {
    afterEach(reset);

    test('revert(moveId) puts the item back, dispatches drag:revert, and announces it', async () => {
        await mountBoard();
        let moveId;
        $('#shipped').addEventListener('drag:end', (event) => {
            moveId = event.detail.moveId;
        });
        const reverts = collect($('#packing'), ['drag:revert']);

        mouseDrag(item('a'), item('c'), 10, 215);
        expect(ids($('#shipped'))).toEqual(['c', 'a']);

        expect(LivewireDragAndDrop.revert(moveId)).toBe(true);
        expect(ids($('#packing'))).toEqual(['a', 'b']);
        expect(ids($('#shipped'))).toEqual(['c']);
        expect(reverts[0][1]).toMatchObject({ moveId, itemId: 'a', fromContext: 'packing', toContext: 'shipped', orderedIds: ['a', 'b'] });
        expect(liveText()).toBe('Card A moved back to Packing, position 1 of 2.');

        expect(LivewireDragAndDrop.revert(moveId)).toBe(false);
    });

    test('$dragRevert(itemId) reverts the latest move of that item', async () => {
        await mountBoard(`${board}<button id="undo" @click="$dragRevert('b')">Undo</button>`);
        mouseDrag(item('b'), item('c'), 10, 215);
        expect(ids($('#shipped'))).toEqual(['c', 'b']);
        await new Promise((resolve) => setTimeout(resolve, 0));
        $('#undo').click();
        expect(ids($('#packing'))).toEqual(['a', 'b']);
    });

    test('in-flight moves are reverted independently', async () => {
        await mountBoard();
        const moveIds = [];
        $('#shipped').addEventListener('drag:end', (event) => moveIds.push(event.detail.moveId));

        mouseDrag(item('a'), item('c'), 10, 215);
        stack([item('b')], 0);
        stack([item('c'), item('a')], 200);
        mouseDrag(item('b'), item('c'), 10, 205);
        expect(ids($('#shipped'))).toEqual(['b', 'c', 'a']);

        LivewireDragAndDrop.revert(moveIds[0]);
        expect(ids($('#packing'))).toEqual(['a']);
        expect(ids($('#shipped'))).toEqual(['b', 'c']);

        LivewireDragAndDrop.revert(moveIds[1]);
        expect(ids($('#packing'))).toEqual(['b', 'a']);
        expect(ids($('#shipped'))).toEqual(['c']);
    });

    test('reverting an earlier move of an item discards its later moves', async () => {
        await mountBoard();
        const moveIds = [];
        $('#packing').addEventListener('drag:end', (event) => moveIds.push(event.detail.moveId));
        const card = item('a');
        press(card, ' ');
        press(card, 'ArrowDown');
        press(card, ' ');
        press(card, ' ');
        press(card, 'ArrowUp');
        press(card, ' ');
        expect(moveIds).toHaveLength(2);

        expect(LivewireDragAndDrop.revert(moveIds[0])).toBe(true);
        expect(LivewireDragAndDrop.revert(moveIds[1])).toBe(false);
        expect(LivewireDragAndDrop.revertItem('a')).toBe(false);
    });

    test('revert finds the item again after it was re-rendered', async () => {
        await mountBoard();
        let moveId;
        $('#shipped').addEventListener('drag:end', (event) => {
            moveId = event.detail.moveId;
        });
        mouseDrag(item('a'), item('c'), 10, 215);

        const replacement = item('a').cloneNode(true);
        replacement._dragItemId = 'a';
        item('a').replaceWith(replacement);

        expect(LivewireDragAndDrop.revert(moveId)).toBe(true);
        expect(ids($('#packing'))).toEqual(['a', 'b']);
    });

    test('revert of an unknown move returns false', () => {
        expect(LivewireDragAndDrop.revert('move-unknown')).toBe(false);
        expect(LivewireDragAndDrop.revertItem('nope')).toBe(false);
    });
});

describe('Livewire integration', () => {
    afterEach(() => {
        jest.useRealTimers();
        reset();
    });

    test('re-applies decoration stripped by a morph', async () => {
        await mountBoard();
        const card = item('a');
        card.removeAttribute('tabindex');
        card.removeAttribute('role');
        card.removeAttribute('aria-describedby');
        $('#packing').removeAttribute('role');

        Livewire.trigger('morphed', { el: $('[x-data]') });

        expect(card).toHaveAttribute('tabindex', '0');
        expect(card).toHaveAttribute('role', 'button');
        expect(card.getAttribute('aria-describedby')).toMatch(/^ldd-instructions-/);
        expect($('#packing')).toHaveAttribute('role', 'group');
    });

    test('restores focus to the dropped item when a morph replaced it', async () => {
        await mountBoard();
        jest.useFakeTimers();
        const card = item('a');
        press(card, ' ');
        press(card, 'ArrowRight');
        press(card, ' ');

        const replacement = document.createElement('div');
        replacement.setAttribute('x-drag-item', "'a'");
        replacement.setAttribute('wire:key', 'card-a');
        replacement.textContent = 'a';
        card.replaceWith(replacement);
        Livewire.trigger('morphed', { el: $('[x-data]') });
        jest.runOnlyPendingTimers();

        expect(document.activeElement).toBe(replacement);
    });

    test('restores focus for wire:key values that are not valid in a CSS selector', async () => {
        await mountBoard();
        jest.useFakeTimers();
        const card = item('a');
        card.setAttribute('wire:key', 'card"a\nb\\');
        press(card, ' ');
        press(card, ' ');

        const replacement = document.createElement('div');
        replacement.setAttribute('x-drag-item', "'other'");
        replacement.setAttribute('wire:key', 'card"a\nb\\');
        replacement.tabIndex = 0;
        card.replaceWith(replacement);
        Livewire.trigger('morphed', { el: $('[x-data]') });
        expect(() => jest.runOnlyPendingTimers()).not.toThrow();
        expect(document.activeElement).toBe(replacement);
    });

    test('does not steal focus the user has moved elsewhere', async () => {
        await mountBoard(`${board}<input id="other">`);
        jest.useFakeTimers();
        const card = item('a');
        press(card, ' ');
        press(card, ' ');
        $('#other').focus();
        Livewire.trigger('morphed', { el: $('[x-data]') });
        jest.runOnlyPendingTimers();
        expect(document.activeElement).toBe($('#other'));
    });

    test('cancels an active drag whose item was removed by a morph', async () => {
        await mountBoard();
        const cancels = collect($('#packing'), ['drag:cancel']);
        press(item('a'), ' ');
        item('a').remove();
        Livewire.trigger('morphed', { el: $('[x-data]') });
        expect(cancels[0][1].reason).toBe('removed');
    });

    test('drag:end payload can be passed straight to $wire', async () => {
        await mountBoard();
        let payload;
        $('#shipped').addEventListener('drag:end', (event) => {
            payload = JSON.parse(JSON.stringify(event.detail));
        });
        mouseDrag(item('a'), item('c'), 10, 215);
        expect(payload).toEqual({
            moveId: expect.any(String),
            itemId: 'a',
            group: 'cards',
            fromContext: 'packing',
            fromIndex: 0,
            toContext: 'shipped',
            toIndex: 1,
            orderedIds: ['c', 'a'],
            fromOrderedIds: ['b'],
            toOrderedIds: ['c', 'a'],
        });
    });
});
