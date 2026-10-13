---
title: Accessibility
---

# Accessibility

Everything a pointer user can do — reorder, move between containers, cancel — a keyboard or screen reader user can do too. This page describes what the package does for you and what you still need to provide.

## What you need to provide

1. **Labels.** Add `data-drag-label` to every context and item. Without them, announcements fall back to "Item" and "the list".

   ```blade
   <ul x-drag-context data-drag-label="{{ __( 'To do' ) }}">
       <li x-drag-item="{{ $task->id }}" data-drag-label="{{ $task->title }}">…</li>
   </ul>
   ```

2. **A visible focus style** for items — see [[Styling]].
3. **Visible states that don't rely on color alone** (outline, border style, or opacity as well as color).
4. **Translated announcements** if your app isn't in English — see [[Configuration and Translations#announcements-and-translations]].
5. **An alternative for complex moves** where it helps (for example, a "Move to…" menu). Not required, but some users prefer it.

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
- Escape also cancels a pointer drag.
- Keys can be rebound with `configure( { keys } )` — see [[Configuration and Translations#key-bindings]].

## ARIA

What the package sets (author-provided values are never overwritten):

| Element | Attributes |
|---------|------------|
| Context | `role="group"`; `aria-label` from `data-drag-label` (unless it already has `aria-label` or `aria-labelledby`). |
| Item | `tabindex="0"`; `role="button"`; `aria-describedby` pointing at hidden usage instructions (added to any ids you already set). |
| Instructions | One hidden `<div data-drag-instructions>` per distinct instructions text, appended to `<body>`. |
| Live region | One visually hidden `<div aria-live aria-atomic="true" data-drag-live-region>` appended to `<body>`. |
| Floating copy and drop indicator | `aria-hidden="true"`. |

`aria-grabbed` is not used — it was deprecated in ARIA 1.1 and is poorly supported. The held state is conveyed through the announcements instead.

If an item already has a role (for example an `<li>` you've given `role="listitem"`, or a `<button>`), it is kept. Make sure the element you mark with `x-drag-item` is the one that should receive focus.

## Announcements

Each step is announced in the live region:

| Step | Message | Politeness |
|------|---------|------------|
| Picked up (keyboard) | `grabbed` | assertive |
| Moved within a container | `moved` | polite |
| Moved to another container | `movedToContainer` | polite |
| No container in that direction | `noContainer` | polite |
| Dropped | `dropped` | polite |
| Cancelled | `cancelled` | polite |
| Refused (rule or `drag:drop` cancelled) | `rejected`, or your message | assertive |
| Reverted | `reverted` | assertive |

Messages include the item, its position, the total, and the container, so users always know where the item is. When the same message is announced twice in a row, the package changes it invisibly so screen readers repeat it.

All messages are templates you can translate globally or per context — see [[Configuration and Translations]].

## Focus

- Items are focusable (`tabindex="0"`) and stay in the normal Tab order.
- During a keyboard drag the held item keeps focus while it moves, including between containers.
- Moving focus elsewhere (Tab, clicking another control) cancels the drag and returns the item to where it started.
- After a keyboard drop, if a Livewire re-render replaces the item element, focus is restored to the new element (matched by `wire:key`, then by item id) — unless focus has already moved somewhere else.
- After a revert, the item keeps focus if it had it.

## Touch and screen readers on mobile

Pointer drags on touch screens start with a press-and-hold. Mobile screen readers (VoiceOver on iOS, TalkBack) intercept touch gestures, so their users rely on the same keyboard model: with a connected or on-screen keyboard, or via a "Move to…" alternative you provide.

## Testing

Automated:

- The package's own suite runs [axe](https://github.com/dequelabs/axe-core) checks with `jest-axe` and drives real keyboard and mouse interactions in headless Chrome.
- In your app, run axe (browser extension or `@axe-core/playwright`) on pages with drag-and-drop, both idle and mid-drag.

Manual checklist:

- [ ] Every item is reachable with Tab and has a visible focus style.
- [ ] Space/Enter picks up and drops; arrows, Home, and End move; Escape cancels and returns the item.
- [ ] Left/Right move between connected containers and skip containers that refuse the item.
- [ ] Focus stays on the item after a drop, including after the server re-renders.
- [ ] With NVDA, JAWS, or VoiceOver, the instructions are read when an item is focused and every step is announced with a meaningful item and container name.
- [ ] States are visible in Windows High Contrast / forced-colors mode.
- [ ] Refused drops are announced with a message that explains why.
