---
title: Events and Lifecycle
---

# Events and Lifecycle

Every drag — pointer or keyboard — runs through the same lifecycle:

```
drag:start ──► drag:over (0…n) ──► drag:drop ──► drag:end
     │                                  │
     │ prevented                        │ prevented / refused
     ▼                                  ▼
 (no drag)                         drag:cancel
```

Later, a committed move can be undone, which dispatches `drag:revert`.

## Listening to events

Events are dispatched on the **context elements** and **do not bubble**, so listen on the `x-drag-context` element itself:

```blade
<ul x-drag-context @drag:end="$wire.reorder( $event.detail.orderedIds )">
```

Listeners on an ancestor, on `document`, or Livewire `#[On]` attributes won't receive them. This is what keeps nested contexts (a board of columns holding cards) from receiving each other's events.

Details are plain, JSON-safe objects you can pass straight to `$wire`. Each detail also carries non-enumerable element references — `itemElement`, `fromElement`, and `toElement` — that you can read in JavaScript but that are not serialized.

Indices are zero-based positions among the context's own items (items of nested contexts don't count).

## The events

### `drag:start`

Dispatched on the source context when a drag begins (pointer moved past the threshold, touch held, or Space/Enter pressed on an item). **Cancelable** — preventing it stops the drag from starting.

```javascript
{ moveId, itemId, group, fromContext, fromIndex }
```

```blade
<ul x-drag-context @drag:start="locked && $event.preventDefault()">
```

### `drag:over`

Dispatched on the target context whenever the target context or the insertion index changes.

```javascript
{ moveId, itemId, group, fromContext, fromIndex, toContext, toIndex, allowed }
```

`allowed` is `false` when the target refuses the item (disabled, or `accepts` returned `false`). `toIndex` counts positions without the dragged item.

### `drag:drop`

Dispatched before the DOM changes — on the target context, then on the source context if it is a different one. Both receive the same detail object. **Cancelable**.

```javascript
{ moveId, itemId, group, fromContext, fromIndex, toContext, toIndex }
```

It is not dispatched when the drop is already refused by a rule (that ends in `drag:cancel` with reason `not-allowed`) or when the item was dropped outside any eligible context (`outside`).

### `drag:end`

Dispatched after a committed move — on the target context and, for a move between contexts, also on the source context.

```javascript
{
    moveId, itemId, group,
    fromContext, toContext,
    fromIndex, toIndex,
    orderedIds,      // the order of the context this event is dispatched on
    fromOrderedIds,  // the source context's order
    toOrderedIds,    // the target context's order
}
```

For a reorder within one context, `fromContext === toContext` and the event fires once.

### `drag:cancel`

Dispatched on the source context when a drag ends without a move.

```javascript
{ moveId, itemId, group, fromContext, fromIndex, reason }
```

| `reason` | Cause |
|----------|-------|
| `escape` | Escape pressed (pointer or keyboard drag). |
| `blur` | Focus moved away from the held item during a keyboard drag (for example, Tab). |
| `outside` | Pointer released outside any eligible context. |
| `not-allowed` | Dropped on a context that refuses the item. |
| `rejected` | A `drag:drop` listener cancelled the drop. |
| `pointercancel` | The browser cancelled the pointer (for example, the system took over a touch gesture). |
| `removed` | The dragged item was removed from the DOM (for example, by a Livewire morph). |

A cancelled keyboard drag puts the item back in its original container and position and keeps focus on it. A cancelled pointer drag never moved the item.

### `drag:revert`

Dispatched when a committed move is reverted, on the original source context and on the context the item was reverted from. Same shape as `drag:end`; `fromContext`/`toContext` and `fromIndex`/`toIndex` describe the move being undone, and the ordered ids are the orders after the revert.

## Cancelling a drop

Cancel `drag:drop` to refuse a drop at the last moment. The item stays where it was, `drag:cancel` fires with reason `rejected`, and your message is announced to screen readers:

```blade
<ul x-drag-context data-drag-group="cards"
    @drag:drop="if ( atLimit ) { $event.preventDefault(); $event.detail.message = @js( __( 'This column is at its WIP limit.' ) ) }">
```

`$event.detail.reject( message )` does the same in one call:

```blade
<ul x-drag-context data-drag-group="cards"
    @drag:drop="atLimit && $event.detail.reject( @js( __( 'This column is at its WIP limit.' ) ) )">
```

Without a message, the context's `rejected` template is announced ("{item} cannot be dropped in {container}.").

Use rules (`disabled`, `accepts`) when the answer is known while dragging — the user then sees the refusal before dropping. Use `drag:drop` when it isn't. See [[Connected Containers#refusing-drops]].

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

- `LivewireDragAndDrop.revert( moveId )` reverts that move. `$dragRevert( itemId )` (an Alpine magic) and `LivewireDragAndDrop.revertItem( itemId )` revert the item's latest move. All return `true` if anything moved back.
- The `moveId` keeps several in-flight moves apart: reverting one never touches another item.
- Reverting a move also discards later recorded moves of the same item.
- A revert dispatches `drag:revert` on the contexts involved and announces it with the `reverted` template.
- The last 100 moves are kept; older ones can no longer be reverted.
- If your action re-renders instead (no `#[Renderless]`), Livewire's morph restores the server's order itself and you don't need to revert.

## Livewire and morphing

The package hooks into Livewire's `morphed` hook (Livewire 3 and 4). After each morph it:

- re-applies its ARIA attributes to contexts and items inside the morphed element;
- cancels an active drag (reason `removed`) if the dragged item was removed;
- puts focus back on the last keyboard-dropped item if the morph replaced it (matched by `wire:key`, then by item id), as long as focus hasn't moved elsewhere.

Give items and contexts a `wire:key` so morphs move the right elements.
