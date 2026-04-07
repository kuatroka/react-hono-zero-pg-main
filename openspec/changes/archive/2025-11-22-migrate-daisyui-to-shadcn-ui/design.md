# Design: Migrate from DaisyUI to shadcn/ui

## Context

The project currently uses DaisyUI 5.3.7 as its component library with Tailwind CSS 4.1.14. DaisyUI provides pre-styled components through utility classes, but this approach limits customization and creates tight coupling to the library's design decisions.

shadcn/ui takes a different approach: it provides copy-paste component code built on Radix UI primitives, giving developers full control over styling and behavior. This aligns better with modern React patterns and provides better TypeScript support.

### Current DaisyUI Usage
- **ThemeSwitcher.tsx**: Uses `swap`, `swap-rotate`, `swap-on`, `swap-off` classes
- **former charts demo component**: Uses `card`, `card-body`, `card-title`, `btn`, `btn-square`, `btn-primary`, `btn-secondary`, `join-item`
- **main.tsx**: Uses `btn`, `btn-sm`, `btn-outline`, `btn-primary`, `card`, `bg-base-100`, `card-body`, `card-title`
- **repeat-button.tsx**: Uses `btn`, `btn-sm`

### Hardcoded Colors (Not Theme-Aware)
- **GlobalSearch.tsx**: Uses hardcoded colors like `bg-white`, `text-gray-900`, `border-gray-300`, `bg-blue-100`, `text-blue-800`
- **CikSearch.tsx**: Uses hardcoded colors like `bg-white`, `text-gray-900`, `border-gray-300`
- **GlobalNav.tsx**: Uses hardcoded colors like `bg-gray-800`, `text-white`
- **EntitiesList.tsx**: Uses hardcoded table colors like `bg-white`, `bg-gray-100`, `text-gray-900`, `border-gray-200`
- **CikDetail.tsx**: Uses hardcoded colors like `bg-white`, `text-gray-900`, `border-gray-200`, `text-orange-600`
- **EntityDetail.tsx**: Uses hardcoded colors like `bg-white`, `bg-gray-50`, `text-gray-900`, `border-gray-200`
- **UserProfile.tsx**: Uses hardcoded colors like `bg-white`, `text-gray-900`, `border-gray-200`

These hardcoded colors don't adapt to dark mode properly and should be replaced with CSS variable-based colors.

### Constraints
- Must maintain Tailwind CSS v4.1.14 (no downgrade)
- Must preserve existing dark/light theme functionality
- Must maintain all current UI functionality
- Zero-sync architecture must remain unchanged
- No breaking changes to application behavior

## Goals / Non-Goals

### Goals
- Replace DaisyUI with shadcn/ui as the component library
- Maintain visual consistency (or improve it)
- Preserve dark/light theme switching functionality
- Use shadcn/ui's CSS variable-based theming system
- Set up proper TypeScript path aliases for component imports
- Enable easy addition of new shadcn/ui components via CLI

### Non-Goals
- Redesigning the UI/UX (maintain current design language)
- Adding new features or functionality
- Changing the color scheme or branding
- Modifying the Zero-sync data layer
- Updating other dependencies beyond what's required

## Decisions

### 1. Use shadcn/ui with Tailwind CSS v4

**Decision**: Proceed with shadcn/ui using Tailwind CSS v4 support.

**Rationale**: 
- shadcn/ui officially supports Tailwind CSS v4 (as documented at https://ui.shadcn.com/docs/tailwind-v4)
- Project is already on Tailwind v4.1.14, no need to downgrade
- Tailwind v4 provides better performance and DX improvements

**Alternatives Considered**:
- Downgrade to Tailwind v3: Rejected because it would lose v4 benefits and require additional migration work
- Keep DaisyUI: Rejected because it doesn't provide the flexibility and control needed for future customization

### 2. CSS Variables for Theming

**Decision**: Use shadcn/ui's CSS variable-based theming system with `cssVariables: true` in components.json.

**Rationale**:
- Provides runtime theme switching without rebuilding
- Easier to customize colors and design tokens
- Better integration with dark mode
- Aligns with modern CSS practices

**Alternatives Considered**:
- Tailwind utility classes only (`cssVariables: false`): Rejected because it makes theme switching more complex and less flexible

### 3. Component Migration Strategy

**Decision**: Replace components incrementally in this order:
1. Configure shadcn/ui and install base components
2. Migrate ThemeSwitcher (smallest, isolated component)
3. Migrate repeat-button (simple button wrapper)
4. Migrate main.tsx (home page)
5. Migrate former charts demo page (most complex, uses multiple component types)
6. Migrate GlobalSearch (replace hardcoded colors with theme-aware components)
7. Migrate CikSearch (replace hardcoded colors with theme-aware components)
8. Update GlobalNav (replace hardcoded colors with CSS variables)

**Rationale**:
- Start with simplest components to validate setup
- Build confidence before tackling complex components
- Allows for testing at each step
- Minimizes risk of breaking changes

**Alternatives Considered**:
- Big bang migration: Rejected because it's riskier and harder to debug
- Keep both libraries temporarily: Rejected because it increases bundle size and creates confusion

### 4. Path Alias Configuration

**Decision**: Use `@/` as the path alias pointing to `./src` directory.

**Rationale**:
- Standard convention in shadcn/ui documentation
- Widely adopted in React/Next.js ecosystem
- Makes imports cleaner and more maintainable
- Easier to refactor file locations

**Configuration**:
```typescript
// vite.config.ts
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
}

// tsconfig.json
"paths": {
  "@/*": ["./src/*"]
}
```

### 5. Component Selection

**Decision**: Install only the components we need:
- Button (replaces `btn` classes)
- Card (replaces `card` classes)
- Input (for search fields with theme-aware styling)
- Command (for enhanced search dropdowns with keyboard navigation)
- Badge (for category tags with theme-aware colors)
- Custom theme toggle (replaces `swap` component)

**Rationale**:
- Keep bundle size minimal
- Only add components as needed
- shadcn/ui philosophy: copy what you need
- Input, Command, and Badge provide theme-aware alternatives to hardcoded colors

**Future Additions**:
- Can easily add more components via `npx shadcn-ui@latest add <component>`

### 6. Theme Toggle Implementation

**Decision**: Create a custom theme toggle button using shadcn/ui Button component with Sun/Moon icons from lucide-react.

**Rationale**:
- Simple, clean implementation
- Matches shadcn/ui patterns
- Easy to customize
- No need for complex dropdown menu for just two themes

**Implementation**:
```tsx
<Button variant="ghost" size="icon" onClick={toggleTheme}>
  {theme === "dark" ? <Moon /> : <Sun />}
</Button>
```

**Alternatives Considered**:
- shadcn/ui mode-toggle with dropdown: Rejected as overkill for just light/dark
- Switch component: Rejected because button with icon is more intuitive

## Risks / Trade-offs

### Risk: Visual Differences
**Impact**: Users may notice subtle visual changes in buttons, cards, spacing
**Mitigation**: 
- Review each component visually before/after
- Adjust shadcn/ui theme variables to match DaisyUI colors if needed
- Test in both light and dark modes

### Risk: Bundle Size Changes
**Impact**: Bundle size may increase or decrease depending on component usage
**Mitigation**:
- Only install components we actually use
- Monitor bundle size with Vite build output
- shadcn/ui components are tree-shakeable

### Risk: Breaking Theme Switching
**Impact**: Dark/light mode toggle could break during migration
**Mitigation**:
- Test theme switching after each component migration
- Ensure CSS variables are properly defined for both themes
- Verify localStorage persistence works

### Risk: TypeScript Path Alias Issues
**Impact**: Imports may fail if path aliases not configured correctly
**Mitigation**:
- Configure both vite.config.ts and tsconfig.json
- Test imports immediately after configuration
- Use explicit relative paths as fallback if needed

### Trade-off: More Code to Maintain
**Impact**: shadcn/ui components are copied into the project, not imported from node_modules
**Benefit**: Full control over component code, easier customization
**Mitigation**: Keep components in `src/components/ui/` directory, treat as library code

### Trade-off: Learning Curve
**Impact**: Team needs to learn shadcn/ui patterns and Radix UI primitives
**Benefit**: Better long-term flexibility and modern React patterns
**Mitigation**: shadcn/ui has excellent documentation and examples

## Migration Plan

### Phase 1: Setup (No Breaking Changes)
1. Install shadcn/ui CLI dependencies
2. Run `npx shadcn-ui@latest init` to create components.json
3. Configure path aliases in vite.config.ts and tsconfig.json
4. Update src/index.css with shadcn/ui base styles (keep DaisyUI temporarily)
5. Install required shadcn/ui components: Button, Card
6. Verify build succeeds with both libraries present

### Phase 2: Component Migration (Breaking Changes)
1. Migrate ThemeSwitcher.tsx
   - Create new implementation with Button and icons
   - Test theme switching works
2. Migrate repeat-button.tsx
   - Replace DaisyUI button classes with shadcn/ui Button
   - Test button interactions
3. Migrate main.tsx
   - Replace buttons and cards
   - Test home page layout
4. Migrate former charts demo component
   - Replace all buttons and cards
   - Test counter functionality and chart display

### Phase 3: Migrate Search Components (Replace Hardcoded Colors)
1. Install Input, Command, and Badge components from shadcn/ui
2. Migrate GlobalSearch.tsx
   - Replace hardcoded input with shadcn/ui Input
   - Update dropdown colors to use CSS variables
   - Replace category badges with Badge component
3. Migrate CikSearch.tsx
   - Replace hardcoded input with shadcn/ui Input
   - Update dropdown colors to use CSS variables
4. Update GlobalNav.tsx
   - Replace hardcoded colors with CSS variables
5. Test search functionality in both themes

### Phase 4: Migrate Page Components (Replace Hardcoded Colors)
1. Migrate EntitiesList.tsx
   - Replace hardcoded table colors with CSS variables
   - Update button colors to use theme variables
   - Update badge colors to use theme variables
2. Migrate CikDetail.tsx
   - Replace hardcoded colors with CSS variables
3. Migrate EntityDetail.tsx
   - Replace hardcoded colors with CSS variables
4. Migrate UserProfile.tsx
   - Replace hardcoded colors with CSS variables
5. Test all pages in both light and dark themes

### Phase 5: Cleanup
1. Remove DaisyUI from package.json
2. Remove DaisyUI plugin from tailwind.config.js
3. Remove DaisyUI imports from src/index.css
4. Search codebase for any remaining DaisyUI classes
5. Search codebase for any remaining hardcoded colors
6. Run full build and test suite
7. Visual regression testing in both themes

### Rollback Plan
If critical issues arise:
1. Revert component changes via git
2. Restore DaisyUI in package.json
3. Restore DaisyUI configuration
4. Run `bun install` to restore dependencies
5. Investigate issues before retry

## Open Questions

1. **Color Scheme**: Should we match DaisyUI's exact colors or use shadcn/ui defaults?
   - **Recommendation**: Start with shadcn/ui defaults (zinc base color), adjust if needed

2. **Additional Components**: Are there any other UI components we'll need soon?
   - **Recommendation**: Add components as needed, don't pre-install

3. **Animation Library**: Should we use `tailwindcss-animate` or `tw-animate-css` (Tailwind v4)?
   - **Recommendation**: Use `tw-animate-css` for Tailwind v4 compatibility

4. **Icon Library**: Confirm using lucide-react for icons?
   - **Recommendation**: Yes, it's the standard for shadcn/ui and has excellent React support

## Success Criteria

- [x] All DaisyUI dependencies removed
- [x] All DaisyUI classes removed from codebase
- [x] All hardcoded colors replaced with theme-aware CSS variables
- [x] Theme switching works in both light and dark modes
- [x] All buttons and cards render correctly
- [x] No visual regressions in layout or spacing
- [x] Build completes without errors
- [x] Bundle size improved (CSS reduced from 101.95 kB to 35.71 kB!)
- [x] TypeScript compilation succeeds
- [x] All existing functionality works unchanged
- [x] Search components use theme-aware colors
- [x] Table components use theme-aware colors
- [x] Detail pages use theme-aware colors
