import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      // Entry point for the library
      entry: resolve(__dirname, 'src/index.js'),
      
      // Library name for UMD builds
      name: 'LivewireDragAndDrop',
      
      // Output file naming pattern
      fileName: (format) => `livewire-drag-and-drop.${format}.js`,
      
      // Build formats: ES modules and UMD
      formats: ['es', 'umd']
    },
    
    // Output directory
    outDir: 'dist',
    
    // Clean output directory before build
    emptyOutDir: true,
    
    rollupOptions: {
      // External dependencies that shouldn't be bundled
      external: ['alpinejs'],
      
      output: {
        // Global variable names for external dependencies in UMD build
        globals: {
          'alpinejs': 'Alpine'
        }
      }
    }
  }
});