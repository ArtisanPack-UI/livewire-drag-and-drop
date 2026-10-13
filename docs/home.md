---
title: Home
---

# ArtisanPack UI Livewire Drag and Drop

`@artisanpack-ui/livewire-drag-and-drop` is an accessibility-first drag-and-drop utility for Livewire and Alpine.js. Reorder lists, move items between connected containers (kanban boards), and let mouse, touch, pen, and keyboard users all do the same things — with translatable screen reader announcements and a lifecycle you can veto and roll back.

## Start here

- [[Getting Started]] — install the package, register it, and build your first sortable list.
- [[Upgrading]] — what changed between 2.0 and 2.1.

## Guides

- [[Connected Containers]] — move items between lists, build a kanban board, nest contexts, and refuse drops.
- [[Events and Lifecycle]] — `drag:start` through `drag:end`, cancelling drops, and optimistic moves with revert.
- [[Configuration and Translations]] — context options, global settings, key bindings, and translatable announcements.
- [[Styling]] — the state attributes the package sets and how to style them.
- [[Accessibility]] — keyboard model, ARIA, announcements, focus, and testing.

## Reference

- [[API Reference]] — directives, attributes, events, and the JavaScript API.
- [[Troubleshooting]] — common problems and how to fix them.
- [[Contributing]] — set up the project, run the tests, and submit changes.

## Features

- **Connected containers** — contexts that share a group accept each other's items, including when empty.
- **Mouse, touch, and pen** — Pointer Events based, so it works on tablets (press and hold to pick up on touch).
- **Keyboard** — grab with Space/Enter, move within a list with Up/Down/Home/End, move between containers with Left/Right, drop with Space/Enter, cancel with Escape.
- **Screen readers** — instructions via `aria-describedby`, every step announced in a live region, every message a translatable template.
- **Lifecycle events** — `drag:start`, `drag:over`, a cancelable `drag:drop`, `drag:end`, `drag:cancel`, and `drag:revert`.
- **Optimistic moves** — every move has a `moveId`; revert it after a server rejection.
- **Livewire 3 and 4** — survives morphing; focus stays on the moved item.
- **Nested contexts** — reorder columns while cards move between them, without events crossing.
- **Auto-scroll** — scrolling parents (and the page) scroll while you drag near their edges.

## Package information

| | |
|---|---|
| npm package | [`@artisanpack-ui/livewire-drag-and-drop`](https://www.npmjs.com/package/@artisanpack-ui/livewire-drag-and-drop) |
| Current version | 2.1.0 |
| Requires | Alpine.js 3; Livewire 3 or 4 for the Livewire integration |
| Browsers | Current Chrome, Edge, Firefox, Safari (macOS and iOS), and Chrome for Android |
| License | MIT |
| Repository | <https://github.com/ArtisanPack-UI/livewire-drag-and-drop> |
| Changelog | [CHANGELOG.md](https://github.com/ArtisanPack-UI/livewire-drag-and-drop/blob/main/CHANGELOG.md) |

## Getting help

1. Read [[Getting Started]] and [[Troubleshooting]].
2. Search the [existing issues](https://github.com/ArtisanPack-UI/livewire-drag-and-drop/issues).
3. Open a new issue with the markup you are using, your Alpine and Livewire versions, and the steps to reproduce the problem.
