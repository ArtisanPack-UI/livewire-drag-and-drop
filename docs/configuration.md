---
title: Configuration and Translations
---

# Configuration and Translations

There are two levels of configuration: **per context** (attributes or the `x-drag-context` expression) and **global** (`LivewireDragAndDrop.configure()`).

## Context options

Every option can be set as a `data-drag-*` attribute or in the `x-drag-context` expression object:

```blade
<ul
    x-drag-context
    data-drag-context-id="todo"
    data-drag-group="tasks"
    data-drag-label="{{ __( 'To do' ) }}"
>

{{-- or --}}

<ul x-drag-context="{ id: 'todo', group: 'tasks', label: @js( __( 'To do' ) ) }">
```

| Attribute | Expression key | Description |
|-----------|----------------|-------------|
| `data-drag-context-id` | `id` | Id reported as `fromContext` / `toContext`. Falls back to the element `id`. |
| `data-drag-group` | `group` | Contexts with the same group accept each other's items. Also settable as a modifier: `x-drag-context.group.tasks`. |
| `data-drag-label` | `label` | Accessible name (`aria-label`) and the `{container}` placeholder in announcements. Falls back to an existing `aria-label`. |
| `data-drag-disabled` | `disabled` | Accept no drops right now. The attribute counts as enabled when absent or `"false"`. |
| — | `accepts` | `( detail ) => boolean` accept rule. See [[Connected Containers#refusing-drops]]. |
| `data-drag-messages` | `messages` | Announcement templates for this context (JSON in the attribute). |
| `data-drag-orientation` | `orientation` | `vertical` or `horizontal`. Defaults to `horizontal` when the items' parent is a `display: flex` row, otherwise `vertical`. |

Precedence: expression object › `data-drag-*` attribute › modifier.

The expression is an Alpine expression and is re-evaluated every time the package checks the context, so it is reactive:

```blade
<div x-data="{ cards: @js( $cards ), limit: 5 }">
    <ul x-drag-context="{ disabled: cards.length >= limit }">…</ul>
</div>
```

If the expression throws or doesn't return an object, it is treated as `{}`.

### Item options

| Attribute | Description |
|-----------|-------------|
| `x-drag-item="expression"` | The item's id — any Alpine expression: `{{ $item->id }}`, `'{{ $uuid }}'`, `item.id`. |
| `data-drag-label` | The `{item}` placeholder in announcements. Falls back to `aria-label`, then the `item` message. |
| `data-drag-ignore` | On an element inside an item: pointer drags don't start from it. |

Pointer drags never start from inputs, textareas, selects, options, or `contenteditable` regions, so form controls inside items keep working.

## Global settings

Call `configure()` once, before or after Alpine starts. Options are merged into the current settings and the resulting settings object is returned.

```javascript
LivewireDragAndDrop.configure({
    dragThreshold: 8,
    touchDelay: 300,
    autoScroll: { edge: 64, speed: 24 },
    keys: { previousContainer: ['ArrowLeft', 'h'], nextContainer: ['ArrowRight', 'l'] },
    messages: { dropped: '{item} placed in {container}.' },
});
```

| Option | Default | Description |
|--------|---------|-------------|
| `dragThreshold` | `5` | Pixels a mouse or pen must move before a drag starts, so clicks still work. |
| `touchDelay` | `200` | Milliseconds a touch must be held before a drag starts. Moving before then scrolls the page as usual. |
| `autoScroll.edge` | `48` | Distance in pixels from a scrollable edge where auto-scroll starts. |
| `autoScroll.speed` | `20` | Maximum pixels scrolled per animation frame (faster closer to the edge). |
| `keys` | see below | Key bindings, merged per action. |
| `messages` | see below | Announcement templates, merged per key. |

In the browser the package is available as `window.LivewireDragAndDrop`. In a bundle, import it:

```javascript
import LivewireDragAndDrop from '@artisanpack-ui/livewire-drag-and-drop';
```

## Key bindings

Values are `KeyboardEvent.key` values. Each action takes a string or an array; the given list replaces that action's default list.

| Action | Default | Does |
|--------|---------|------|
| `grab` | `' '`, `'Enter'` | Picks the focused item up; drops it while holding. |
| `cancel` | `'Escape'` | Cancels the drag. |
| `previous` | `'ArrowUp'` | Moves the held item up within its container. |
| `next` | `'ArrowDown'` | Moves the held item down within its container. |
| `first` | `'Home'` | Moves the held item to the start of its container. |
| `last` | `'End'` | Moves the held item to the end of its container. |
| `previousContainer` | `'ArrowLeft'` | Moves the held item to the previous container in its group. |
| `nextContainer` | `'ArrowRight'` | Moves the held item to the next container in its group. |

In a horizontal context, `previous`/`next` and `previousContainer`/`nextContainer` swap, so Left/Right move within the list and Up/Down move between containers. If the item's context has no other containers in its group, the between-container keys move within the list.

If you rebind keys, update the `instructions` message to match.

## Announcements and translations

Every screen reader announcement is a template. Placeholders use `{braces}`:

| Placeholder | Value |
|-------------|-------|
| `{item}` | The item's `data-drag-label` (or `aria-label`, or the `item` message). |
| `{container}` | The context's label (or the `container` message). |
| `{position}` | One-based position of the item in the context. |
| `{total}` | Number of items in the context. |

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

`instructions` is not announced; it is the hidden text items point to with `aria-describedby`.

### Translating globally

Set the messages once in your layout so Blade can translate them:

```blade
<script>
    document.addEventListener( 'alpine:init', () => {
        LivewireDragAndDrop.configure( {
            messages: {
                instructions: @js( __( 'Press Space or Enter to pick up. While holding, use the arrow keys to move, Home or End to jump to the start or end, Space or Enter to drop, and Escape to cancel.' ) ),
                grabbed: @js( __( '{item} grabbed. Position {position} of {total} in {container}.' ) ),
                moved: @js( __( '{item} moved to position {position} of {total} in {container}.' ) ),
                movedToContainer: @js( __( '{item} moved to {container}, position {position} of {total}.' ) ),
                dropped: @js( __( '{item} dropped in {container}, position {position} of {total}.' ) ),
                cancelled: @js( __( 'Move cancelled. {item} returned to {container}, position {position} of {total}.' ) ),
                rejected: @js( __( '{item} cannot be dropped in {container}.' ) ),
                reverted: @js( __( '{item} moved back to {container}, position {position} of {total}.' ) ),
                noContainer: @js( __( 'There is no other container in that direction.' ) ),
                item: @js( __( 'Item' ) ),
                container: @js( __( 'the list' ) ),
            },
        } );
    } );
</script>
```

Use `{placeholder}` braces, not Laravel's `:placeholder`, so the package can fill them in on the client. Laravel leaves `{…}` untouched.

When the package is imported in your bundle, `window.LivewireDragAndDrop` is set as soon as the bundle runs, so the `alpine:init` listener above can use it. With the CDN build, load the package script before this block.

### Translating per context

`data-drag-messages` takes a JSON object that is merged over the global messages for that context:

```blade
<ul x-drag-context data-drag-messages='@json( [ 'grabbed' => __( '{item} grabbed.' ) ] )'>
```

Invalid JSON is ignored with a console warning. In the expression form, use `messages`:

```blade
<ul x-drag-context="{ messages: { rejected: @js( __( 'This column is full.' ) ) } }">
```

Which context's messages are used:

- `grabbed`, `moved`, `cancelled` — the context the item is in at that moment (for `cancelled`, its original context).
- `movedToContainer`, `dropped`, `rejected` — the target context.
- `reverted` — the context the item is reverted into.
- `instructions` — the item's context when it is first set up.
