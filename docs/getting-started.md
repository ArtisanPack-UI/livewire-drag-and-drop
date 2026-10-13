---
title: Getting Started
---

# Getting Started

This guide installs the package, registers it with Alpine and Livewire, and builds a sortable task list that saves its order to the database.

## Requirements

- Alpine.js 3 (Livewire 3 and 4 bundle it — you don't need to install Alpine separately).
- Livewire 3 or 4 for the Livewire integration. The directives also work with a standalone Alpine and no Livewire.
- A browser with Pointer Events: current Chrome, Edge, Firefox, Safari (macOS and iOS), or Chrome for Android.

## Installation

```bash
npm install @artisanpack-ui/livewire-drag-and-drop
```

## Registering the package

### With Livewire (recommended)

Import the package in your app bundle. It registers its directives with Livewire's bundled Alpine on `alpine:init` and hooks into Livewire on `livewire:init`:

```javascript
// resources/js/app.js
import '@artisanpack-ui/livewire-drag-and-drop';
```

That's all. Don't also import `alpinejs` — Livewire already ships Alpine, and loading a second copy breaks both.

If you bundle Livewire's ESM build yourself, you can register the plugin explicitly. Registration is idempotent, so this is safe alongside the automatic `alpine:init` registration:

```javascript
// resources/js/app.js
import { Livewire, Alpine } from '../../vendor/livewire/livewire/dist/livewire.esm';
import LivewireDragAndDrop from '@artisanpack-ui/livewire-drag-and-drop';

Alpine.plugin(LivewireDragAndDrop);
Livewire.start();
```

### With a standalone Alpine

```javascript
import Alpine from 'alpinejs';
import LivewireDragAndDrop from '@artisanpack-ui/livewire-drag-and-drop';

Alpine.plugin(LivewireDragAndDrop);
Alpine.start();
```

### Via CDN

Load the UMD build **before** Alpine starts:

```html
<script src="https://unpkg.com/@artisanpack-ui/livewire-drag-and-drop@2/dist/livewire-drag-and-drop.umd.js"></script>
<script defer src="https://unpkg.com/alpinejs@3/dist/cdn.min.js"></script>
```

The package is then available as `window.LivewireDragAndDrop`.

## Your first sortable list

### 1. The data

Add a `position` column to the table you want to sort:

```php
Schema::create( 'tasks', function ( Blueprint $table ) {
    $table->id();
    $table->string( 'title' );
    $table->unsignedInteger( 'position' )->default( 0 );
    $table->timestamps();
} );
```

### 2. The Livewire component

```php
<?php

namespace App\Livewire;

use App\Models\Task;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Collection;
use Livewire\Component;

class TaskList extends Component
{
    public function reorder( array $orderedIds ): void
    {
        foreach ( $orderedIds as $position => $id ) {
            Task::whereKey( $id )->update( [ 'position' => $position ] );
        }
    }

    public function render(): View
    {
        return view( 'livewire.task-list', [
            'tasks' => Task::orderBy( 'position' )->get(),
        ] );
    }
}
```

Validate and authorize the ids in a real application — they come from the browser.

### 3. The view

```blade
{{-- resources/views/livewire/task-list.blade.php --}}
<div>
    <ul
        x-drag-context
        data-drag-label="{{ __( 'Tasks' ) }}"
        @drag:end="$wire.reorder( $event.detail.orderedIds )"
        class="space-y-2"
    >
        @foreach ( $tasks as $task )
            <li
                x-drag-item="{{ $task->id }}"
                wire:key="task-{{ $task->id }}"
                data-drag-label="{{ $task->title }}"
                class="rounded border bg-white p-3"
            >
                {{ $task->title }}
            </li>
        @endforeach
    </ul>
</div>
```

What each piece does:

- `x-drag-context` marks the list whose items can be reordered.
- `x-drag-item="{{ $task->id }}"` marks an item; the expression is the item's id. Use quotes for string ids: `x-drag-item="'{{ $task->uuid }}'"`.
- `wire:key` lets Livewire match items when it re-renders the list. Always set it.
- `data-drag-label` gives the list and each item an accessible name, used in screen reader announcements ("Write docs dropped in Tasks, position 2 of 5.").
- `@drag:end` runs after a drop. `$event.detail.orderedIds` is the list's item ids in their new order.

Events don't bubble, so the listener must be on the `x-drag-context` element itself.

### 4. Basic styles

The package adds no visual styles of its own except the floating copy of the dragged item and the drop indicator. A minimal set:

```css
[x-drag-item] { cursor: grab; }
[x-drag-item]:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }
[x-drag-item][data-dragging] { opacity: 0.4; }
[data-drag-over] { background: #eff6ff; }
```

See [[Styling]] for every state attribute.

## Try it

- **Mouse:** press an item and move it more than a few pixels; a copy follows the pointer and a line shows where it will land.
- **Touch:** press and hold an item briefly, then drag.
- **Keyboard:** Tab to an item, press Space to pick it up, use the Up/Down arrows to move it, press Space to drop it or Escape to cancel.
- **Screen reader:** each of those steps is announced, including the item's new position.

## Next steps

- Move items between lists or build a kanban board: [[Connected Containers]].
- React to every step, refuse drops, and roll back rejected moves: [[Events and Lifecycle]].
- Translate the announcements and change key bindings: [[Configuration and Translations]].
- Everything in one place: [[API Reference]].
