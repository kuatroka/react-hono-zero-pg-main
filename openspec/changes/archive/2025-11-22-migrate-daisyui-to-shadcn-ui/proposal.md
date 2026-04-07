# Migrate from DaisyUI to shadcn/ui

## Why

The project currently uses DaisyUI as its component library, but shadcn/ui offers better flexibility, composability, and control over component styling. shadcn/ui provides copy-paste components built on Radix UI primitives with full TypeScript support, allowing for easier customization and better integration with modern React patterns. Additionally, shadcn/ui has official support for Tailwind CSS v4, which the project is already using.

## What Changes

- **BREAKING**: Remove DaisyUI dependency and all DaisyUI-specific classes from components
- Install and configure shadcn/ui with Tailwind CSS v4 support
- Replace DaisyUI theme system with shadcn/ui's CSS variable-based theming
- Migrate all DaisyUI components to shadcn/ui equivalents:
  - Button components (`btn`, `btn-primary`, `btn-secondary`, etc.)
  - Card components (`card`, `card-body`, `card-title`)
  - Theme switcher (`swap` component)
- Replace hardcoded color classes with theme-aware shadcn/ui components:
  - Input components for search fields
  - Command component for search dropdowns with keyboard navigation
  - Badge components for category tags
  - Proper CSS variable-based colors that adapt to light/dark themes
- Update global CSS to use shadcn/ui's design tokens
- Configure path aliases for component imports (`@/components/ui/*`)
- Set up components.json for shadcn/ui CLI

## Impact

### Affected Components
- `src/components/ThemeSwitcher.tsx` - Complete rewrite using shadcn/ui Button and icons
- `the former charts demo component` - Replace DaisyUI cards and buttons
- `src/components/GlobalSearch.tsx` - Replace hardcoded colors with theme-aware shadcn/ui components (Input, Command, Badge)
- `src/components/CikSearch.tsx` - Replace hardcoded colors with theme-aware shadcn/ui components (Input, Command, Badge)
- `src/components/GlobalNav.tsx` - Update to use shadcn/ui components for consistency
- `src/main.tsx` - Replace DaisyUI buttons and cards
- `src/repeat-button.tsx` - Replace DaisyUI button classes
- `src/pages/EntitiesList.tsx` - Replace hardcoded table colors with theme-aware CSS variables
- `src/pages/CikDetail.tsx` - Replace hardcoded colors with theme-aware CSS variables
- `src/pages/EntityDetail.tsx` - Replace hardcoded colors with theme-aware CSS variables
- `src/pages/UserProfile.tsx` - Replace hardcoded colors with theme-aware CSS variables

### Affected Configuration
- `package.json` - Remove daisyui, add shadcn/ui dependencies
- `tailwind.config.js` - Remove DaisyUI plugin, add shadcn/ui configuration
- `src/index.css` - Remove DaisyUI imports, add shadcn/ui base styles
- `vite.config.ts` - Add path alias configuration for `@/` imports
- `tsconfig.json` - Add path alias configuration

### Affected Specs
- New capability: `ui-components` - Defines UI component library standards

### User-Visible Changes
- Visual appearance may have subtle differences (button styles, card shadows, spacing)
- Theme toggle will use a different icon/interaction pattern
- All functionality remains the same, only visual presentation changes
- Dark mode continues to work with improved CSS variable-based theming

### Migration Path
1. Install shadcn/ui and configure project
2. Add required shadcn/ui components (Button, Card, Input, Command, Badge)
3. Update each component file to use new component imports
4. Migrate search components to use theme-aware colors
5. Remove DaisyUI configuration and dependencies
6. Test all UI interactions, search functionality, and theme switching
