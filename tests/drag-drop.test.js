/**
 * Pointer drag-and-drop: reordering, connected containers, empty containers,
 * the drop indicator, nested contexts, and auto-scroll.
 */

import { jest } from '@jest/globals';
import { autoScrollAt } from '../src/pointer.js';
import { ids, mount, mouseDrag, pointAt, pointer, reset, stack } from './helpers.js';

const board = `
    <div x-drag-context data-drag-group="cards" data-drag-context-id="todo" data-drag-label="To do" id="todo">
        <div x-drag-item="'a'">a</div>
        <div x-drag-item="'b'">b</div>
        <div x-drag-item="'c'">c</div>
    </div>
    <div x-drag-context data-drag-group="cards" data-drag-context-id="done" data-drag-label="Done" id="done">
        <div x-drag-item="'d'">d</div>
    </div>
    <div x-drag-context data-drag-group="cards" data-drag-context-id="qc" id="qc"></div>
    <div x-drag-context data-drag-context-id="other" id="other">
        <div x-drag-item="'x'">x</div>
    </div>
`;

const $ = (selector) => document.querySelector(selector);
const item = (id) => $(`[x-drag-item="'${id}'"]`);

describe('pointer drag-and-drop', () => {
    afterEach(reset);

    beforeEach(async () => {
        await mount(board);
        stack([item('a'), item('b'), item('c')], 0);
        stack([item('d')], 200);
    });

    test('reorders within a context and reports indices', () => {
        const ends = [];
        $('#todo').addEventListener('drag:end', (event) => ends.push(event.detail));

        mouseDrag(item('a'), item('c'), 10, 55);

        expect(ids($('#todo'))).toEqual(['b', 'c', 'a']);
        expect(ends).toHaveLength(1);
        expect(ends[0]).toMatchObject({
            itemId: 'a',
            fromContext: 'todo',
            toContext: 'todo',
            fromIndex: 0,
            toIndex: 2,
            orderedIds: ['b', 'c', 'a'],
            fromOrderedIds: ['b', 'c', 'a'],
            toOrderedIds: ['b', 'c', 'a'],
            group: 'cards',
        });
        expect(ends[0].moveId).toMatch(/^move-/);
    });

    test('moves an item to another context in the same group and dispatches drag:end on both', () => {
        const fromEnds = [];
        const toEnds = [];
        $('#todo').addEventListener('drag:end', (event) => fromEnds.push(event.detail));
        $('#done').addEventListener('drag:end', (event) => toEnds.push(event.detail));

        mouseDrag(item('b'), item('d'), 10, 205);

        expect(ids($('#todo'))).toEqual(['a', 'c']);
        expect(ids($('#done'))).toEqual(['b', 'd']);
        expect(toEnds[0]).toMatchObject({
            itemId: 'b', fromContext: 'todo', toContext: 'done', fromIndex: 1, toIndex: 0,
            orderedIds: ['b', 'd'], fromOrderedIds: ['a', 'c'], toOrderedIds: ['b', 'd'],
        });
        expect(fromEnds[0]).toMatchObject({ orderedIds: ['a', 'c'], moveId: toEnds[0].moveId });
    });

    test('drag:end detail is JSON-safe but exposes elements non-enumerably', () => {
        let detail;
        $('#done').addEventListener('drag:end', (event) => {
            detail = event.detail;
        });
        mouseDrag(item('a'), item('d'), 10, 215);

        expect(detail.itemElement).toBe(item('a'));
        expect(detail.toElement).toBe($('#done'));
        expect(Object.keys(JSON.parse(JSON.stringify(detail)))).not.toContain('itemElement');
    });

    test('drops into an empty context', () => {
        mouseDrag(item('a'), $('#qc'), 10, 400);
        expect(ids($('#qc'))).toEqual(['a']);
    });

    test('drops at the end when released over the context padding', () => {
        mouseDrag(item('a'), $('#done'), 10, 260);
        expect(ids($('#done'))).toEqual(['d', 'a']);
    });

    test('ignores contexts outside the group', () => {
        const cancels = [];
        $('#todo').addEventListener('drag:cancel', (event) => cancels.push(event.detail.reason));

        mouseDrag(item('a'), item('x'), 10, 5);

        expect(ids($('#other'))).toEqual(['x']);
        expect(ids($('#todo'))).toEqual(['a', 'b', 'c']);
        expect(cancels).toEqual(['outside']);
    });

    test('ungrouped contexts only reorder themselves', () => {
        stack([item('x')], 500);
        mouseDrag(item('x'), item('a'), 10, 5);
        expect(ids($('#todo'))).toEqual(['a', 'b', 'c']);
        expect(ids($('#other'))).toEqual(['x']);
    });

    test('shows a drop indicator at the insertion point while dragging and removes it after', () => {
        pointer('pointerdown', item('a'), { x: 1, y: 1 });
        pointAt(item('d'));
        pointer('pointermove', document, { x: 10, y: 215 });

        const indicator = $('[data-drag-indicator]');
        expect(indicator).not.toBeNull();
        expect(indicator.parentElement).toBe($('#done'));
        expect(indicator.nextElementSibling).toBeNull();
        expect($('#done')).toHaveAttribute('data-drag-over');
        expect($('#qc')).toHaveAttribute('data-drag-active');
        expect(item('a')).toHaveAttribute('data-dragging');
        expect($('[data-drag-ghost]')).not.toBeNull();

        pointer('pointerup', document, { x: 10, y: 215 });
        expect($('[data-drag-indicator]')).toBeNull();
        expect($('[data-drag-ghost]')).toBeNull();
        expect(item('a')).not.toHaveAttribute('data-dragging');
        expect($('#done')).not.toHaveAttribute('data-drag-over');
    });

    test('does not start a drag below the movement threshold (clicks still work)', () => {
        const starts = jest.fn();
        $('#todo').addEventListener('drag:start', starts);
        pointer('pointerdown', item('a'), { x: 1, y: 1 });
        pointer('pointermove', document, { x: 3, y: 2 });
        pointer('pointerup', document, { x: 3, y: 2 });
        expect(starts).not.toHaveBeenCalled();
    });

    test('suppresses the click that follows a drag', () => {
        const clicks = jest.fn();
        item('a').addEventListener('click', clicks);
        mouseDrag(item('a'), item('c'), 10, 55);
        item('a').click();
        expect(clicks).not.toHaveBeenCalled();
    });

    test('blocks text selection while an item is pressed or dragged', () => {
        const selectStart = () => {
            const event = new Event('selectstart', { bubbles: true, cancelable: true });
            item('a').dispatchEvent(event);
            return event.defaultPrevented;
        };
        expect(selectStart()).toBe(false);
        pointer('pointerdown', item('a'), { x: 1, y: 1 });
        expect(selectStart()).toBe(true);
        pointAt(item('c'));
        pointer('pointermove', document, { x: 10, y: 55 });
        expect(selectStart()).toBe(true);
        pointer('pointerup', document, { x: 10, y: 55 });
        expect(selectStart()).toBe(false);
    });

    test('does not start dragging from form fields inside an item', async () => {
        reset();
        await mount('<div x-drag-context id="ctx"><div x-drag-item="1"><input id="field"></div></div>');
        const starts = jest.fn();
        $('#ctx').addEventListener('drag:start', starts);
        pointer('pointerdown', $('#field'), { x: 1, y: 1 });
        pointer('pointermove', document, { x: 40, y: 40 });
        expect(starts).not.toHaveBeenCalled();
    });

    test('Escape cancels a pointer drag', () => {
        const cancels = [];
        $('#todo').addEventListener('drag:cancel', (event) => cancels.push(event.detail.reason));
        pointer('pointerdown', item('a'), { x: 1, y: 1 });
        pointAt(item('d'));
        pointer('pointermove', document, { x: 10, y: 215 });
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        pointer('pointerup', document, { x: 10, y: 215 });

        expect(cancels).toEqual(['escape']);
        expect(ids($('#done'))).toEqual(['d']);
    });

    test('pointercancel aborts the drag', () => {
        const cancels = [];
        $('#todo').addEventListener('drag:cancel', (event) => cancels.push(event.detail.reason));
        pointer('pointerdown', item('a'), { x: 1, y: 1 });
        pointer('pointermove', document, { x: 10, y: 40 });
        pointer('pointercancel', document);
        expect(cancels).toEqual(['pointercancel']);
    });
});

describe('touch drag-and-drop', () => {
    afterEach(() => {
        jest.useRealTimers();
        reset();
    });

    test('starts after press-and-hold and moves between contexts', async () => {
        await mount(board);
        stack([item('a'), item('b'), item('c')], 0);
        stack([item('d')], 200);
        jest.useFakeTimers();

        pointer('pointerdown', item('a'), { x: 1, y: 1, pointerType: 'touch' });
        jest.advanceTimersByTime(250);
        expect(item('a')).toHaveAttribute('data-dragging');

        const touchMove = new Event('touchmove', { bubbles: true, cancelable: true });
        document.dispatchEvent(touchMove);
        expect(touchMove.defaultPrevented).toBe(true);

        pointAt(item('d'));
        pointer('pointermove', document, { x: 10, y: 215, pointerType: 'touch' });
        pointer('pointerup', document, { x: 10, y: 215, pointerType: 'touch' });
        expect(ids($('#done'))).toEqual(['d', 'a']);
    });

    test('a swipe before the hold delay scrolls instead of dragging', async () => {
        await mount(board);
        jest.useFakeTimers();
        const starts = jest.fn();
        $('#todo').addEventListener('drag:start', starts);

        pointer('pointerdown', item('a'), { x: 1, y: 1, pointerType: 'touch' });
        pointer('pointermove', document, { x: 1, y: 30, pointerType: 'touch' });
        jest.advanceTimersByTime(250);

        expect(starts).not.toHaveBeenCalled();
    });
});

describe('nested contexts (reorderable columns holding cards)', () => {
    afterEach(reset);

    const nested = `
        <div x-drag-context data-drag-group="columns" data-drag-context-id="board" data-drag-orientation="horizontal" id="board">
            <section x-drag-item="'col-1'" id="col-1">
                <h3>Column 1</h3>
                <ul x-drag-context data-drag-group="cards" data-drag-context-id="col-1-cards" id="col-1-cards">
                    <li x-drag-item="'c1'">c1</li>
                    <li x-drag-item="'c2'">c2</li>
                </ul>
            </section>
            <section x-drag-item="'col-2'" id="col-2">
                <h3>Column 2</h3>
                <ul x-drag-context data-drag-group="cards" data-drag-context-id="col-2-cards" id="col-2-cards"></ul>
            </section>
        </div>
    `;

    test('moving a card does not dispatch events on the outer context', async () => {
        await mount(nested);
        const outer = jest.fn();
        $('#board').addEventListener('drag:end', outer);
        $('#board').addEventListener('drag:start', outer);
        stack([item('c1'), item('c2')], 0);

        mouseDrag(item('c1'), $('#col-2-cards'), 10, 100);

        expect(ids($('#col-2-cards'))).toEqual(['c1']);
        expect(outer).not.toHaveBeenCalled();
    });

    test('moving a column reorders the outer context without touching cards', async () => {
        await mount(nested);
        const inner = jest.fn();
        $('#col-1-cards').addEventListener('drag:end', inner);
        const ends = [];
        $('#board').addEventListener('drag:end', (event) => ends.push(event.detail));
        $('#col-1').getBoundingClientRect = () => ({ top: 0, left: 0, width: 100, height: 300, right: 100, bottom: 300 });
        $('#col-2').getBoundingClientRect = () => ({ top: 0, left: 120, width: 100, height: 300, right: 220, bottom: 300 });

        pointer('pointerdown', $('#col-1 h3'), { x: 1, y: 1 });
        pointAt($('#col-2-cards'));
        pointer('pointermove', document, { x: 200, y: 50 });
        pointer('pointerup', document, { x: 200, y: 50 });

        expect(Array.from($('#board').children).map((el) => el.id)).toEqual(['col-2', 'col-1']);
        expect(ends[0]).toMatchObject({ itemId: 'col-1', orderedIds: ['col-2', 'col-1'] });
        expect(inner).not.toHaveBeenCalled();
        expect(ids($('#col-1-cards'))).toEqual(['c1', 'c2']);
    });

    test('a column cannot be dropped into its own card list', async () => {
        await mount(nested);
        pointer('pointerdown', $('#col-1 h3'), { x: 1, y: 1 });
        pointAt($('#col-1-cards'));
        pointer('pointermove', document, { x: 30, y: 50 });
        expect($('#col-1-cards')).not.toHaveAttribute('data-drag-over');
        expect($('#board')).toHaveAttribute('data-drag-over');
        pointer('pointerup', document, { x: 30, y: 50 });
    });
});

describe('auto-scroll', () => {
    afterEach(reset);

    test('scrolls a horizontally scrolling parent near its edge', () => {
        const scroller = document.createElement('div');
        scroller.style.overflowX = 'auto';
        Object.defineProperty(scroller, 'scrollWidth', { value: 1000 });
        Object.defineProperty(scroller, 'clientWidth', { value: 300 });
        scroller.getBoundingClientRect = () => ({ top: 0, left: 0, right: 300, bottom: 200, width: 300, height: 200 });
        document.body.appendChild(scroller);
        pointAt(scroller);

        expect(autoScrollAt(295, 100)).toBe(true);
        expect(scroller.scrollLeft).toBeGreaterThan(0);

        const before = scroller.scrollLeft;
        autoScrollAt(150, 100);
        expect(scroller.scrollLeft).toBe(before);

        autoScrollAt(2, 100);
        expect(scroller.scrollLeft).toBeLessThan(before);
    });
});
