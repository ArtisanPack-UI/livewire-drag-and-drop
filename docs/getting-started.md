---
title: Getting Started with Livewire Drag and Drop
---

# Getting Started with ArtisanPack UI Livewire Drag and Drop

Welcome to ArtisanPack UI's Livewire Drag and Drop package! This comprehensive guide will help you get up and running with accessible drag-and-drop functionality in your Laravel Livewire applications.

## Overview

ArtisanPack UI Livewire Drag and Drop is an accessibility-first package that brings intuitive drag-and-drop functionality to your Livewire components. Built with WCAG 2.1 AA compliance in mind, it provides full keyboard navigation, screen reader support, and seamless integration with Laravel's TALL stack.

### Key Benefits

- **🎯 Accessibility-First**: Complete WCAG 2.1 AA compliance
- **⌨️ Keyboard Navigation**: Full keyboard control with intuitive key bindings
- **🎨 Alpine.js Integration**: Native directives for the TALL stack
- **🔄 Livewire Compatible**: Seamless backend integration with custom events
- **📱 Touch Friendly**: Works across all devices and input methods
- **🎪 Flexible**: Perfect for lists, kanban boards, and complex interfaces

## Prerequisites

Before you begin, ensure your development environment meets these requirements:

### Required Dependencies

- **PHP**: 8.1 or higher
- **Laravel**: 10.x or 11.x
- **Livewire**: 3.x
- **Alpine.js**: 3.x

### Recommended Setup

- **Node.js**: 18+ (for build tools)
- **NPM or Yarn**: For package management
- **Vite**: For asset compilation (included with Laravel)

## Installation

### Step 1: Install the Package

Choose your preferred installation method:

#### Via NPM (Recommended)

```bash
npm install @artisanpack-ui/livewire-drag-and-drop
```

#### Via CDN

```html
<script src="https://unpkg.com/@artisanpack-ui/livewire-drag-and-drop@latest/dist/livewire-drag-and-drop.js"></script>
```

### Step 2: Configure Alpine.js

#### Using Vite (ES Modules)

Create or update your `resources/js/app.js` file:

```javascript
import Alpine from 'alpinejs'
import LivewireDragAndDrop from '@artisanpack-ui/livewire-drag-and-drop'

// Initialize the drag-and-drop plugin
document.addEventListener('alpine:init', () => {
    LivewireDragAndDrop(Alpine)
})

// Start Alpine.js
Alpine.start()
```

Then in your Blade layout:

```blade
@vite(['resources/css/app.css', 'resources/js/app.js'])
```

#### Using CDN

Add this to your Blade layout's `<head>` section:

```blade
<script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
<script defer src="https://unpkg.com/@artisanpack-ui/livewire-drag-and-drop@latest/dist/livewire-drag-and-drop.js"></script>
<script>
document.addEventListener('alpine:init', () => {
    LivewireDragAndDrop(Alpine)
})
</script>
```

### Step 3: Add Required CSS

Add these essential styles to your CSS file (typically `resources/css/app.css`):

```css
/**
 * Screen Reader Only - Hides content visually but keeps it accessible to screen readers
 */
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

/**
 * Dragging State - Applied to items being dragged
 */
.is-grabbing {
    opacity: 0.7;
    transform: scale(1.02);
    z-index: 1000;
    cursor: grabbing;
}

/**
 * Focus Indicators - Ensure proper focus visibility
 */
[x-drag-item]:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}

/**
 * Drag Context - Basic container styling
 */
[x-drag-context] {
    position: relative;
}
```

## Your First Drag-and-Drop Component

Let's create a simple todo list with drag-and-drop reordering functionality.

### Step 1: Create the Livewire Component

Generate a new Livewire component:

```bash
php artisan make:livewire TodoList
```

Update the generated `app/Livewire/TodoList.php`:

```php
<?php

declare( strict_types=1 );

namespace App\Livewire;

use Livewire\Attributes\On;
use Livewire\Component;

/**
 * Simple Todo List with Drag and Drop
 *
 * Demonstrates basic drag-and-drop functionality with proper
 * accessibility support and Livewire integration.
 *
 * @since 1.0.0
 */
class TodoList extends Component
{
    /**
     * Array of todo items.
     *
     * @since 1.0.0
     * @var array<int, array<string, mixed>>
     */
    public array $todos = [
        [ 'id' => 1, 'text' => 'Learn Livewire basics', 'completed' => true ],
        [ 'id' => 2, 'text' => 'Install ArtisanPack UI', 'completed' => true ],
        [ 'id' => 3, 'text' => 'Add drag-and-drop functionality', 'completed' => false ],
        [ 'id' => 4, 'text' => 'Test accessibility features', 'completed' => false ],
        [ 'id' => 5, 'text' => 'Deploy to production', 'completed' => false ],
    ];

    /**
     * Handle todo reordering from drag-and-drop operations.
     *
     * @since 1.0.0
     *
     * @param int $oldIndex Original position of the item.
     * @param int $newIndex New position of the item.
     * @return void
     */
    #[On('reorder-todos')]
    public function reorderTodos( int $oldIndex, int $newIndex ): void
    {
        // Validate indices
        if ( $oldIndex < 0 || $oldIndex >= count( $this->todos ) || 
             $newIndex < 0 || $newIndex >= count( $this->todos ) ) {
            return;
        }

        // Perform the reorder
        $item = array_splice( $this->todos, $oldIndex, 1 )[0];
        array_splice( $this->todos, $newIndex, 0, [ $item ] );

        // Re-index array
        $this->todos = array_values( $this->todos );

        // Optional: Persist to database
        // $this->saveTodoOrder();
    }

    /**
     * Toggle todo completion status.
     *
     * @since 1.0.0
     *
     * @param int $index Index of the todo to toggle.
     * @return void
     */
    public function toggleTodo( int $index ): void
    {
        if ( isset( $this->todos[ $index ] ) ) {
            $this->todos[ $index ]['completed'] = ! $this->todos[ $index ]['completed'];
        }
    }

    /**
     * Render the component view.
     *
     * @since 1.0.0
     *
     * @return \Illuminate\Contracts\View\View
     */
    public function render()
    {
        return view( 'livewire.todo-list' );
    }
}
```

### Step 2: Create the Blade View

Create `resources/views/livewire/todo-list.blade.php`:

```blade
{{--
/**
 * Simple Todo List Component View
 *
 * A basic todo list demonstrating drag-and-drop functionality
 * with full accessibility support.
 *
 * @since 1.0.0
 */
--}}

<div class="todo-container">
    <div class="todo-header">
        <h2 class="todo-title">{{ __( 'My Todo List' ) }}</h2>
        <p class="todo-instructions">
            {{ __( 'Drag items to reorder, or use keyboard navigation.' ) }}
        </p>
    </div>

    {{-- Drag and Drop Container --}}
    <div 
        x-data="{
            handleReorder(event) {
                const { oldIndex, newIndex } = event.detail;
                if (oldIndex !== newIndex) {
                    $wire.reorderTodos(oldIndex, newIndex);
                }
            }
        }"
        x-drag-context="handleReorder($event.detail)"
        @drag:end="handleReorder($event)"
        class="todo-list"
        role="list"
        aria-label="{{ __( 'Draggable todo list' ) }}"
    >
        @foreach ( $todos as $index => $todo )
            <div
                x-drag-item="{{ json_encode( [ 'id' => $todo['id'], 'index' => $index ] ) }}"
                class="todo-item {{ $todo['completed'] ? 'todo-item--completed' : '' }}"
                role="listitem"
            >
                <div class="todo-content">
                    {{-- Drag Handle --}}
                    <div class="todo-drag-handle" aria-hidden="true">
                        <svg viewBox="0 0 24 24" class="drag-icon">
                            <path d="M10 4h4v2h-4V4zm0 7h4v2h-4v-2zm0 7h4v2h-4v-2z" fill="currentColor"/>
                        </svg>
                    </div>

                    {{-- Checkbox --}}
                    <input
                        type="checkbox"
                        id="todo-{{ $todo['id'] }}"
                        wire:click="toggleTodo({{ $index }})"
                        {{ $todo['completed'] ? 'checked' : '' }}
                        class="todo-checkbox"
                    >

                    {{-- Todo Text --}}
                    <label for="todo-{{ $todo['id'] }}" class="todo-label">
                        {{ $todo['text'] }}
                    </label>
                </div>

                {{-- Screen Reader Instructions --}}
                <div class="sr-only">
                    {{ __( 'Use Space or Enter to grab this item, arrow keys to move, Space or Enter to drop, Escape to cancel.' ) }}
                </div>
            </div>
        @endforeach
    </div>
</div>

{{-- Styles --}}
<style>
.todo-container {
    max-width: 500px;
    margin: 2rem auto;
    padding: 1.5rem;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.todo-header {
    margin-bottom: 1.5rem;
    text-align: center;
}

.todo-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.5rem;
}

.todo-instructions {
    color: #6b7280;
    font-size: 0.875rem;
}

.todo-list {
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    overflow: hidden;
}

.todo-item {
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    transition: all 0.2s ease;
    cursor: grab;
}

.todo-item:last-child {
    border-bottom: none;
}

.todo-item:hover {
    background: #f9fafb;
}

.todo-item--completed {
    background: #f3f4f6;
    opacity: 0.8;
}

.todo-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
}

.todo-drag-handle {
    color: #9ca3af;
    cursor: grab;
}

.drag-icon {
    width: 1rem;
    height: 1rem;
}

.todo-checkbox {
    width: 1rem;
    height: 1rem;
}

.todo-label {
    flex: 1;
    cursor: pointer;
    font-size: 0.875rem;
    color: #374151;
}

.todo-item--completed .todo-label {
    text-decoration: line-through;
    color: #6b7280;
}
</style>
```

### Step 3: Use the Component

Add the component to any Blade view:

```blade
@extends('layouts.app')

@section('content')
<div class="container">
    <livewire:todo-list />
</div>
@endsection
```

## Testing Your Implementation

### Visual Testing

1. Load the page in your browser
2. Try dragging items with your mouse
3. Check that items reorder correctly
4. Verify visual feedback during drag operations

### Keyboard Testing

1. Tab to a todo item
2. Press Space or Enter to "grab" the item
3. Use arrow keys to move the item up/down
4. Press Space or Enter to "drop" the item
5. Press Escape to cancel if needed

### Screen Reader Testing

If you have access to screen readers:

1. Enable screen reader (NVDA, JAWS, VoiceOver, etc.)
2. Navigate to the todo list
3. Listen for drag operation announcements
4. Test keyboard navigation with audio feedback

## Next Steps

Congratulations! You now have a working drag-and-drop component. Here's what you can explore next:

### Advanced Features

- **Cross-Container Dragging**: Move items between different lists
- **Custom Animations**: Add smooth transitions and effects
- **Database Persistence**: Save order changes to your database
- **Real-time Updates**: Sync changes across multiple users

### Learn More

- [API Reference](api-reference.md) - Complete directive and event documentation
- [Accessibility Guide](accessibility.md) - In-depth accessibility best practices  
- [Advanced Examples](examples.md) - Complex implementation patterns
- [Contributing Guide](contributing.md) - Help improve the package

## Troubleshooting

### Common Issues

**Items not draggable:**
- Check that Alpine.js loaded before the drag-and-drop plugin
- Ensure `x-drag-context` wraps `x-drag-item` elements
- Verify CSS doesn't block pointer events

**Keyboard navigation not working:**
- Confirm screen reader instructions are present
- Check that items have proper `tabindex` attributes
- Ensure focus styles are visible

**Accessibility warnings:**
- Add `.sr-only` CSS class
- Include proper ARIA labels and roles
- Test with actual assistive technologies

### Getting Help

If you encounter issues:

1. Check the [troubleshooting guide](troubleshooting.md)
2. Review [common patterns](examples.md)
3. Search [existing issues](https://gitlab.com/jacob-martella-web-design/artisanpack-ui/livewire-drag-and-drop/issues)
4. Create a new issue with reproduction steps

---

**Next:** [API Reference](api-reference.md) - Learn about all available directives and events