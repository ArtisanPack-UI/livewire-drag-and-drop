// Simple test to verify the module can be imported without ReferenceError
import LivewireDragAndDrop from './src/index.js';

console.log('✓ Module imported successfully');

// Mock Alpine.js object for testing
const mockAlpine = {
    directive: (name, handler) => {
        console.log(`✓ Directive '${name}' registered successfully`);
        // Don't execute handlers in Node.js since they need DOM elements
    },
    nextTick: (callback) => {
        setTimeout(callback, 0);
    }
};

console.log('Testing LivewireDragAndDrop initialization...');

try {
    LivewireDragAndDrop(mockAlpine);
    console.log('✓ LivewireDragAndDrop initialized successfully');
    console.log('✓ All tests passed - ReferenceError has been fixed!');
    process.exit(0);
} catch (error) {
    console.error('✗ Error during initialization:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}