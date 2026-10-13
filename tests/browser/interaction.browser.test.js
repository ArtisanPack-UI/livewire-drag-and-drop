/**
 * @jest-environment node
 *
 * Keyboard-only (and one mouse) tests in a real browser (headless Chrome via Puppeteer).
 * Run with `npm run test:browser`.
 */

import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const root = fileURLToPath(new URL('../..', import.meta.url));
const ORIGIN = 'http://ldd.test';
const types = { '.html': 'text/html', '.js': 'text/javascript' };

let browser;
let page;

async function texts(selector) {
    return page.$$eval(`${selector} > [x-drag-item]`, (items) => items.map((item) => item.textContent.trim()));
}

async function live() {
    return page.$eval('[data-drag-live-region]', (region) => region.textContent.replace(/ $/, ''));
}

async function focusedLabel() {
    return page.evaluate(() => document.activeElement.getAttribute('data-drag-label'));
}

beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true });
});

afterAll(async () => {
    await browser?.close();
});

beforeEach(async () => {
    page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
        const pathname = normalize(new URL(request.url()).pathname);
        const file = pathname === '/' ? 'tests/browser/fixture.html' : pathname;
        try {
            const body = await readFile(join(root, file));
            request.respond({ status: 200, contentType: types[extname(file)] || 'text/plain', body });
        } catch {
            request.respond({ status: 404, body: '' });
        }
    });
    await page.goto(`${ORIGIN}/`);
    await page.waitForFunction(() => window.__ready === true);
});

afterEach(async () => {
    await page?.close();
});

test('Tab reaches items, which are described by the instructions', async () => {
    await page.keyboard.press('Tab');
    expect(await focusedLabel()).toBe('Order 1042');
    const description = await page.evaluate(() => {
        const ids = document.activeElement.getAttribute('aria-describedby').split(' ');
        return ids.map((id) => document.getElementById(id).textContent).join(' ');
    });
    expect(description).toContain('Press Space or Enter to pick up');
    expect(await page.evaluate(() => document.activeElement.hasAttribute('aria-grabbed'))).toBe(false);
});

test('moves an item two containers over with Right, Right, Space', async () => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');
    expect(await live()).toBe('Order 1042 grabbed. Position 1 of 2 in Packing.');

    await page.keyboard.press('ArrowRight');
    expect(await live()).toBe('Order 1042 moved to QC, position 1 of 1.');
    await page.keyboard.press('ArrowRight');
    expect(await live()).toBe('Order 1042 moved to Shipped, position 1 of 2.');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');

    expect(await texts('#packing')).toEqual(['Order 1043']);
    expect(await texts('#shipped')).toEqual(['Order 1001', 'Order 1042']);
    expect(await live()).toBe('Order 1042 dropped in Shipped, position 2 of 2.');
    expect(await focusedLabel()).toBe('Order 1042');

    const log = JSON.parse(await page.$eval('#log', (el) => el.textContent));
    expect(log).toHaveLength(2);
    expect(log[0]).toMatchObject({ itemId: '1042', fromContext: 'packing', toContext: 'shipped', fromIndex: 0, toIndex: 1 });
});

test('Escape restores the original container and keeps focus', async () => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    expect(await focusedLabel()).toBe('Order 1043');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');

    expect(await texts('#packing')).toEqual(['Order 1042', 'Order 1043']);
    expect(await texts('#shipped')).toEqual(['Order 1001']);
    expect(await live()).toBe('Move cancelled. Order 1043 returned to Packing, position 2 of 2.');
    expect(await focusedLabel()).toBe('Order 1043');
});

test('Home and End move within the container; Tab continues after a drop', async () => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');
    await page.keyboard.press('End');
    expect(await texts('#packing')).toEqual(['Order 1043', 'Order 1042']);
    await page.keyboard.press('Home');
    expect(await texts('#packing')).toEqual(['Order 1042', 'Order 1043']);
    await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
    expect(await focusedLabel()).toBe('Order 1043');
});

test('a real mouse drag moves an item into an empty container', async () => {
    const from = await page.$eval('[data-drag-label="Order 1043"]', (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + 10, y: r.top + r.height / 2 };
    });
    const to = await page.$eval('#qc', (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 20, from.y, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 10 });
    expect(await page.$('#qc [data-drag-indicator]')).not.toBeNull();
    expect(await page.evaluate(() => window.getSelection().toString())).toBe('');
    expect(await page.$eval('#qc', (el) => el.hasAttribute('data-drag-over'))).toBe(true);
    await page.mouse.up();

    expect(await texts('#qc')).toEqual(['Order 1043']);
    expect(await texts('#packing')).toEqual(['Order 1042']);
    expect(await page.$('[data-drag-ghost], [data-drag-indicator]')).toBeNull();
    expect(await page.evaluate(() => window.getSelection().toString())).toBe('');
});
