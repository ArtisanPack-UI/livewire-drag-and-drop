---
title: Upgrading
---

# Upgrading

## From 2.0 to 2.1

2.1 rewrites the drag engine on Pointer Events with delegated document listeners. The basic markup from 2.0 keeps working:

```blade
<ul x-drag-context @drag:end="$wire.reorder( $event.detail.orderedIds )">
    @foreach ( $tasks as $task )
        <li x-drag-item="{{ $task->id }}" wire:key="task-{{ $task->id }}">{{ $task->title }}</li>
    @endforeach
</ul>
```

```bash
npm install @artisanpack-ui/livewire-drag-and-drop@^2.1
```

Then check the changes below.

### Events no longer bubble

In 2.0, `drag:end` bubbled. In 2.1, all events are dispatched on the context element only, so nested contexts don't receive each other's events.

If you listened on an ancestor, on `document`, or with a Livewire `#[On( 'drag:end' )]` attribute, move the listener onto the `x-drag-context` element:

```blade
{{-- Before (2.0) --}}
<div @drag:end="$wire.reorder( $event.detail.orderedIds )">
    <ul x-drag-context>…</ul>
</div>

{{-- After (2.1) --}}
<ul x-drag-context @drag:end="$wire.reorder( $event.detail.orderedIds )">…</ul>
```

### `drag:end` has more detail

2.0 only sent `orderedIds`. 2.1 sends `{ moveId, itemId, group, fromContext, toContext, fromIndex, toIndex, orderedIds, fromOrderedIds, toOrderedIds }`. `orderedIds` is unchanged for reorders within one list.

If you pass the whole detail to a Livewire method, update the method's expectations accordingly.

### Native HTML5 drag-and-drop was replaced

Items no longer get `draggable="true"`, and the native `dragstart`/`dragover`/`drop` events are no longer used. Remove any `@dragover.prevent`, `@drop`, or `dataTransfer` code you added around the package — use the [[Events and Lifecycle]] events instead.

Touch devices now work: press and hold to pick an item up.

### ARIA changes

- `aria-grabbed` is no longer set (it was deprecated in ARIA 1.1). Remove any CSS that targets `[aria-grabbed="true"]` and use `[data-dragging]` instead — see [[Styling]].
- Contexts get `role="group"` (2.0 set no role) and an `aria-label` from `data-drag-label`.
- Items get `role="button"` and `aria-describedby` pointing at usage instructions.
- Attributes you set yourself are never overwritten.

Add `data-drag-label` to your contexts and items for meaningful announcements.

### Keyboard

- Up/Down move within a list, as before. Home/End (new) jump to the start or end.
- In 2.0, Left/Right did the same as Up/Down. They now move between containers for **grouped** contexts; in ungrouped lists they still move within the list.
- Escape and moving focus away now return the item to its original position.
- Focus stays on the item after a drop, including after a Livewire re-render.

### Livewire hook

2.0 registered a `message.processed` hook, which doesn't exist in Livewire 3 or 4. As a result, moved items were marked `__livewire_ignore` and stopped receiving server updates. 2.1 uses the `morphed` hook and no longer marks items, so server re-renders apply to moved items again.

If you worked around this (for example by forcing a full refresh after each move), you can remove the workaround.

### Registration

Importing the package still registers everything automatically. 2.1 also works as an Alpine plugin:

```javascript
import LivewireDragAndDrop from '@artisanpack-ui/livewire-drag-and-drop';

Alpine.plugin(LivewireDragAndDrop);
```

The JavaScript API lives on the default export (also `window.LivewireDragAndDrop`). The 2.0.1 named exports still work:

| Named export | Equivalent |
|--------------|------------|
| `registerDirectives( Alpine )` | `LivewireDragAndDrop( Alpine )` or `Alpine.plugin( LivewireDragAndDrop )` |
| `registerLivewireHooks( Livewire )` | `LivewireDragAndDrop.registerLivewireHooks( Livewire )` |

### New in 2.1

Nothing below is required, but you may want it:

- [[Connected Containers]] — move items between lists, kanban boards, nested contexts, drop rules, auto-scroll.
- [[Events and Lifecycle]] — `drag:start`, `drag:over`, cancelable `drag:drop`, `drag:cancel`, and optimistic moves with `revert()`.
- [[Configuration and Translations]] — translatable announcements, key bindings, and drag tuning.
- [[Styling]] — `data-dragging`, `data-drag-over`, `data-drag-active`, `data-drag-disallowed`, and the drop indicator.

## From 1.0 to 2.0

2.0 kept the same directives and `drag:end` event and fixed items becoming unresponsive after Livewire updates. No markup changes were required.
