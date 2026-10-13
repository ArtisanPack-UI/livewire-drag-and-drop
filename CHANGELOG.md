# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.0] - 2026-10-13

The drag engine has been rewritten on Pointer Events with delegated document listeners. The `x-drag-context` / `x-drag-item` directives and the `drag:end` → `orderedIds` flow from 2.0 keep working; everything below is additive unless listed under **Changed**. See the [upgrade guide](docs/upgrading.md) for details.

### Added

* **Connected containers** — contexts that share a group (`data-drag-group`, `{ group }`, or `x-drag-context.group.name`) accept each other's items, including when a context is empty. A drop indicator shows where the item will land, and `data-drag-items` marks where items go in an empty context.
* **Mouse, pen, and touch support** — touch drags start after a press-and-hold (`touchDelay`, 200 ms by default); mouse drags start after a small movement (`dragThreshold`, 5 px by default).
* **Auto-scroll** — scrolling ancestors and the page scroll while the pointer is near their edges (`autoScroll: { edge, speed }`).
* **Nested contexts** — reorderable columns that each hold a card list (kanban), with events never crossing between the levels.
* **Keyboard moves between containers** — Left/Right move a held item to the previous or next container in its group (skipping containers that refuse it); Up/Down/Home/End move within the list. Horizontal contexts swap the axes. Bindings can be changed with `configure( { keys } )`.
* **Lifecycle events** — `drag:start` (cancelable), `drag:over`, `drag:drop` (cancelable before the DOM changes, with `detail.reject( message )`), `drag:cancel` (with a `reason`), and `drag:revert`. `drag:end` now reports `moveId`, `itemId`, `group`, `fromContext`, `toContext`, `fromIndex`, `toIndex`, `fromOrderedIds`, and `toOrderedIds`.
* **Drop rules** — `data-drag-disabled` / `{ disabled }` and an `{ accepts: ( detail ) => boolean }` callback; refusing contexts get `data-drag-disallowed` and drops on them are cancelled and announced.
* **Optimistic moves and revert** — every move has a `moveId`; `LivewireDragAndDrop.revert( moveId )`, `LivewireDragAndDrop.revertItem( itemId )`, and the `$dragRevert( itemId )` Alpine magic put an item back after a server rejection.
* **Translatable announcements** — every screen reader message is a `{placeholder}` template that can be set globally with `LivewireDragAndDrop.configure( { messages } )` or per context with `data-drag-messages`.
* **Accessible names** — `data-drag-label` on contexts and items feeds `aria-label` and the `{container}` / `{item}` placeholders.
* **`LivewireDragAndDrop.configure()`** for messages, keys, `dragThreshold`, `touchDelay`, and `autoScroll`.
* **State attributes for styling** — `data-dragging`, `data-drag-active`, `data-drag-disallowed`, `data-drag-over`, `body[data-drag-in-progress]`, and the `--drag-indicator-color` custom property.
* **Real-browser test suite** — keyboard and mouse tests in headless Chrome (`npm run test:browser`).
* **Release workflow** — pushing a `v*` tag tests, builds, publishes to npm with provenance, creates the GitHub release from this changelog, and imports the docs on docs.artisanpackui.dev.
* New documentation pages: [Connected Containers](docs/connected-containers.md), [Events and Lifecycle](docs/events.md), [Configuration and Translations](docs/configuration.md), [Styling](docs/styling.md), and [Upgrading](docs/upgrading.md).

### Changed

* **Events no longer bubble.** Listen on the `x-drag-context` element itself rather than an ancestor, `document`, or a Livewire `#[On]` listener. This keeps nested contexts from receiving each other's events.
* Native HTML5 drag-and-drop has been replaced with Pointer Events; items no longer get `draggable="true"`.
* `aria-grabbed` (deprecated in ARIA 1.1) is no longer set. Items get `role="button"`, `tabindex="0"`, and `aria-describedby` pointing at usage instructions; contexts get `role="group"`. Author-provided attributes are never overwritten.
* Arrow keys only move between containers for grouped contexts; ungrouped lists behave as before.
* After a keyboard drop, focus stays on the moved item, including after a Livewire morph replaces it.
* The package now works as an Alpine plugin (`Alpine.plugin( LivewireDragAndDrop )`) and still registers itself automatically on `alpine:init`.
* The repository, issues, and npm metadata now point at GitHub.

### Fixed

* The Livewire integration now uses the `morphed` hook (Livewire 3 and 4). The 2.0 `message.processed` hook never fired, which left moved items permanently marked `__livewire_ignore` so server re-renders no longer applied to them.
* Pressing Escape, or moving focus away during a keyboard drag, now restores the item to its original container and position.

### Removed

* The obsolete `.gitlab-ci.yml` pipeline.

## [2.0.1] - 2025-12-05

### Fixed

* **Added missing default export** to fix build errors when importing the package with default import syntax (`import LivewireDragAndDrop from "@artisanpack-ui/livewire-drag-and-drop"`). The package now properly exports a default function for manual Alpine.js plugin registration.
* **Added named exports** (`registerDirectives`, `registerLivewireHooks`) for advanced usage scenarios requiring granular control over initialization.

### Notes

* This fix is fully backward compatible. Existing applications using side-effect imports (`import "@artisanpack-ui/livewire-drag-and-drop"`) will continue working without any changes, as automatic registration via `alpine:init` and `livewire:init` event listeners remains intact.

### Props
@eyler

## [2.0.0] - 2025-10-12

### 🚀 Major Architectural Rework for Stability

This release marks a significant milestone in the stability and reliability of the `livewire-drag-and-drop` package. While the public API (`x-drag-context` and `x-drag-item` directives) remains unchanged, the underlying JavaScript has been completely rewritten to be truly immune to Livewire's DOM morphing.

### Fixed

* **Corrected a fundamental race condition** between Livewire's `message.processed` hook and Alpine.js's `initTree` function, which caused existing draggable items to become unresponsive after a new item was added or deleted.
* **Resolved an issue** where `draggable="true"` attributes were not being reapplied to existing elements after a Livewire update.

### Changed

* **BREAKING CHANGE:** The internal JavaScript architecture has been refactored. The event listener pattern is now stateless, and a manual `forceRehydrateDraggableItems` function has been introduced to ensure all items are correctly initialized after every Livewire update. While this doesn't change how you use the package, it's a fundamental shift from the flawed architecture of v1.0.0. All users are strongly encouraged to upgrade.

## [1.0.0] - 2025-10-11

### Added
- Initial release of ArtisanPack UI Livewire Drag and Drop package
- Accessibility-first drag-and-drop utility with WCAG 2.1 AA compliance
- Full keyboard navigation support with arrow keys, space/enter, and escape
- Screen reader support with comprehensive ARIA attributes
- Native Alpine.js integration with custom directives
- Livewire compatibility with custom events for backend integration
- Touch-friendly interface for desktop, tablet, and mobile devices
- Support for multiple use cases including lists, kanban boards, and complex drag-and-drop interfaces
- Comprehensive test suite including accessibility tests with jest-axe
- Complete documentation with usage examples and setup instructions
- ES Module and CDN distribution support