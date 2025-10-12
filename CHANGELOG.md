# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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