/**
 * Jest setup for Livewire Drag and Drop tests.
 *
 * Tests run against a real Alpine instance in jsdom (see tests/helpers.js).
 */

import '@testing-library/jest-dom';

if (typeof document.elementFromPoint !== 'function') {
    document.elementFromPoint = () => null;
}
