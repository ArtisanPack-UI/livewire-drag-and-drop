---
title: Contributing
---

# Contributing

Thank you for helping improve ArtisanPack UI Livewire Drag and Drop. Accessibility is the point of this package, so every change is judged first on whether it keeps the drag-and-drop usable for keyboard and screen reader users.

The repository's [CONTRIBUTING.md](https://github.com/ArtisanPack-UI/livewire-drag-and-drop/blob/main/CONTRIBUTING.md) has the full guidelines; this page is a summary.

## Code of conduct

- Be respectful and inclusive.
- Focus on constructive feedback.
- Prioritize accessibility in every contribution.

## Setting up

```bash
git clone https://github.com/ArtisanPack-UI/livewire-drag-and-drop.git
cd livewire-drag-and-drop
npm install
```

| Command | What it does |
|---------|--------------|
| `npm test` | Unit and integration tests in jsdom (Jest with a real Alpine instance) and axe checks. |
| `npm run test:browser` | Keyboard and mouse tests in headless Chrome (Puppeteer). |
| `npm run test:coverage` | `npm test` with a coverage report. |
| `npm run build` | Builds `dist/` (ES module and UMD) with Vite. |

## Project structure

```
livewire-drag-and-drop/
├── src/
│   ├── index.js      # Alpine plugin, directives, Livewire hook, public API
│   ├── config.js     # Default messages and keys, configure()
│   ├── dom.js        # Context/item lookup, options, ARIA, announcements
│   ├── engine.js     # Drag session lifecycle, events, revert
│   ├── keyboard.js   # Keyboard dragging
│   └── pointer.js    # Mouse, pen, and touch dragging, indicator, auto-scroll
├── tests/
│   ├── *.test.js     # jsdom suites
│   └── browser/      # Headless Chrome suite and fixture
├── docs/             # This documentation (imported into the docs site on release)
└── dist/             # Build output
```

## Coding standards

- Follow the existing code style in `src/`.
- Document functions with JSDoc following the WordPress inline documentation standards, including `@since` with the version the function was added in.
- Don't overwrite attributes authors set themselves (`role`, `aria-*`, `tabindex`).
- Make every user-facing string a message template that can be translated with `configure()` or `data-drag-messages`.
- Keep event details JSON-safe so they can be passed to `$wire`.

## Submitting changes

1. Open an issue describing the problem, your proposed approach, and its accessibility impact.
2. Create a branch from `main` (`feature/…`, `fix/…`, `enhancement/…`).
3. Write tests for new behavior — jsdom tests for logic, browser tests for real keyboard and pointer interaction.
4. Update the README, these docs, and `CHANGELOG.md` (under `[Unreleased]`).
5. Open a pull request on GitHub that references the issue and describes how you tested it, including with a screen reader where relevant.

## Testing checklist

- [ ] `npm test` and `npm run test:browser` pass.
- [ ] Keyboard: pick up, move, move between containers, drop, and cancel all work and keep focus on the item.
- [ ] Screen reader (NVDA, JAWS, or VoiceOver): instructions and every step are announced.
- [ ] Pointer: mouse, touch (press and hold), and pen.
- [ ] Current Chrome, Edge, Firefox, and Safari.

## Releases

Releases are cut from a `release/x.y.z` branch. Pushing a `vX.Y.Z` tag runs the release workflow, which checks that the tag matches `package.json`, runs the tests, builds, publishes to npm with provenance, creates the GitHub release from the matching `CHANGELOG.md` entry, and imports these docs on the docs site.
