---
title: Troubleshooting Guide - Livewire Drag and Drop
---

# Troubleshooting Guide

Common issues and solutions for ArtisanPack UI Livewire Drag and Drop.

## Installation Issues

### Package Not Found

**Problem**: `npm install @artisanpack-ui/livewire-drag-and-drop` fails with package not found error.

**Solutions**:
1. Check if you have access to the private registry
2. Try using the CDN version instead:
   ```html
   <script src="https://unpkg.com/@artisanpack-ui/livewire-drag-and-drop@latest/dist/livewire-drag-and-drop.js"></script>
   ```
3. Verify your npm credentials and registry settings

### Alpine.js Not Detected

**Problem**: Error message "Alpine is not defined" or directives not working.

**Solutions**:
1. Ensure Alpine.js is loaded before the drag-and-drop plugin:
   ```javascript
   import Alpine from 'alpinejs'
   import LivewireDragAndDrop from '@artisanpack-ui/livewire-drag-and-drop'
   
   document.addEventListener('alpine:init', () => {
       LivewireDragAndDrop(Alpine)
   })
   
   Alpine.start()
   ```

2. For CDN users, ensure proper script order:
   ```html
   <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
   <script defer src="https://unpkg.com/@artisanpack-ui/livewire-drag-and-drop@latest/dist/livewire-drag-and-drop.js"></script>
   ```

## Functionality Issues

### Drag Operations Not Working

**Problem**: Items are not draggable or drag events don't fire.

**Solutions**:
1. Check that `x-drag-context` wraps `x-drag-item` elements:
   ```html
   <div x-drag-context="handleReorder($event.detail)">
       <div x-drag-item="{ id: 1 }">Item 1</div>
       <div x-drag-item="{ id: 2 }">Item 2</div>
   </div>
   ```

2. Verify JavaScript is enabled and no console errors exist
3. Ensure proper CSS is applied (see getting-started.md for required styles)
4. Check that the container has sufficient height and width

### Livewire Updates Not Triggering

**Problem**: Drag operations work visually but backend isn't updated.

**Solutions**:
1. Ensure your Livewire component listens for the `drag:end` event with the correct 2.0.0 signature:
   ```php
   #[On('drag:end')]
   public function reorderItems(array $orderedIds): void
   {
       // Update your data structure with the new order
       $this->items = collect($orderedIds)
           ->map(fn($id) => $this->items->firstWhere('id', $id))
           ->filter()
           ->values()
           ->toArray();
   }
   ```

2. Check that `wire:key` attributes are present on draggable items:
   ```blade
   @foreach($items as $index => $item)
       <div 
           wire:key="item-{{ $item['id'] }}"
           x-drag-item="{{ $item['id'] }}"
       >
           {{ $item['text'] }}
       </div>
   @endforeach
   ```

3. Verify the `x-drag-context` directive includes proper event handling:
   ```blade
   <div x-drag-context @drag:end="$wire.reorderItems($event.detail.orderedIds)">
       <!-- draggable items -->
   </div>
   ```

### Items Revert After Drag

**Problem**: Items snap back to original position after dragging.

**Solutions**:
1. Ensure your Livewire component properly updates the data order:
   ```php
   public function reorderItems(): void
   {
       $newOrder = request('order', []);
       
       foreach ($newOrder as $index => $itemId) {
           $this->items = collect($this->items)
               ->map(function ($item) use ($index, $itemId) {
                   if ($item['id'] === $itemId) {
                       $item['order'] = $index;
                   }
                   return $item;
               })
               ->sortBy('order')
               ->values()
               ->toArray();
       }
   }
   ```

2. Check that the component re-renders with the new order
3. Verify no conflicting CSS transitions are interfering

## Accessibility Issues

### Screen Reader Not Announcing

**Problem**: Screen readers don't announce drag operations.

**Solutions**:
1. Ensure the `.sr-only` CSS class is properly defined:
   ```css
   .sr-only {
       position: absolute !important;
       width: 1px !important;
       height: 1px !important;
       padding: 0 !important;
       margin: -1px !important;
       overflow: hidden !important;
       clip: rect(0, 0, 0, 0) !important;
       white-space: nowrap !important;
       border: 0 !important;
   }
   ```

2. Check that ARIA live regions are not being blocked by ad blockers or privacy tools
3. Test with different screen readers (NVDA, JAWS, VoiceOver)

### Keyboard Navigation Not Working

**Problem**: Arrow keys and space bar don't work for dragging.

**Solutions**:
1. Verify items have proper `tabindex` and `role` attributes (automatically added)
2. Check for JavaScript errors in browser console
3. Ensure no other keyboard event handlers are preventing default behavior
4. Test focus management by tabbing through items

## Performance Issues

### Sluggish Drag Operations

**Problem**: Dragging feels slow or unresponsive.

**Solutions**:
1. Reduce the number of items in large lists (implement pagination or virtualization)
2. Optimize CSS transitions and animations:
   ```css
   .drag-item {
       transition: transform 0.2s ease;
   }
   ```
3. Check for expensive JavaScript operations in event handlers
4. Consider using `requestAnimationFrame` for smooth animations

### Memory Leaks

**Problem**: Browser memory usage increases over time.

**Solutions**:
1. Ensure event listeners are properly cleaned up
2. Check for circular references in JavaScript
3. Monitor DOM nodes for proper garbage collection
4. Use browser dev tools to profile memory usage

## Browser Compatibility

### Safari Issues

**Problem**: Drag operations don't work properly in Safari.

**Solutions**:
1. Ensure proper polyfills are loaded for older Safari versions
2. Check that touch events are properly handled
3. Verify CSS `-webkit-` prefixes are included where needed

### Mobile Browser Issues

**Problem**: Touch dragging doesn't work on mobile devices.

**Solutions**:
1. Add touch event handling CSS:
   ```css
   .drag-item {
       touch-action: none;
   }
   ```
2. Test on actual devices, not just browser dev tools
3. Ensure proper viewport meta tag is set

## Version 2.0.0 Specific Issues

### Items Become Unresponsive After Livewire Updates

**Problem**: After adding or deleting items via Livewire, existing items lose their drag functionality.

**Solution**: This issue was resolved in 2.0.0. If you're still experiencing this:
1. Ensure you're using version 2.0.0 or later
2. Check that the `forceRehydrateDraggableItems` function is working (it's called automatically)
3. Verify there are no JavaScript errors preventing rehydration

### Migration from 1.0.0 Issues

**Problem**: After upgrading from 1.0.0, drag operations don't work or events aren't fired.

**Solutions**:
1. Update your event handlers to use the new `orderedIds` structure:
   ```javascript
   // Old (1.0.0)
   const { oldIndex, newIndex } = event.detail;
   
   // New (2.0.0)
   const { orderedIds } = event.detail;
   ```

2. Update your Livewire component methods:
   ```php
   // Old (1.0.0) 
   public function reorderItems(int $oldIndex, int $newIndex): void
   
   // New (2.0.0)
   public function reorderItems(array $orderedIds): void
   ```

3. Clear any cached JavaScript/CSS files after upgrading

### Race Condition Issues

**Problem**: Items occasionally become unresponsive or duplicate during rapid interactions.

**Solution**: Version 2.0.0 resolves race conditions between Livewire and Alpine.js. If you still experience issues:
1. Check browser console for JavaScript errors
2. Ensure you're not manually interfering with the `morph.updating` or `message.processed` hooks
3. Verify no conflicting JavaScript is modifying DOM elements during updates

## Debug Mode

To enable verbose logging for troubleshooting:

```javascript
document.addEventListener('alpine:init', () => {
    // Enable debug mode (add this before initializing the plugin)
    window.LIVEWIRE_DRAG_DEBUG = true;
    LivewireDragAndDrop(Alpine)
})
```

This will output detailed console messages about drag operations, state changes, and event handling.

## Getting Additional Help

If you're still experiencing issues:

1. Check the [API Reference](Api-Reference) for detailed directive documentation
2. Review the [Accessibility Guide](Accessibility) for WCAG compliance information
3. Consult the [Getting Started Guide](Getting-Started) for setup instructions
4. Create an issue in the project repository with:
   - Browser and version information
   - Code examples that reproduce the issue
   - Console error messages
   - Expected vs actual behavior

## Common Error Messages

### "Cannot read property 'state' of null"

This typically indicates a drag context wasn't found. Ensure `x-drag-item` elements are wrapped in an `x-drag-context` container.

### "Livewire hook not found"

Verify Livewire is loaded and available before initializing the drag-and-drop plugin.

### "Alpine directive not registered"

Make sure the plugin is initialized within the `alpine:init` event listener and before `Alpine.start()` is called.