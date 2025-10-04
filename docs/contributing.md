---
title: Contributing Guide - Livewire Drag and Drop
---

# Contributing Guide

Welcome to the ArtisanPack UI Livewire Drag and Drop project! We appreciate your interest in contributing to this accessibility-first drag-and-drop solution.

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct:

- Be respectful and inclusive
- Focus on constructive feedback
- Prioritize accessibility in all contributions
- Follow established coding standards

## Getting Started

### Development Environment

```bash
# Clone the repository
git clone https://gitlab.com/jacob-martella-web-design/artisanpack-ui/livewire-drag-and-drop.git
cd livewire-drag-and-drop

# Install dependencies
npm install

# Start development server
npm run dev
```

### Project Structure

```
livewire-drag-and-drop/
├── src/
│   └── index.js          # Main Alpine.js plugin
├── docs/
│   ├── getting-started.md
│   ├── api-reference.md
│   ├── accessibility.md
│   └── contributing.md
├── dist/                 # Built files
├── tests/               # Test files
└── examples/            # Usage examples
```

## Coding Standards

### JavaScript Standards

- Follow ArtisanPack UI JavaScript conventions
- Use WordPress Documentation Standards for JSDoc comments
- Ensure WCAG 2.1 AA compliance
- Include comprehensive error handling

### PHP Standards (Examples)

- Follow WordPress PHP Coding Standards
- Use strict types declaration
- Include proper PHPDoc blocks
- Follow PSR-12 formatting

### CSS Standards

- Use consistent naming conventions
- Include accessibility-focused styles
- Support high contrast mode
- Provide fallbacks for animations

## Submission Process

### 1. Create an Issue

Before submitting code, create an issue describing:
- The problem you're solving
- Proposed solution approach
- Accessibility considerations

### 2. Fork and Branch

```bash
# Create feature branch
git checkout -b feature/your-feature-name
```

### 3. Make Changes

- Write tests for new functionality
- Update documentation
- Ensure accessibility compliance
- Test with screen readers

### 4. Submit Merge Request

- Include detailed description
- Reference related issues
- Add accessibility testing results
- Request review from maintainers

## Testing Requirements

### Accessibility Testing

All contributions must pass:
- Screen reader testing (NVDA, VoiceOver)
- Keyboard navigation testing  
- Automated accessibility audits
- WCAG 2.1 AA compliance checks

### Browser Testing

Test across:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Documentation

Update relevant documentation:
- API changes require documentation updates
- New features need usage examples
- Accessibility features must be documented

---

Thank you for contributing to accessible web experiences!