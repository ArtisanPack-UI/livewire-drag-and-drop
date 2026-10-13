---
title: API Reference
---

# API Reference

## Directives

### `x-drag-context`

Marks a container whose `x-drag-item` descendants can be reordered. Items of nested contexts belong to the nested context.

```blade
<ul x-drag-context>…</ul>
<ul x-drag-context="{ group: 'tasks', id: 'todo', disabled: full }">…</ul>
<ul x-drag-context.group.tasks>…</ul>
```

The expression is optional. When present it must evaluate to an object; it is re-evaluated every time the package checks the context, so it is reactive. Expression values win over attributes, which win over the `.group` modifier.

| Attribute | Expression key | Description |
|-----------|----------------|-------------|
| `data-drag-context-id` | `id` | Id reported as `fromContext` / `toContext`. Falls back to the element `id`. |
| `data-drag-group` | `group` | Contexts with the same group accept each other's items. Modifier: `.group.name` (lowercase). |
| `data-drag-label` | `label` | Accessible name and `{container}` in announcements. |
| `data-drag-disabled` | `disabled` | Accept nothing right now (`data-drag-disabled="false"` means enabled). |
| — | `accepts` | `( detail ) => boolean` accept rule, called with `{ moveId, itemId, group, fromContext, fromIndex, toContext }`. |
| `data-drag-messages` | `messages` | Announcement templates for this context (JSON in the attribute). |
| `data-drag-orientation` | `orientation` | `vertical` or `horizontal`. Defaults to `horizontal` for a flex row, else `vertical`. |
| `data-drag-items` *(on a child)* | — | Where items are inserted when the context is empty. |

See [[Connected Containers]] and [[Configuration and Translations]].

### `x-drag-item`

```blade
<li x-drag-item="{{ $task->id }}" wire:key="task-{{ $task->id }}" data-drag-label="{{ $task->title }}">…</li>
```

The expression is the item's id: `{{ $item->id }}`, `'{{ $uuid }}'`, `item.id`. It is reported as `itemId` and in `orderedIds`.

| Attribute | Description |
|-----------|-------------|
| `data-drag-label` | The `{item}` placeholder in announcements. |
| `data-drag-ignore` *(on a descendant)* | Pointer drags don't start from this element. |

Pointer drags never start from `input`, `textarea`, `select`, `option`, or `contenteditable` elements. Keyboard handling only applies when the item element itself has focus.

## Attributes set by the package

| Element | Attribute | Notes |
|---------|-----------|-------|
| Context | `data-drag-context` | Marks an initialized context. |
| Context | `role="group"` | Unless a role is already set. |
| Context | `aria-label` | From the label, unless `aria-label` or `aria-labelledby` is set. |
| Item | `tabindex="0"` | Unless a tabindex is already set. |
| Item | `role="button"` | Unless a role is already set. |
| Item | `aria-describedby` | Adds the instructions id to any existing ids. |
| Item | `data-dragging` | While it is being dragged. |
| Context | `data-drag-active` / `data-drag-disallowed` | During a drag, on contexts that can / can't receive the item. |
| Context | `data-drag-over` | During a drag, on the current target. |
| `<body>` | `data-drag-in-progress` | `pointer` or `keyboard` during a drag. |

Elements the package creates: the live region (`[data-drag-live-region]`), the hidden instructions (`[data-drag-instructions]`), the floating copy (`[data-drag-ghost]`), and the drop indicator (`[data-drag-indicator]`). See [[Styling]].

## Events

Dispatched on context elements; they **do not bubble**. Details are JSON-safe; `itemElement`, `fromElement`, and `toElement` are available as non-enumerable properties. Indices are zero-based.

| Event | Dispatched on | Cancelable | Detail |
|-------|---------------|------------|--------|
| `drag:start` | source | yes — prevents the drag | `{ moveId, itemId, group, fromContext, fromIndex }` |
| `drag:over` | target | no | `… , toContext, toIndex, allowed` |
| `drag:drop` | target, then source | yes — refuses the drop | `… , toContext, toIndex`; set `detail.message` or call `detail.reject( message )` |
| `drag:end` | target and source | no | `{ moveId, itemId, group, fromContext, toContext, fromIndex, toIndex, orderedIds, fromOrderedIds, toOrderedIds }` |
| `drag:cancel` | source | no | `{ moveId, itemId, group, fromContext, fromIndex, reason }` |
| `drag:revert` | original source and target | no | Same shape as `drag:end` |

`orderedIds` is the order of the context the event is dispatched on. `reason` is one of `escape`, `blur`, `outside`, `not-allowed`, `rejected`, `pointercancel`, or `removed`.

See [[Events and Lifecycle]] for when each fires and examples.

## Alpine magic

### `$dragRevert( itemId )`

Reverts the item's most recent recorded move. Returns `true` if anything moved back.

```blade
@drag:end="$wire.moveCard( $event.detail ).then( ( ok ) => ok || $dragRevert( $event.detail.itemId ) )"
```

## JavaScript API

The default export, also available as `window.LivewireDragAndDrop`:

```javascript
import LivewireDragAndDrop from '@artisanpack-ui/livewire-drag-and-drop';
```

### `LivewireDragAndDrop( Alpine )`

Alpine plugin that registers `x-drag-context`, `x-drag-item`, and `$dragRevert`. Use it as `Alpine.plugin( LivewireDragAndDrop )` or call it directly. It is also called automatically on `alpine:init`, and calling it more than once on the same Alpine instance does nothing.

### `LivewireDragAndDrop.configure( options )`

Merges global settings and returns the resulting settings object.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `messages` | `object` | see [[Configuration and Translations]] | Announcement templates, merged per key. |
| `keys` | `object` | see [[Configuration and Translations]] | Key bindings per action (string or array of `KeyboardEvent.key` values). |
| `dragThreshold` | `number` | `5` | Pixels a mouse or pen must move before a drag starts. |
| `touchDelay` | `number` | `200` | Milliseconds a touch must be held before a drag starts. |
| `autoScroll` | `{ edge, speed }` | `{ edge: 48, speed: 20 }` | Auto-scroll edge size (px) and maximum speed (px per frame). |

### `LivewireDragAndDrop.revert( moveId )`

Reverts a committed move by its `moveId` (from `drag:end`). Returns `true` if anything moved back. Dispatches `drag:revert` and announces the `reverted` message. Later recorded moves of the same item are discarded.

### `LivewireDragAndDrop.revertItem( itemId )`

Reverts the item's most recent recorded move. Same as `$dragRevert`.

### `LivewireDragAndDrop.itemId( element )`

Returns the id of an `x-drag-item` element, or `null`.

### `LivewireDragAndDrop.registerLivewireHooks( Livewire )`

Registers the Livewire `morphed` hook that re-applies ARIA attributes, cancels drags whose item was removed, and restores focus after keyboard drops. It is called automatically on `livewire:init` (and immediately if `window.Livewire` already exists when the package loads), so you only need it if Livewire is not on `window`. Calling it more than once does nothing.

### Named exports

For compatibility with 2.0.1, the module also has named exports:

```javascript
import { registerDirectives, registerLivewireHooks } from '@artisanpack-ui/livewire-drag-and-drop';
```

`registerDirectives` is the same function as the default export; `registerLivewireHooks` is `LivewireDragAndDrop.registerLivewireHooks`.

## Builds

| File | Format |
|------|--------|
| `dist/livewire-drag-and-drop.es.js` | ES module (`module` entry) |
| `dist/livewire-drag-and-drop.umd.js` | UMD (`main` entry), exposes `window.LivewireDragAndDrop` |
