---
title: API Reference - Livewire Drag and Drop
---

# API Reference

Complete reference for ArtisanPack UI Livewire Drag and Drop directives, events, and methods.

## Alpine.js Directives

### `x-drag-context`

Creates a drag-and-drop context container that manages draggable items and handles drop operations.

#### Syntax

```html
<div x-drag-context="expression" [additional-attributes]>
    <!-- draggable items -->
</div>
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `expression` | `string` | Yes | JavaScript expression to handle drop events |

#### Event Handler Signature

The expression receives an event object with the following detail structure:

```javascript
{
    orderedIds: []  // Array of item IDs in their new order
}
```

#### Attributes Added

The directive automatically adds the following attributes to the container:

- `role="application"` - Identifies as an interactive application
- `aria-label="Drag and drop interface"` - Provides accessible description

#### Created Elements

- **Live Region**: A hidden `div` with `aria-live="polite"` for screen reader announcements
- **Instructions**: Global drag instructions element (if not already present)

#### Example Usage

```html
<div 
    x-data="{ 
        handleReorder(event) {
            const { oldIndex, newIndex } = event.detail;
            $wire.reorderItems(oldIndex, newIndex);
        }
    }"
    x-drag-context="handleReorder($event.detail)"
    @drag:end="handleReorder($event)"
    class="drag-container"
>
    <!-- draggable items -->
</div>
```

#### Event Listeners

The context container listens for these events:

- `dragover` - Prevents default and sets drop effect
- `drop` - Handles item dropping and calculates new position
- `keydown` - Handles Escape key for canceling operations

---

### `x-drag-item`

Designates an element as draggable within a drag context.

#### Syntax

```html
<div x-drag-item="data" [additional-attributes]>
    Item content
</div>
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `data` | `object|string` | Yes | Data associated with the draggable item |

#### Data Object Structure

The data parameter can be any serializable object. Common structure:

```typescript
interface DragItemData {
    id: number|string;      // Unique identifier
    [key: string]: any;     // Additional properties
}
```

#### Attributes Added

The directive automatically adds these attributes:

- `draggable="true"` - Enables HTML5 drag and drop
- `tabindex="0"` - Makes item keyboard focusable
- `role="button"` - Identifies as an interactive button
- `aria-grabbed="false"` - Indicates grab state for screen readers
- `aria-describedby="drag-instructions"` - Links to instruction text

#### Example Usage

```html
<div x-drag-item="{{ json_encode(['id' => 1, 'title' => 'Task 1']) }}" class="drag-item">
    <span>Task 1</span>
</div>
```

#### State Classes

The following CSS classes are automatically added/removed:

- `.is-grabbing` - Added during drag operations
- Applied inline styles:
  - `opacity: 0.5` - During drag
  - `outline: 2px solid #007cba` - On focus

#### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Space` or `Enter` | Grab/release item |
| `ArrowUp` or `ArrowLeft` | Move item up/left |
| `ArrowDown` or `ArrowRight` | Move item down/right |
| `Escape` | Cancel drag operation |
| `Tab` | Navigate between items |

#### Event Listeners

Each draggable item listens for:

- `dragstart` - Initiates drag operation
- `dragend` - Completes drag operation  
- `keydown` - Handles keyboard navigation
- `focus` - Adds focus styling
- `blur` - Removes focus styling

---

## Events

### `drag:end`

Fired when a drag operation completes successfully, either via mouse/touch or keyboard.

#### Event Detail

```typescript
interface DragEndEvent extends CustomEvent {
    detail: {
        group: string;          // Context group identifier
        oldIndex: number;       // Original item position
        newIndex: number;       // New item position
        sourceElement: Element; // The dragged element
        targetElement: Element; // Drop target element
    };
    bubbles: true;             // Event bubbles up the DOM
}
```

#### Usage Examples

**Basic Event Handling:**

```javascript
document.addEventListener('drag:end', (event) => {
    const { oldIndex, newIndex } = event.detail;
    console.log(`Item moved from ${oldIndex} to ${newIndex}`);
});
```

**Livewire Integration:**

```html
<div 
    x-data="{
        handleDragEnd(event) {
            const { orderedIds } = event.detail;
            $wire.reorderItems(orderedIds);
        }
    }"
    @drag:end="handleDragEnd($event)"
>
    <!-- Draggable items -->
</div>
```

**Multiple Context Handling:**

```javascript
document.addEventListener('drag:end', (event) => {
    const { group, oldIndex, newIndex } = event.detail;
    
    switch (group) {
        case 'todos':
            updateTodos(oldIndex, newIndex);
            break;
        case 'kanban-todo':
            moveKanbanCard('todo', oldIndex, newIndex);
            break;
    }
});
```

---

## JavaScript API

### LivewireDragAndDrop()

Main initialization function that registers Alpine.js directives.

#### Syntax

```javascript
LivewireDragAndDrop(Alpine)
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `Alpine` | `object` | Yes | Alpine.js instance |

#### Example

```javascript
import Alpine from 'alpinejs'
import LivewireDragAndDrop from '@artisanpack-ui/livewire-drag-and-drop'

document.addEventListener('alpine:init', () => {
    LivewireDragAndDrop(Alpine)
})

Alpine.start()
```

---

## Accessibility Features

### ARIA Attributes

The package automatically manages these ARIA attributes:

#### Container Attributes

- `role="application"` - Indicates interactive application
- `aria-label="Drag and drop interface"` - Describes the interface

#### Item Attributes

- `role="button"` - Identifies items as interactive buttons
- `aria-grabbed="false|true"` - Indicates grab state
- `aria-pressed="false|true"` - Indicates activation state  
- `aria-describedby="drag-instructions"` - Links to instructions

#### Live Region

- `aria-live="polite"` - Announces changes to screen readers
- `aria-atomic="true"` - Reads entire region on changes

### Screen Reader Announcements

The package provides automatic announcements for:

- **Drag Start**: "Item grabbed for dragging"
- **Drag End**: "Item released"
- **Keyboard Movement**: "Moved to position X of Y"
- **Cancel**: "Drag operation cancelled"

### Focus Management

- Items receive proper focus indicators
- Focus remains on moved items after keyboard operations
- Tab order is maintained during drag operations

---

## CSS Classes

### Required Classes

These classes must be defined in your CSS:

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

### Auto-Applied Classes

The package automatically applies these classes:

#### `.is-grabbing`

Applied to items during drag operations. Recommended styles:

```css
.is-grabbing {
    opacity: 0.7;
    transform: scale(1.02);
    z-index: 1000;
    cursor: grabbing;
}
```

### Recommended Styles

#### Focus Indicators

```css
[x-drag-item]:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}
```

#### Drag Handles

```css
.drag-handle {
    cursor: grab;
    color: #6b7280;
}

.drag-handle:hover {
    color: #374151;
}
```

#### Container Styles

```css
[x-drag-context] {
    position: relative;
}

[x-drag-context]:focus-within {
    /* Highlight active container */
}
```

---

## Advanced Usage

### Custom Group Identifiers

Use the `group` attribute to handle multiple drag contexts:

```html
<div x-drag-context="handleDrop" data-group="todos">
    <!-- todo items -->
</div>

<div x-drag-context="handleDrop" data-group="in-progress">
    <!-- in-progress items -->
</div>
```

### Cross-Container Dragging

Enable dragging between different containers:

```html
<!-- Source Container -->
<div 
    x-drag-context="handleSourceDrop"
    @dragover.prevent
    class="source-container"
>
    <div x-drag-item="{ id: 1, type: 'task' }">Task 1</div>
</div>

<!-- Target Container -->
<div 
    x-drag-context="handleTargetDrop"
    @dragover.prevent
    @drop="handleCrossContainerDrop($event)"
    class="target-container"
>
    <!-- Drop zone -->
</div>
```

### Custom Data Transfer

Access the HTML5 DataTransfer API for advanced use cases:

```html
<div 
    x-drag-item="{ id: 1, title: 'Task 1' }"
    @dragstart="$event.dataTransfer.setData('text/html', $el.outerHTML)"
    @dragstart="$event.dataTransfer.setDragImage(customImage, 0, 0)"
>
    Task content
</div>
```

### Performance Optimization

For large lists, consider using intersection observers:

```html
<div x-data="{ visible: false }" x-intersect="visible = true">
    <template x-if="visible">
        <div x-drag-context="handleDrop">
            <!-- Heavy content -->
        </div>
    </template>
</div>
```

---

## Browser Compatibility

### Required Features

- **Drag and Drop API**: IE 11+, all modern browsers
- **Custom Events**: IE 9+, all modern browsers  
- **ARIA Attributes**: All browsers with screen reader support
- **Alpine.js**: As per Alpine.js requirements

### Feature Detection

```javascript
// Check for drag and drop support
if ('draggable' in document.createElement('div')) {
    // Drag and drop is supported
    LivewireDragAndDrop(Alpine)
} else {
    // Provide fallback UI
    console.warn('Drag and drop not supported')
}
```

### Progressive Enhancement

The package gracefully degrades when JavaScript is disabled:

- Items remain focusable and interactive
- Form elements continue to work normally
- Content remains accessible to screen readers

---

## Error Handling

### Common Errors

**Directive Registration Errors:**

```javascript
// Ensure Alpine is available before registration
if (typeof Alpine !== 'undefined') {
    LivewireDragAndDrop(Alpine)
} else {
    console.error('Alpine.js not found')
}
```

**Context Validation:**

```javascript
// x-drag-item validates its context
if (!dragContext || !dragContext._dragContext) {
    console.warn('x-drag-item must be used within x-drag-context')
    return
}
```

### Debug Mode

Enable detailed logging:

```javascript
// Add to your Alpine.js setup
Alpine.store('debug', true)

document.addEventListener('drag:end', (event) => {
    if (Alpine.store('debug')) {
        console.log('Drag operation details:', event.detail)
    }
})
```

---

## Migration Guide

### From Version 0.x to 1.x

**Breaking Changes:**

1. **Event Structure**: `drag:end` now includes `sourceElement` and `targetElement`
2. **CSS Classes**: `.dragging` renamed to `.is-grabbing`
3. **ARIA Attributes**: Enhanced accessibility attributes

**Update Steps:**

```html
<!-- Old (0.x) -->
<div @drag:end="handleDrop($event.detail.oldIndex, $event.detail.newIndex)">

<!-- New (2.x) -->
<div @drag:end="handleDrop($event.detail.orderedIds)">
```

```css
/* Old (0.x) */
.dragging { opacity: 0.5; }

/* New (1.x) */
.is-grabbing { opacity: 0.7; transform: scale(1.02); }
```

---

**Related Documentation:**

- [Getting Started Guide](getting-started.md) - Installation and basic usage
- [Accessibility Guide](accessibility.md) - Detailed accessibility information
- [Examples](examples.md) - Advanced implementation patterns