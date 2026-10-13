---
title: Styling
---

# Styling

The package adds no visual styles of its own except two elements it creates during a pointer drag: the floating copy of the dragged item and the drop indicator. Everything else is up to you, using the state attributes below.

## State attributes

| Selector | When |
|----------|------|
| `[x-drag-item][data-dragging]` | The item being dragged. It stays in place (dimmed, if you style it) while a copy follows the pointer; during a keyboard drag it moves with each key press. |
| `[data-drag-active]` | A context that can receive the dragged item. Set on every eligible context (the source and its group) for the whole drag. |
| `[data-drag-disallowed]` | An eligible context that refuses the item right now (disabled, or `accepts` returned `false`). |
| `[data-drag-over]` | The context currently under the pointer, or the keyboard target. |
| `body[data-drag-in-progress="pointer"]` / `="keyboard"` | A drag is active, and how. |
| `[data-drag-ghost]` | The floating copy of the item during a pointer drag. |
| `[data-drag-indicator]` | The insertion line during a pointer drag. |
| `[data-drag-context]` | Added to every initialized context. |

## A starting point

```css
/* Items */
[x-drag-item] { cursor: grab; }
[x-drag-item]:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }

/* The item being dragged (stays in place, dimmed, while a copy follows the pointer). */
[x-drag-item][data-dragging] { opacity: 0.4; }

/* A keyboard drag has no floating copy, so make the held item obvious. */
body[data-drag-in-progress="keyboard"] [x-drag-item][data-dragging] {
    opacity: 1;
    outline: 3px dashed #2563eb;
}

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

Tailwind users can use arbitrary variants: `data-[dragging]:opacity-40`, `data-[drag-over]:bg-blue-50`, `data-[drag-disallowed]:opacity-50`.

## The floating copy

During a pointer drag the item is cloned (without its `id`, Alpine, and Livewire attributes), marked `aria-hidden="true"` and `data-drag-ghost`, and appended to `<body>` with fixed positioning, `opacity: 0.85`, and `z-index: 9999`.

- It keeps the item's classes, so utility classes on the item style the copy too.
- It is appended to `<body>`, so styles that depend on an ancestor (`.board li { … }`) don't reach it. Style items with their own classes, or target `[data-drag-ghost]`.
- Its position, size, opacity, and z-index are inline styles. Override them with `!important`:

```css
[data-drag-ghost] {
    opacity: 1 !important;
    box-shadow: 0 10px 25px rgb(0 0 0 / 0.15);
    transform-origin: center;
    rotate: 2deg;
}
```

## The drop indicator

The indicator is a `<li>` inside `<ul>`/`<ol>` lists and a `<div>` elsewhere, inserted where the item will land. It is a 3px line: horizontal in vertical contexts and vertical (at least `1.5rem` tall) in horizontal ones. It is not shown over a context that refuses the item.

Change its color with the custom property, globally or per context:

```css
:root { --drag-indicator-color: #2563eb; }
.danger-zone { --drag-indicator-color: #dc2626; }
```

For more control, target `[data-drag-indicator]`. Its border is an inline style, so use `!important` to change the width or style.

## Cursor and text selection

While a pointer drag is active the package sets `cursor: grabbing` on `<body>` (or `not-allowed` over a refusing context) and disables text selection; both are restored afterwards.

## Dark mode and high contrast

Because all states are attributes, they compose with your theme:

```css
.dark [data-drag-over] { background: rgb(30 58 138 / 0.3); }

@media (forced-colors: active) {
    [x-drag-item]:focus-visible,
    [x-drag-item][data-dragging] { outline: 3px solid CanvasText; }
    [data-drag-indicator] { border-color: Highlight !important; }
}
```

Don't rely on color alone to show a state — pair it with an outline, border style, or opacity change. See [[Accessibility]].
