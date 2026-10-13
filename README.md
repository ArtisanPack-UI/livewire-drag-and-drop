# ArtisanPack UI: Livewire Drag and Drop

An accessibility-first drag-and-drop utility for Livewire and Alpine.js. Reorder lists, move items between connected containers (kanban boards), and let mouse, touch, pen, and keyboard users all do the same things — with translatable screen reader announcements and a lifecycle you can veto and roll back.

## Features

- **Connected containers** — contexts that share a group accept each other's items, including when empty.
- **Mouse, touch, and pen** — pointer-event based, so it works on tablets (press and hold to pick up on touch).
- **Keyboard** — grab with Space/Enter, move within a list with Up/Down/Home/End, move between containers with Left/Right, drop with Space/Enter, cancel with Escape.
- **Screen readers** — instructions via `aria-describedby`, every step announced in a live region, every message a translatable template.
- **Lifecycle events** — `drag:start`, `drag:over`, a cancelable `drag:drop`, `drag:end`, `drag:cancel`, and `drag:revert`.
- **Optimistic moves** — every move has a `moveId`; revert it after a server rejection.
- **Livewire 3 and 4** — survives morphing; focus stays on the moved item.
- **Nested contexts** — reorder columns while cards move between them, without events crossing.
- **Auto-scroll** — scrolling parents (and the page) scroll while you drag near their edges.

## Installation

```bash
npm install @artisanpack-ui/livewire-drag-and-drop
```

### With Livewire (recommended)

Import the package in your app bundle. It registers itself with Livewire's bundled Alpine on `alpine:init` and hooks into Livewire on `livewire:init`:

```javascript
// resources/js/app.js
import '@artisanpack-ui/livewire-drag-and-drop';
```

### With a standalone Alpine

```javascript
import Alpine from 'alpinejs';
import LivewireDragAndDrop from '@artisanpack-ui/livewire-drag-and-drop';

Alpine.plugin(LivewireDragAndDrop);
Alpine.start();
```

### Via CDN

Load the UMD build before Alpine starts:

```html
<script src="https://unpkg.com/@artisanpack-ui/livewire-drag-and-drop@2/dist/livewire-drag-and-drop.umd.js"></script>
<script defer src="https://unpkg.com/alpinejs@3/dist/cdn.min.js"></script>
```

The package is then available as `window.LivewireDragAndDrop`.

## Quick start

```blade
<ul
    x-drag-context
    data-drag-label="{{ __( 'Tasks' ) }}"
    @drag:end="$wire.reorder( $event.detail.orderedIds )"
>
    @foreach ( $tasks as $task )
        <li x-drag-item="{{ $task->id }}" wire:key="task-{{ $task->id }}" data-drag-label="{{ $task->title }}">
            {{ $task->title }}
        </li>
    @endforeach
</ul>
```

```php
public function reorder( array $orderedIds ): void
{
    foreach ( $orderedIds as $position => $id ) {
        Task::whereKey( $id )->update( [ 'position' => $position ] );
    }
}
```

`$event.detail.orderedIds` is the context's item ids in their new order.

## Styling

The package adds no visual styles of its own except the floating copy of the dragged item and the drop indicator. Style the states with attribute selectors:

```css
/* The item being dragged (stays in place, dimmed, while a copy follows the pointer). */
[x-drag-item][data-dragging] { opacity: 0.4; }

/* Contexts that can receive the dragged item / that refuse it right now. */
[data-drag-active] { outline: 2px dashed #93c5fd; }
[data-drag-disallowed] { opacity: 0.5; cursor: not-allowed; }

/* The context currently under the pointer (or the keyboard target). */
[data-drag-over] { background: #eff6ff; }

/* The insertion line. Its color comes from a custom property. */
:root { --drag-indicator-color: #2563eb; }

/* Give empty contexts a drop area. */
[x-drag-context] { min-height: 3rem; }
```

`body` also gets `data-drag-in-progress="pointer"` or `"keyboard"` while a drag is active.

## Connected lists

Give contexts the same group to let items move between them. Each context needs an id so events can say where an item came from and went to:

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

For a move between contexts, `drag:end` is dispatched on **both** contexts. The `toElement === $el` check makes only the receiving context call the server; the detail has everything you need:

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

The group can also be set with a modifier: `x-drag-context.group.tasks`. Attribute names are lowercase in HTML, so modifier group names are lowercase too.

## Kanban board

Columns are items of an outer context (so they can be reordered) and contexts of their own (so cards can move between them). Events never cross: moving a card dispatches nothing on the board, and moving a column dispatches nothing on the card lists.

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
- When a context's items live in a child element (a column with a header and a list), put `x-drag-context` on the list, or mark the list with `data-drag-items` so drops into the empty column land in it.
- A column cannot be dropped into its own card list; dragging a column over cards targets the board.

## Rules: refusing drops

A context refuses drops while it is disabled or while its `accepts` callback returns `false`. It gets `data-drag-disallowed` during the drag, no drop indicator is shown, and a drop there is cancelled and announced (`rejected` message).

```blade
{{-- Static --}}
<ul x-drag-context data-drag-disabled>…</ul>

{{-- Reactive (Alpine expression) --}}
<ul x-drag-context="{ disabled: cards.length >= limit }">…</ul>

{{-- Per item --}}
<ul x-drag-context="{ accepts: ( detail ) => detail.fromContext !== 'archived' }">…</ul>
```

Disabled contexts still let their own items be dragged out.

To decide at drop time instead, cancel `drag:drop`. It is dispatched before the DOM changes; cancelling it leaves the item where it was and announces your message:

```blade
<ul x-drag-context data-drag-group="cards"
    @drag:drop="if ( atLimit ) { $event.preventDefault(); $event.detail.message = @js( __( 'This column is at its WIP limit.' ) ) }">
```

`$event.detail.reject( message )` does the same in one call.

## Optimistic moves and revert

The DOM is updated as soon as the item is dropped. If the server then rejects the move, put it back:

```blade
<ul x-drag-context data-drag-group="cards" data-drag-context-id="{{ $status }}"
    @drag:end="
        if ( $event.detail.toElement !== $el ) return;
        const { moveId } = $event.detail;
        $wire.moveCard( $event.detail )
            .then( ( ok ) => ok || LivewireDragAndDrop.revert( moveId ) )
            .catch( () => LivewireDragAndDrop.revert( moveId ) );
    ">
```

```php
use Livewire\Attributes\Renderless;

#[Renderless]
public function moveCard( array $detail ): bool
{
    $card = Card::findOrFail( $detail['itemId'] );

    if ( ! $card->canTransitionTo( $detail['toContext'] ) ) {
        return false;
    }

    $card->moveTo( $detail['toContext'], $detail['toIndex'] );

    return true;
}
```

- `LivewireDragAndDrop.revert( moveId )` reverts that move; `$dragRevert( itemId )` (Alpine magic) reverts the item's latest move. Both return `true` if anything moved back.
- The `moveId` keeps several in-flight moves apart: reverting one never touches another item.
- Reverting a move also discards later recorded moves of the same item.
- A revert dispatches `drag:revert` on the contexts involved and announces it.
- If your action re-renders instead (no `#[Renderless]`), Livewire's morph restores the server's order itself; you don't need to revert.

## Keyboard

| Key | When not holding | While holding an item |
|-----|------------------|-----------------------|
| Tab | Moves between items | Cancels the move (focus leaving the item cancels it) |
| Space / Enter | Picks the item up | Drops it |
| Up / Down | — | Moves it within its container |
| Home / End | — | Moves it to the start / end of its container |
| Left / Right | — | Moves it to the previous / next container in its group (skipping containers that refuse it) |
| Escape | — | Cancels: back to the original container and position |

- In a horizontal context (`data-drag-orientation="horizontal"`, or a `display: flex` row), Left/Right move within the list and Up/Down move between containers.
- A context with no other containers in its group uses the between-container keys to move within the list, so Left/Right keep working on ungrouped lists.
- Keys are only handled when the item itself has focus, so buttons and inputs inside items keep working.
- After a keyboard drop, focus stays on the item — also after a Livewire morph replaces it.

Rebind keys globally (values of `KeyboardEvent.key`):

```javascript
LivewireDragAndDrop.configure({
    keys: { previousContainer: ['ArrowLeft', 'h'], nextContainer: ['ArrowRight', 'l'] },
});
```

## Accessibility and translations

What the package sets (author-provided values are never overwritten):

- Contexts: `role="group"` and `aria-label` from `data-drag-label`.
- Items: `tabindex="0"`, `role="button"`, and `aria-describedby` pointing at hidden usage instructions.
- No `aria-grabbed` (deprecated in ARIA 1.1). The held state is conveyed through the announcements.

Every announcement is a template with `{item}`, `{position}`, `{total}`, and `{container}` placeholders. `{item}` and `{container}` come from `data-drag-label` on the item and context.

| Key | Default |
|-----|---------|
| `instructions` | Press Space or Enter to pick up. While holding, use the arrow keys to move, Home or End to jump to the start or end, Space or Enter to drop, and Escape to cancel. |
| `grabbed` | {item} grabbed. Position {position} of {total} in {container}. |
| `moved` | {item} moved to position {position} of {total} in {container}. |
| `movedToContainer` | {item} moved to {container}, position {position} of {total}. |
| `dropped` | {item} dropped in {container}, position {position} of {total}. |
| `cancelled` | Move cancelled. {item} returned to {container}, position {position} of {total}. |
| `rejected` | {item} cannot be dropped in {container}. |
| `reverted` | {item} moved back to {container}, position {position} of {total}. |
| `noContainer` | There is no other container in that direction. |
| `item` | Item *(label used when an item has no `data-drag-label`)* |
| `container` | the list *(label used when a context has no `data-drag-label`)* |

Set them globally — typically once in your layout so Blade can translate them:

```blade
<script>
    document.addEventListener( 'alpine:init', () => {
        LivewireDragAndDrop.configure( {
            messages: {
                instructions: @js( __( 'Press Space or Enter to pick up…' ) ),
                grabbed: @js( __( '{item} grabbed. Position {position} of {total} in {container}.' ) ),
                movedToContainer: @js( __( '{item} moved to {container}, position {position} of {total}.' ) ),
                dropped: @js( __( '{item} dropped in {container}, position {position} of {total}.' ) ),
            },
        } );
    } );
</script>
```

…or per context with JSON (merged over the global messages):

```blade
<ul x-drag-context data-drag-messages='@json( [ 'grabbed' => __( '{item} grabbed.' ) ] )'>
```

Use `{placeholder}` braces (not Laravel's `:placeholder`) so the package can fill them in on the client.

## API reference

### `x-drag-context`

Marks a container whose `x-drag-item` descendants can be reordered (items of nested contexts belong to the nested context).

| Attribute / option | Description |
|--------------------|-------------|
| `data-drag-context-id` / `{ id }` | Id reported as `fromContext` / `toContext`. Falls back to the element `id`. |
| `data-drag-group` / `{ group }` / `.group.name` | Contexts with the same group accept each other's items. |
| `data-drag-label` / `{ label }` | Accessible name and `{container}` in announcements. |
| `data-drag-disabled` / `{ disabled }` | Accept nothing right now (`data-drag-disabled="false"` means enabled). |
| `{ accepts: (detail) => boolean }` | Accept rule, called with `{ moveId, itemId, group, fromContext, fromIndex, toContext }`. |
| `data-drag-messages` / `{ messages }` | Announcement templates for this context. |
| `data-drag-orientation` / `{ orientation }` | `vertical` or `horizontal`. Defaults to `horizontal` for a flex row, else `vertical`. |
| `data-drag-items` (on a child) | Where items are inserted when the context is empty. |

The expression is optional and is an Alpine object (`x-drag-context="{ disabled: full }"`); it is re-evaluated on every check, so it is reactive. Expression values win over attributes.

### `x-drag-item`

`x-drag-item="expression"` — the expression is the item's id (`{{ $item->id }}`, `'{{ $uuid }}'`, `item.id`). Add `data-drag-label` for announcements. Dragging doesn't start from inputs, textareas, selects, contenteditable regions, or elements with `data-drag-ignore`.

### Events

Events are dispatched on the context elements and **do not bubble**, so listen on the context (`@drag:end` on the `x-drag-context` element). Details are plain JSON-safe objects you can pass straight to `$wire`; `itemElement`, `fromElement`, and `toElement` are also available but not serialized.

| Event | Dispatched on | Detail |
|-------|---------------|--------|
| `drag:start` | source | `{ moveId, itemId, group, fromContext, fromIndex }`. Cancelable: prevents the drag. |
| `drag:over` | target | `… , toContext, toIndex, allowed`. Fires when the target or insertion index changes. |
| `drag:drop` | target, then source | `… , toContext, toIndex`. Cancelable, before the DOM changes. Set `detail.message` or call `detail.reject(message)`. |
| `drag:end` | target and source | `{ moveId, itemId, group, fromContext, toContext, fromIndex, toIndex, orderedIds, fromOrderedIds, toOrderedIds }`. `orderedIds` is the order of the context the event is dispatched on. |
| `drag:cancel` | source | `{ moveId, itemId, group, fromContext, fromIndex, reason }`, `reason` is `escape`, `blur`, `outside`, `not-allowed`, `rejected`, `pointercancel`, or `removed`. |
| `drag:revert` | original source and target | Same shape as `drag:end`; `fromContext`/`toContext` describe the move being undone. |

Indices are zero-based positions among the context's items.

### JavaScript

| | |
|---|---|
| `LivewireDragAndDrop(Alpine)` / `Alpine.plugin(LivewireDragAndDrop)` | Registers the directives (done automatically on `alpine:init`). |
| `LivewireDragAndDrop.configure({ messages, keys, dragThreshold, touchDelay, autoScroll })` | Global settings. `dragThreshold` (px, default 5) before a mouse drag starts; `touchDelay` (ms, default 200) press-and-hold before a touch drag; `autoScroll: { edge: 48, speed: 20 }`. |
| `LivewireDragAndDrop.revert(moveId)` | Reverts a committed move. |
| `LivewireDragAndDrop.revertItem(itemId)` / `$dragRevert(itemId)` | Reverts the item's latest move. |

## Upgrading from 2.0

- `drag:end` now has the full detail above (2.0 only had `orderedIds`, which is unchanged for same-list reorders).
- Events no longer bubble. Listen on the `x-drag-context` element rather than an ancestor, `document`, or Livewire `#[On]`.
- Native HTML5 drag-and-drop was replaced with pointer events; items no longer get `draggable="true"`.
- `aria-grabbed` is no longer set; contexts get `role="group"` (2.0 set no role).
- Arrow keys only move between containers for grouped contexts; ungrouped lists behave as before.
- The 2.0 Livewire hook (`message.processed`) doesn't exist in Livewire 3/4; 2.1 uses `morphed` and no longer marks moved items `__livewire_ignore`, so server re-renders apply to them again.

## Browser support

Current Chrome, Edge, Firefox, Safari (macOS and iOS), and Chrome for Android. Requires Pointer Events and Alpine.js 3.

## Development

```bash
npm install
npm test              # jsdom unit/integration tests (Jest + real Alpine)
npm run test:browser  # keyboard and mouse tests in headless Chrome (Puppeteer)
npm run build         # dist/ (ES module + UMD)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [changelog](CHANGELOG.md). Full guides — connected containers, events, configuration, styling, accessibility, and upgrading — are in [docs/](docs/home.md).

## License

MIT — see [LICENSE](LICENSE).

## Credits

Created by [Jacob Martella](https://jacobmartella.com) for the ArtisanPack UI ecosystem. Built with [Alpine.js](https://alpinejs.dev/) and [Livewire](https://livewire.laravel.com/).
