---
title: Connected Containers
---

# Connected Containers

*Since 2.1.0.*

A context on its own only reorders its own items. Give several contexts the same **group** and items can move between them — by mouse, touch, pen, or keyboard (Left/Right while holding an item).

## Connected lists

Each context needs a group and an id. The id is what events report as `fromContext` and `toContext`:

```blade
<div class="grid grid-cols-2 gap-4">
    <ul x-drag-context data-drag-group="tasks" data-drag-context-id="todo" data-drag-label="{{ __( 'To do' ) }}"
        @drag:end="$event.detail.toElement === $el && $wire.move( $event.detail )">
        @foreach ( $todo as $task )
            <li x-drag-item="{{ $task->id }}" wire:key="task-{{ $task->id }}" data-drag-label="{{ $task->title }}">{{ $task->title }}</li>
        @endforeach
    </ul>

    <ul x-drag-context data-drag-group="tasks" data-drag-context-id="done" data-drag-label="{{ __( 'Done' ) }}"
        @drag:end="$event.detail.toElement === $el && $wire.move( $event.detail )">
        @foreach ( $done as $task )
            <li x-drag-item="{{ $task->id }}" wire:key="task-{{ $task->id }}" data-drag-label="{{ $task->title }}">{{ $task->title }}</li>
        @endforeach
    </ul>
</div>
```

For a move between contexts, `drag:end` is dispatched on **both** contexts. The `toElement === $el` check makes only the receiving context call the server. For a reorder within one context, `toElement` is that context, so the same check works for both cases.

```php
public function move( array $detail ): void
{
    $task = Task::findOrFail( $detail['itemId'] );
    $task->update( [ 'status' => $detail['toContext'] ] );

    foreach ( $detail['toOrderedIds'] as $position => $id ) {
        Task::whereKey( $id )->update( [ 'position' => $position ] );
    }
}
```

The detail is plain JSON, so it can be passed straight to `$wire`. It includes `itemId`, `fromContext`, `toContext`, `fromIndex`, `toIndex`, `fromOrderedIds`, and `toOrderedIds` — see [[Events and Lifecycle]].

### Setting the group and id

All three forms are equivalent; use whichever fits:

```blade
<ul x-drag-context data-drag-group="tasks" data-drag-context-id="todo">…</ul>

<ul x-drag-context="{ group: 'tasks', id: 'todo' }">…</ul>

<ul x-drag-context.group.tasks id="todo">…</ul>
```

- The context id falls back to the element's `id` attribute.
- Attribute names are lowercase in HTML, so modifier group names (`.group.tasks`) are lowercase too. Use `data-drag-group` or the object form for mixed-case names.
- When several forms are set, the `x-drag-context` object wins over `data-drag-*` attributes, which win over the modifier.

## Empty containers

Connected contexts accept drops when they are empty. Give them a size so there is something to drop onto:

```css
[x-drag-context] { min-height: 3rem; }
```

When the items don't sit directly inside the context — for example a column with a heading and a list — new items are appended to the parent of the existing items. An empty context has no existing items, so mark where they should go with `data-drag-items`:

```blade
<section x-drag-context data-drag-group="tasks" data-drag-context-id="done">
    <h3>{{ __( 'Done' ) }}</h3>
    <ul data-drag-items>
        @foreach ( $done as $task )
            <li x-drag-item="{{ $task->id }}" wire:key="task-{{ $task->id }}">{{ $task->title }}</li>
        @endforeach
    </ul>
</section>
```

Putting `x-drag-context` on the `<ul>` itself works too and needs no marker.

## Kanban board

Columns can be items of an outer context (so they can be reordered) and contexts of their own (so cards can move between them). Events never cross: moving a card dispatches nothing on the board, and moving a column dispatches nothing on the card lists.

```blade
<div
    x-drag-context
    data-drag-group="columns"
    data-drag-context-id="board"
    data-drag-label="{{ __( 'Board' ) }}"
    data-drag-orientation="horizontal"
    class="flex gap-4 overflow-x-auto"
    @drag:end="$wire.reorderColumns( $event.detail.orderedIds )"
>
    @foreach ( $columns as $column )
        <section
            x-drag-item="'{{ $column->id }}'"
            wire:key="column-{{ $column->id }}"
            data-drag-label="{{ $column->name }}"
            class="w-72 shrink-0"
        >
            <h3>{{ $column->name }}</h3>

            <ul
                x-drag-context="{ disabled: {{ $column->isFull() ? 'true' : 'false' }} }"
                data-drag-group="cards"
                data-drag-context-id="{{ $column->id }}"
                data-drag-label="{{ $column->name }}"
                data-drag-messages='@json( [ 'rejected' => __( ':column is full.', [ 'column' => $column->name ] ) ] )'
                wire:key="column-{{ $column->id }}-cards"
                class="min-h-24"
                @drag:end="$event.detail.toElement === $el && $wire.moveCard( $event.detail ).then( ( ok ) => ok || $dragRevert( $event.detail.itemId ) )"
            >
                @foreach ( $column->cards as $card )
                    <li x-drag-item="{{ $card->id }}" wire:key="card-{{ $card->id }}" data-drag-label="{{ $card->title }}">
                        {{ $card->title }}
                    </li>
                @endforeach
            </ul>
        </section>
    @endforeach
</div>
```

Notes:

- Put `wire:key` on items **and** contexts so Livewire morphs move the right elements.
- An item belongs to the nearest context above it. Cards belong to their column's list, and columns belong to the board.
- A column cannot be dropped into its own card list; dragging a column over cards targets the board.
- `data-drag-orientation="horizontal"` makes the drop indicator vertical and swaps the keyboard axes for the board. It is detected automatically for a `display: flex` row, so it is optional here.
- `$dragRevert( itemId )` puts the card back if the server refuses the move — see [[Events and Lifecycle#optimistic-moves-and-revert]].

## Refusing drops

A context refuses drops while it is disabled or while its `accepts` callback returns `false`. During a drag it gets `data-drag-disallowed` instead of `data-drag-active`, no drop indicator is shown over it, the cursor becomes `not-allowed`, and a drop there is cancelled and announced with the `rejected` message.

```blade
{{-- Static --}}
<ul x-drag-context data-drag-disabled>…</ul>

{{-- Reactive (Alpine expression, re-evaluated on every check) --}}
<ul x-drag-context="{ disabled: cards.length >= limit }">…</ul>

{{-- Per item --}}
<ul x-drag-context="{ accepts: ( detail ) => detail.fromContext !== 'archived' }">…</ul>
```

- `data-drag-disabled="false"` means enabled, so you can bind it: `data-drag-disabled="{{ $full ? 'true' : 'false' }}"`.
- Disabled contexts still let their own items be dragged out.
- `accepts` is called with `{ moveId, itemId, group, fromContext, fromIndex, toContext }` (plus the non-enumerable `itemElement`, `fromElement`, and `toElement`). If it throws, the drop is refused and the error is logged.
- The keyboard's Left/Right skip containers that refuse the item.

To decide at drop time instead — for example after checking something that isn't known up front — cancel the `drag:drop` event. See [[Events and Lifecycle#cancelling-a-drop]].

## Auto-scroll

While a pointer drag is near the edge of a scrollable ancestor (or the window), that ancestor scrolls. Tune the edge size and speed globally:

```javascript
LivewireDragAndDrop.configure({ autoScroll: { edge: 64, speed: 24 } });
```

`edge` is the distance in pixels from the edge where scrolling starts (default `48`); `speed` is the maximum pixels scrolled per frame (default `20`).
