---
title: Accessibility Guide - Livewire Drag and Drop
---

# Accessibility Guide

Complete guide to the accessibility features and best practices for ArtisanPack UI Livewire Drag and Drop.

## Overview

ArtisanPack UI Livewire Drag and Drop is built with **WCAG 2.1 AA compliance** as a core principle. This package provides comprehensive accessibility support including screen reader compatibility, keyboard navigation, and semantic markup.

### Accessibility Highlights

- ✅ **WCAG 2.1 AA Compliant** - Meets international accessibility standards
- ✅ **Screen Reader Support** - Tested with NVDA, JAWS, VoiceOver, and TalkBack
- ✅ **Keyboard Navigation** - Full keyboard control with intuitive shortcuts
- ✅ **Semantic Markup** - Proper ARIA attributes and roles
- ✅ **Focus Management** - Clear visual focus indicators
- ✅ **Live Announcements** - Real-time feedback for assistive technologies

## WCAG 2.1 AA Compliance

### Principle 1: Perceivable

#### 1.1 Text Alternatives
- **Drag handles** include `aria-hidden="true"` to hide decorative icons
- **Screen reader instructions** provide text alternatives for visual drag cues
- **Status messages** announce drag operations to assistive technologies

#### 1.3 Adaptable
- **Semantic structure** uses proper ARIA roles (`application`, `button`, `list`, `listitem`)
- **Programmatic relationships** link items to their descriptions via `aria-describedby`
- **Meaningful sequence** maintains logical tab order during drag operations

#### 1.4 Distinguishable
- **Focus indicators** provide 2px solid outline with sufficient contrast
- **Color independence** - Functionality doesn't rely solely on color
- **Visual feedback** includes opacity and transform changes during drag

### Principle 2: Operable

#### 2.1 Keyboard Accessible
- **Full keyboard support** for all drag-and-drop functionality
- **No keyboard traps** - Users can always escape from drag mode
- **Intuitive shortcuts** follow common accessibility patterns

#### 2.2 Enough Time
- **No time limits** on drag operations
- **User-controlled** timing for all interactions

#### 2.4 Navigable
- **Skip links** work properly around drag containers
- **Focus management** maintains logical order
- **Clear headings** structure drag interface content

### Principle 3: Understandable

#### 3.1 Readable
- **Clear language** in all instructions and announcements
- **Consistent terminology** across all drag operations

#### 3.2 Predictable
- **Consistent navigation** patterns throughout
- **Expected behavior** follows standard drag-and-drop conventions
- **Context changes** are announced to screen readers

#### 3.3 Input Assistance
- **Error prevention** validates drag operations
- **Clear instructions** explain keyboard controls
- **Status messages** confirm successful operations

### Principle 4: Robust

#### 4.1 Compatible
- **Valid markup** with proper ARIA implementation
- **Cross-browser** compatibility with assistive technologies
- **Progressive enhancement** when JavaScript is unavailable

## Screen Reader Support

### Tested Screen Readers

| Screen Reader | Platform | Status | Notes |
|---------------|----------|--------|-------|
| **NVDA** | Windows | ✅ Full | Complete support with announcements |
| **JAWS** | Windows | ✅ Full | Works with virtual cursor and forms mode |
| **VoiceOver** | macOS/iOS | ✅ Full | Native integration with Safari |
| **TalkBack** | Android | ✅ Full | Touch and explore mode supported |
| **Dragon** | Windows | ⚠️ Partial | Voice commands work, limited drag support |

### Screen Reader Features

#### Automatic Announcements

The package provides context-aware announcements:

```
"Item grabbed for dragging"
"Moved to position 3 of 7" 
"Item released"
"Drag operation cancelled"
"Todo item 'Buy groceries' moved from position 1 to position 3"
```

#### ARIA Live Regions

Every drag context automatically creates a polite live region:

```html
<div 
    aria-live="polite" 
    aria-atomic="true" 
    class="sr-only"
>
    <!-- Dynamic announcements appear here -->
</div>
```

#### Instruction Text

Global instructions are provided for screen reader users:

```html
<div id="drag-instructions" class="sr-only">
    Press space or enter to grab, arrow keys to move, 
    space or enter to drop, escape to cancel
</div>
```

### Screen Reader Best Practices

#### Implementation Tips

**Provide Context:**
```html
<div 
    x-drag-context="handleReorder" 
    role="list"
    aria-label="Reorderable todo list with 5 items"
>
```

**Describe Items:**
```html
<div 
    x-drag-item="{ id: 1 }" 
    role="listitem"
    aria-describedby="todo-1-details"
>
    <span id="todo-1-details">
        Priority: High. Due: Today. Assigned to: John Doe.
    </span>
</div>
```

**Announce Changes:**
```javascript
// Custom announcements
this.dispatch('item-moved', {
    message: `${item.title} moved from ${oldColumn} to ${newColumn}`
});
```

## Keyboard Navigation

### Key Bindings

| Key Combination | Action | Context |
|-----------------|--------|---------|
| `Tab` | Navigate between draggable items | Always |
| `Space` or `Enter` | Grab/release current item | On draggable item |
| `ArrowUp` / `ArrowLeft` | Move item up/left | During drag |
| `ArrowDown` / `ArrowRight` | Move item down/right | During drag |
| `Escape` | Cancel drag operation | During drag |
| `Home` | Move to first position | During drag (optional) |
| `End` | Move to last position | During drag (optional) |

### Keyboard Interaction Flow

#### 1. Navigate to Item
```
User presses Tab → Focus moves to draggable item → Visual focus indicator appears
```

#### 2. Initiate Drag
```
User presses Space/Enter → Item enters "grabbed" state → Screen reader announces
```

#### 3. Move Item
```
User presses Arrow keys → Item moves in DOM → Position announced → Visual update
```

#### 4. Drop Item
```
User presses Space/Enter → Item released → Final position announced → State reset
```

#### 5. Cancel Operation
```
User presses Escape → Drag cancelled → Item returns to original position
```

### Advanced Keyboard Features

#### Home and End Keys (Optional)

Enable quick positioning:

```javascript
// Add to your x-drag-item implementation
case 'Home':
    if (isGrabbed) {
        e.preventDefault();
        // Move to first position
        moveToPosition(0);
    }
    break;

case 'End':
    if (isGrabbed) {
        e.preventDefault();
        // Move to last position
        moveToPosition(items.length - 1);
    }
    break;
```

#### Multi-Selection Support

For advanced implementations:

```javascript
// Ctrl+Space for multi-select (future enhancement)
case ' ':
    if (e.ctrlKey) {
        e.preventDefault();
        toggleSelection();
    }
    break;
```

## ARIA Implementation

### Container Attributes

#### Drag Context

```html
<div 
    x-drag-context="handleDrop"
    role="application"
    aria-label="Drag and drop interface"
    aria-describedby="drag-help-text"
>
```

**Required Attributes:**
- `role="application"` - Indicates interactive application region
- `aria-label` - Describes the drag interface purpose

**Optional Attributes:**
- `aria-describedby` - Links to help text or instructions
- `aria-busy="true"` - During loading states

#### List Containers

```html
<div 
    x-drag-context="handleDrop"
    role="list"
    aria-label="Todo items"
    aria-describedby="list-instructions"
>
```

### Item Attributes

#### Draggable Items

```html
<div 
    x-drag-item="{ id: 1 }"
    role="listitem"
    tabindex="0"
    aria-grabbed="false"
    aria-describedby="drag-instructions item-1-details"
>
```

**Automatically Added:**
- `role="button"` - Identifies as interactive element
- `tabindex="0"` - Makes keyboard focusable
- `draggable="true"` - Enables HTML5 drag and drop
- `aria-grabbed="false"` - Indicates grab state

**State Changes:**
- `aria-grabbed="true"` - During drag operations
- `aria-pressed="true"` - When grabbed via keyboard

#### Button Elements

For drag handles or action buttons:

```html
<button 
    type="button"
    aria-label="Drag to reorder item"
    class="drag-handle"
>
    <svg aria-hidden="true"><!-- icon --></svg>
</button>
```

### Live Regions

#### Status Announcements

```html
<div 
    aria-live="polite" 
    aria-atomic="true"
    class="sr-only"
    id="drag-status"
>
    <!-- Dynamic status messages -->
</div>
```

**Configuration:**
- `aria-live="polite"` - Non-interrupting announcements
- `aria-live="assertive"` - Important/error messages
- `aria-atomic="true"` - Read entire region on change

#### Error Messages

```html
<div 
    role="alert"
    aria-live="assertive"
    class="sr-only"
    id="drag-errors"
>
    <!-- Error messages appear here -->
</div>
```

## Focus Management

### Visual Focus Indicators

#### Required Styles

```css
/* Minimum contrast ratio of 3:1 */
[x-drag-item]:focus {
    outline: 2px solid #0066cc;
    outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
    [x-drag-item]:focus {
        outline: 3px solid;
        outline-offset: 2px;
    }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
    .is-grabbing {
        transform: none;
        transition: none;
    }
}
```

#### Enhanced Focus Styles

```css
/* Custom focus with inner and outer rings */
[x-drag-item]:focus {
    outline: 2px solid #ffffff;
    box-shadow: 
        0 0 0 2px #ffffff,
        0 0 0 4px #0066cc;
}

/* Focus during drag operations */
[x-drag-item]:focus.is-grabbing {
    outline-color: #ff6600;
    box-shadow: 
        0 0 0 2px #ffffff,
        0 0 0 4px #ff6600;
}
```

### Focus Behavior

#### Tab Order Management

The package maintains logical tab order:

1. Items remain in DOM order during drag
2. Focus stays with moved item after keyboard reorder
3. Tab navigation skips non-interactive elements

#### Focus Restoration

```javascript
// Focus management during drag operations
function moveFocus(fromElement, toElement) {
    // Save current focus position
    const focusedIndex = getFocusedIndex();
    
    // Perform DOM manipulation
    moveElement(fromElement, toElement);
    
    // Restore focus to moved element
    const movedElement = getElementAtIndex(focusedIndex);
    movedElement.focus();
}
```

## Testing Guidelines

### Automated Testing

#### Accessibility Testing Tools

**Browser Extensions:**
- axe DevTools
- WAVE Web Accessibility Evaluator
- Lighthouse Accessibility Audit

**Node.js Libraries:**
```bash
npm install --save-dev @axe-core/playwright
npm install --save-dev jest-axe
```

**Example Test:**
```javascript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

test('drag and drop accessibility', async ({ page }) => {
    await page.goto('/drag-drop-test');
    await injectAxe(page);
    
    // Test initial state
    await checkA11y(page);
    
    // Test during drag operation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');
    await checkA11y(page);
});
```

### Manual Testing

#### Screen Reader Testing Checklist

**NVDA (Windows) Testing:**
- [ ] Navigate to drag items with Tab key
- [ ] Verify drag instructions are announced
- [ ] Test Space/Enter to grab items
- [ ] Use arrow keys to move items
- [ ] Confirm position announcements
- [ ] Test Escape to cancel
- [ ] Verify drop announcements

**VoiceOver (macOS) Testing:**
- [ ] Enable VoiceOver (Cmd+F5)
- [ ] Navigate with VO+Arrow keys
- [ ] Test Control+Option+Shift+Down for interaction
- [ ] Verify rotor navigation works
- [ ] Test trackpad gestures on mobile

#### Keyboard Testing Checklist

**Basic Navigation:**
- [ ] All interactive elements reachable via Tab
- [ ] Focus indicators clearly visible
- [ ] No keyboard traps in drag mode
- [ ] Tab order remains logical

**Drag Operations:**
- [ ] Space/Enter initiates drag
- [ ] Arrow keys move items
- [ ] Position changes announced
- [ ] Space/Enter completes drag
- [ ] Escape cancels operation

### User Testing

#### Recruiting Participants

**Target Users:**
- Screen reader users (primary)
- Keyboard-only users
- Users with motor disabilities
- Users with cognitive disabilities

**Testing Scenarios:**
1. First-time user learning the interface
2. Expert user performing complex reordering
3. User with slow internet connection
4. User on mobile device with screen reader

#### Testing Protocol

**Pre-Test Setup:**
- Ensure assistive technology is running
- Explain the task without revealing shortcuts
- Allow natural discovery of interactions

**Test Tasks:**
1. "Find the todo list and explore its contents"
2. "Move 'Buy groceries' to the top of the list"
3. "Reorganize items by priority"
4. "Cancel a drag operation midway through"

**Post-Test Questions:**
- Was the interface easy to understand?
- Were the keyboard shortcuts intuitive?
- Did you receive enough feedback during operations?
- What would you change about the experience?

## Common Issues and Solutions

### Issue: Screen Reader Not Announcing Changes

**Symptoms:**
- Drag operations complete silently
- Position changes not announced
- Instructions not read

**Solutions:**
```html
<!-- Ensure live region exists -->
<div 
    aria-live="polite"
    aria-atomic="true" 
    class="sr-only"
>
</div>

<!-- Verify announcements are triggered -->
<script>
function announceChange(message) {
    const liveRegion = document.querySelector('[aria-live="polite"]');
    liveRegion.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
        liveRegion.textContent = '';
    }, 1000);
}
</script>
```

### Issue: Focus Lost During Drag

**Symptoms:**
- Focus jumps to unexpected elements
- Keyboard navigation breaks
- Visual focus indicator disappears

**Solutions:**
```javascript
// Maintain focus during DOM manipulation
function preserveFocus(callback) {
    const activeElement = document.activeElement;
    const focusPath = getFocusPath(activeElement);
    
    callback();
    
    const restoredElement = findElementByPath(focusPath);
    if (restoredElement) {
        restoredElement.focus();
    }
}
```

### Issue: Mobile Screen Reader Problems

**Symptoms:**
- Touch gestures don't work
- Double-tap doesn't activate
- Explore by touch fails

**Solutions:**
```css
/* Ensure touch targets are large enough */
[x-drag-item] {
    min-height: 44px;
    min-width: 44px;
}

/* Add touch-action for better gesture support */
[x-drag-context] {
    touch-action: manipulation;
}
```

### Issue: High Contrast Mode Problems

**Symptoms:**
- Focus indicators invisible
- Drag state unclear
- Poor visual feedback

**Solutions:**
```css
/* High contrast media query */
@media (prefers-contrast: high) {
    [x-drag-item]:focus {
        outline: 3px solid;
        background: HighlightText;
        color: Highlight;
    }
    
    .is-grabbing {
        background: WindowText;
        color: Window;
    }
}

/* Windows high contrast */
@media (-ms-high-contrast: active) {
    [x-drag-item]:focus {
        outline: 2px solid windowText;
    }
}
```

## Implementation Checklist

### Development Phase

**Basic Implementation:**
- [ ] Add `x-drag-context` and `x-drag-item` directives
- [ ] Include required CSS classes (`.sr-only`, `.is-grabbing`)
- [ ] Test basic mouse drag functionality
- [ ] Verify keyboard navigation works
- [ ] Add screen reader announcements

**Enhanced Accessibility:**
- [ ] Add comprehensive ARIA labels
- [ ] Implement proper focus management
- [ ] Create detailed instruction text
- [ ] Add status announcements for all operations
- [ ] Test with multiple screen readers

**Advanced Features:**
- [ ] Support for complex data structures
- [ ] Cross-container drag and drop
- [ ] Undo/redo functionality
- [ ] Batch operations support

### Testing Phase

**Automated Testing:**
- [ ] Run accessibility audits (axe, Lighthouse)
- [ ] Test keyboard navigation programmatically
- [ ] Verify ARIA attributes are correct
- [ ] Check color contrast ratios

**Manual Testing:**
- [ ] Test with actual screen readers
- [ ] Verify keyboard-only usage
- [ ] Test on mobile devices
- [ ] Check high contrast mode

**User Testing:**
- [ ] Test with disabled users
- [ ] Gather feedback on usability
- [ ] Iterate based on real-world usage
- [ ] Document common user patterns

### Deployment Phase

**Documentation:**
- [ ] Document accessibility features
- [ ] Provide implementation examples
- [ ] Create troubleshooting guides
- [ ] Maintain compatibility matrix

**Monitoring:**
- [ ] Track accessibility metrics
- [ ] Monitor user feedback
- [ ] Update based on new standards
- [ ] Maintain cross-browser compatibility

---

**Related Documentation:**

- [Getting Started Guide](Getting-Started) - Basic implementation
- [API Reference](Api-Reference) - Technical specifications
- [Contributing Guide](Contributing) - Accessibility testing requirements