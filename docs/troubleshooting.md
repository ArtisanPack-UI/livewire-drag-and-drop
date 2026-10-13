---
title: Troubleshooting
---

# Troubleshooting

## Setup

### Nothing happens when I drag

1. **Is the package loaded before Alpine starts?** The directives are registered on `alpine:init`. Import the package in the same bundle as Livewire (or before your own `Alpine.start()`), or load the CDN script before Alpine's.
2. **Is there more than one Alpine?** With Livewire 3 or 4, don't also `import Alpine from 'alpinejs'` and start it — Livewire bundles Alpine. Two copies means the directives may be registered on the one that isn't running. The console usually shows "Detected multiple instances of Alpine running".
3. **Is the item inside a context?** An `x-drag-item` only works inside an `x-drag-context`.
4. **Did the drag start from a form control?** Drags don't start from inputs, textareas, selects, `contenteditable` regions, or elements marked `data-drag-ignore`.
5. **Did you move far enough?** A mouse drag starts after 5px of movement; a touch drag after holding for 200ms. See `dragThreshold` and `touchDelay` in [[Configuration and Translations]].

### `LivewireDragAndDrop is not defined`

`window.LivewireDragAndDrop` is set when the package script runs. Make sure the script that calls `LivewireDragAndDrop.configure()` runs after the package — for example inside an `alpine:init` listener, as shown in [[Configuration and Translations#translating-globally]].

## Events

### My `@drag:end` listener never fires

Events **don't bubble**. Put the listener on the `x-drag-context` element itself, not on a wrapper, `document`, or a Livewire `#[On]` attribute. This changed in 2.1 — see [[Upgrading]].

### My server method runs twice for one move

For a move between contexts, `drag:end` fires on both contexts. Only act in the receiving one:

```blade
@drag:end="$event.detail.toElement === $el && $wire.move( $event.detail )"
```

### `fromContext` / `toContext` are `null`

Give each context an id with `data-drag-context-id`, an `id` attribute, or `{ id }` in the expression.

### `itemId` is `null` or the wrong type

The `x-drag-item` expression is evaluated by Alpine. Numbers work as-is (`x-drag-item="{{ $task->id }}"`); strings need quotes (`x-drag-item="'{{ $task->uuid }}'"`). An empty `x-drag-item` has a `null` id.

## Connected containers

### Items won't move into another list

- Both contexts need the **same group**. Group names from the `.group.name` modifier are lowercase; use `data-drag-group` for mixed case.
- The target may be refusing the item: check for `data-drag-disabled`, a `disabled` expression, or an `accepts` callback returning `false`. Refusing contexts get `data-drag-disallowed` during the drag.
- An `accepts` callback that throws refuses the drop; check the console.

### I can't drop into an empty list

Give empty contexts a size (`min-height`). If the items live in a child element (a column with a heading and a list), put `x-drag-context` on the list, or mark the list with `data-drag-items`. See [[Connected Containers#empty-containers]].

### Moving a card also fires the board's events

It shouldn't: events don't cross between nested contexts. If you see it, check that the card list is its own `x-drag-context` and that listeners are on the right element — a listener on the board element only hears the board's own events.

## Livewire

### The list jumps back after I drop

Your server method saved a different order than the one shown, or didn't save it, and the next re-render restored the server's order. Check that you use the ids from `$event.detail` (`orderedIds`, or `toOrderedIds` for moves between contexts) and that the query in `render()` orders by the saved position.

### Items in the wrong place after a re-render

Add `wire:key` to every item **and** every context. Without keys, Livewire matches elements by position and can move the wrong ones.

### Moved items stop updating from the server (2.0)

2.0 marked moved items `__livewire_ignore` because its Livewire hook never ran. 2.1 fixes this. Upgrade — see [[Upgrading]].

### Focus is lost after a keyboard drop

The package restores focus to the item after a morph, matching by `wire:key` and then by item id. Make sure the item keeps the same `wire:key` and id across re-renders. Focus isn't restored if the user has already moved it elsewhere.

## Touch devices

### The page scrolls instead of dragging

On touch, a drag starts after pressing and holding (200ms by default). Moving before then scrolls, on purpose. Increase or decrease `touchDelay` to suit your UI.

### Don't set `touch-action: none` on items

The package prevents scrolling itself once a touch drag has started. `touch-action: none` on items stops users from scrolling the page by swiping over a list.

## Accessibility

### Screen readers announce "Item" and "the list"

Add `data-drag-label` to items and contexts.

### Arrow keys don't move the item

- The item itself must have focus (not a button inside it), and it must be picked up first with Space or Enter.
- In a horizontal context the axes swap: Left/Right move within the list, Up/Down between containers.
- Check that you haven't rebound the keys with `configure( { keys } )`.

### Left/Right announce "There is no other container in that direction"

You're at the first or last container in the group, or every container in that direction refuses the item.

## Still stuck?

Open an issue at <https://github.com/ArtisanPack-UI/livewire-drag-and-drop/issues> with the markup, your Alpine and Livewire versions, the browser, and the steps to reproduce the problem.
