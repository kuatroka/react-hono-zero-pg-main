# Implementation Tasks: Migrate from DaisyUI to shadcn/ui

## 1. Setup and Configuration

- [x] 1.1 Install required dependencies
  - [x] 1.1.1 Install `@types/node` for path resolution
  - [x] 1.1.2 Install `lucide-react` for icons
  - [x] 1.1.3 Install `tw-animate-css` for Tailwind v4 animations
- [x] 1.2 Configure path aliases
  - [x] 1.2.1 Update `vite.config.ts` to add `@/` alias pointing to `./src`
  - [x] 1.2.2 Update `tsconfig.json` to add path mapping for `@/*`
  - [x] 1.2.3 Update `tsconfig.app.json` to add path mapping for `@/*`
- [x] 1.3 Initialize shadcn/ui
  - [x] 1.3.1 Run `npx shadcn-ui@latest init` with appropriate options
  - [x] 1.3.2 Verify `components.json` is created with correct configuration
  - [x] 1.3.3 Verify `src/lib/utils.ts` is created
- [x] 1.4 Update global CSS
  - [x] 1.4.1 Update `src/index.css` to add shadcn/ui base styles and CSS variables
  - [x] 1.4.2 Keep DaisyUI imports temporarily for gradual migration
  - [x] 1.4.3 Add light and dark theme CSS variables
- [x] 1.5 Install shadcn/ui components
  - [x] 1.5.1 Install Button component: `npx shadcn-ui@latest add button`
  - [x] 1.5.2 Install Card component: `npx shadcn-ui@latest add card`
  - [x] 1.5.3 Install Input component: `npx shadcn-ui@latest add input`
  - [x] 1.5.4 Install Command component: `npx shadcn-ui@latest add command`
  - [x] 1.5.5 Install Badge component: `npx shadcn-ui@latest add badge`
- [x] 1.6 Verify setup
  - [x] 1.6.1 Run `bun run build` to ensure no errors
  - [x] 1.6.2 Run `bun run dev` to ensure dev server starts
  - [x] 1.6.3 Verify TypeScript compilation succeeds

## 2. Component Migration

### 2.1 Migrate ThemeSwitcher Component
- [x] 2.1.1 Create new `ThemeSwitcher.tsx` using shadcn/ui Button
- [x] 2.1.2 Import `Moon` and `Sun` icons from lucide-react
- [x] 2.1.3 Implement theme toggle logic with `dark` class on documentElement
- [x] 2.1.4 Update localStorage key to `ui-theme` or similar
- [x] 2.1.5 Test theme switching in browser
- [x] 2.1.6 Verify theme persists on page reload

### 2.2 Migrate repeat-button Component
- [x] 2.2.1 Update imports to use `@/components/ui/button`
- [x] 2.2.2 Replace DaisyUI `btn` classes with shadcn/ui Button component
- [x] 2.2.3 Map `btn-sm` to Button `size="sm"`
- [x] 2.2.4 Preserve existing onMouseDown and repeat functionality
- [x] 2.2.5 Test button interactions and repeat behavior

### 2.3 Migrate main.tsx
- [x] 2.3.1 Import Button and Card from shadcn/ui
- [x] 2.3.2 Replace all `btn` elements with Button components
- [x] 2.3.3 Map button variants:
  - [x] `btn-outline` → `variant="outline"`
  - [x] `btn-primary` → `variant="default"`
  - [x] `btn-sm` → `size="sm"`
- [x] 2.3.4 Replace card elements with Card components
  - [x] `card` → `<Card>`
  - [x] `card-body` → `<CardContent>`
  - [x] `card-title` → `<CardTitle>`
- [x] 2.3.5 Remove `bg-base-100` classes (handled by Card component)
- [x] 2.3.6 Test home page layout and interactions

### 2.4 Migrate former charts demo page Component
- [x] 2.4.1 Import Button and Card from shadcn/ui
- [x] 2.4.2 Replace all card elements with Card components
- [x] 2.4.3 Replace all button elements with Button components
- [x] 2.4.4 Map button variants:
  - [x] `btn-primary` → `variant="default"`
  - [x] `btn-secondary` → `variant="secondary"`
  - [x] `btn-square` → custom className or adjust size
  - [x] `join-item` → custom layout with flex
- [x] 2.4.5 Adjust spacing and layout as needed
- [x] 2.4.6 Test counter increment/decrement
- [x] 2.4.7 Test user counter functionality
- [x] 2.4.8 Test chart display and interactions

### 2.5 Migrate GlobalSearch Component
- [x] 2.5.1 Import Input, Command, and Badge from shadcn/ui
- [x] 2.5.2 Replace hardcoded input with shadcn/ui Input component
- [x] 2.5.3 Replace hardcoded dropdown with Command component (or keep custom with theme-aware colors)
- [x] 2.5.4 Replace hardcoded category badges with Badge component
- [x] 2.5.5 Update all color classes to use CSS variables (e.g., `bg-background`, `text-foreground`)
- [x] 2.5.6 Test search functionality and keyboard navigation
- [x] 2.5.7 Test in both light and dark themes

### 2.6 Migrate CikSearch Component
- [x] 2.6.1 Import Input, Command, and Badge from shadcn/ui
- [x] 2.6.2 Replace hardcoded input with shadcn/ui Input component
- [x] 2.6.3 Replace hardcoded dropdown with theme-aware colors
- [x] 2.6.4 Update all color classes to use CSS variables
- [x] 2.6.5 Test search functionality and keyboard navigation
- [x] 2.6.6 Test in both light and dark themes

### 2.7 Update GlobalNav Component
- [x] 2.7.1 Verify no DaisyUI classes are used (currently uses plain Tailwind)
- [x] 2.7.2 Update hardcoded colors to use CSS variables (e.g., `bg-gray-800` → `bg-background`)
- [x] 2.7.3 Optionally enhance with shadcn/ui components for consistency
- [x] 2.7.4 Test navigation links and layout in both themes

### 2.8 Migrate EntitiesList Component
- [x] 2.8.1 Replace hardcoded table colors with theme-aware CSS variables
- [x] 2.8.2 Update heading colors (`text-gray-900` → `text-foreground`)
- [x] 2.8.3 Update button colors to use primary/secondary theme colors
- [x] 2.8.4 Update table background (`bg-white` → `bg-card`)
- [x] 2.8.5 Update table header colors (`bg-gray-100` → `bg-muted/50`)
- [x] 2.8.6 Update table borders (`border-gray-200` → `border-border`)
- [x] 2.8.7 Update table row hover (`hover:bg-gray-50` → `hover:bg-muted/50`)
- [x] 2.8.8 Update link colors (`text-blue-600` → `text-primary`)
- [x] 2.8.9 Update badge colors to use theme variables
- [x] 2.8.10 Update text colors (`text-gray-600` → `text-muted-foreground`)
- [x] 2.8.11 Test table display in both light and dark themes

### 2.9 Migrate CikDetail Page
- [x] 2.9.1 Update error message colors (`text-gray-500` → `text-muted-foreground`)
- [x] 2.9.2 Update link colors (`text-blue-600` → `text-primary`)
- [x] 2.9.3 Update card background (`bg-white` → `bg-card`)
- [x] 2.9.4 Update borders (`border-gray-200` → `border-border`)
- [x] 2.9.5 Update heading colors (`text-gray-900` → `text-foreground`)
- [x] 2.9.6 Update text colors (`text-gray-800` → `text-foreground`)
- [x] 2.9.7 Update warning colors (`text-orange-600` → `text-destructive`)

### 2.10 Migrate EntityDetail Page
- [x] 2.10.1 Update loading message colors (`text-gray-500` → `text-muted-foreground`)
- [x] 2.10.2 Update link colors (`text-blue-600` → `text-primary`)
- [x] 2.10.3 Update card background (`bg-white` → `bg-card`)
- [x] 2.10.4 Update borders (`border-gray-200` → `border-border`)
- [x] 2.10.5 Update heading colors (`text-gray-900` → `text-foreground`)
- [x] 2.10.6 Update badge colors to use theme variables
- [x] 2.10.7 Update info box backgrounds (`bg-gray-50` → `bg-muted/50`)
- [x] 2.10.8 Update label colors (`text-gray-600` → `text-muted-foreground`)
- [x] 2.10.9 Update text colors (`text-gray-800` → `text-foreground`)

### 2.11 Migrate UserProfile Page
- [x] 2.11.1 Update heading colors (`text-gray-900` → `text-foreground`)
- [x] 2.11.2 Update card background (`bg-white` → `bg-card`)
- [x] 2.11.3 Update borders (`border-gray-200` → `border-border`)
- [x] 2.11.4 Update text colors (`text-gray-600` → `text-muted-foreground`)

## 3. Cleanup and Removal

- [x] 3.1 Remove DaisyUI configuration
  - [x] 3.1.1 Remove DaisyUI plugin from `tailwind.config.js`
  - [x] 3.1.2 Remove DaisyUI themes configuration
  - [x] 3.1.3 Remove DaisyUI imports from `src/index.css`
  - [x] 3.1.4 Remove `@plugin "daisyui"` directive from CSS
- [x] 3.2 Remove DaisyUI dependency
  - [x] 3.2.1 Remove `daisyui` from `package.json` dependencies
  - [x] 3.2.2 Run `bun install` to update lockfile
- [x] 3.3 Search for remaining DaisyUI classes
  - [x] 3.3.1 Run `rg "btn-|card-|swap-|bg-base-" src/` to find any remaining classes
  - [x] 3.3.2 Remove or replace any found instances
- [x] 3.4 Update tailwind.config.js for shadcn/ui
  - [x] 3.4.1 Ensure `darkMode: ["class"]` is set
  - [x] 3.4.2 Verify content paths include all component files
  - [x] 3.4.3 Add any custom theme extensions if needed

## 4. Testing and Validation

- [x] 4.1 Visual testing
  - [x] 4.1.1 Test home page (main.tsx) in light mode
  - [x] 4.1.2 Test home page in dark mode
  - [x] 4.1.3 Test counter page in light mode
  - [x] 4.1.4 Test counter page in dark mode
  - [x] 4.1.5 Test all entities page
  - [x] 4.1.6 Verify theme switcher icon changes
- [x] 4.2 Functional testing
  - [x] 4.2.1 Test theme toggle switches correctly
  - [x] 4.2.2 Test theme persists on page reload
  - [x] 4.2.3 Test counter increment/decrement
  - [x] 4.2.4 Test user counter (login required)
  - [x] 4.2.5 Test repeat button hold-to-repeat functionality
  - [x] 4.2.6 Test all navigation links
  - [x] 4.2.7 Test search functionality
- [x] 4.3 Build validation
  - [x] 4.3.1 Run `bun run build` successfully
  - [x] 4.3.2 Check bundle size (compare with previous build)
  - [x] 4.3.3 Run `bun run lint` successfully
  - [x] 4.3.4 Verify no TypeScript errors
- [x] 4.4 Cross-browser testing
  - [x] 4.4.1 Test in Chrome/Edge
  - [x] 4.4.2 Test in Firefox
  - [x] 4.4.3 Test in Safari (if available)

## 5. Documentation

- [x] 5.1 Update project documentation
  - [x] 5.1.1 Update `openspec/project.md` to reflect shadcn/ui usage
  - [x] 5.1.2 Update README.md if it mentions DaisyUI
  - [x] 5.1.3 Document how to add new shadcn/ui components
- [x] 5.2 Update CHANGELOG
  - [x] 5.2.1 Add entry for DaisyUI to shadcn/ui migration
  - [x] 5.2.2 Note any breaking changes or visual differences

## 6. Final Verification

- [x] 6.1 Code review checklist
  - [x] 6.1.1 No DaisyUI imports remain
  - [x] 6.1.2 No DaisyUI classes remain in JSX
  - [x] 6.1.3 All components use shadcn/ui or plain Tailwind
  - [x] 6.1.4 Path aliases work correctly
  - [x] 6.1.5 Theme switching works in all components
- [x] 6.2 Performance check
  - [x] 6.2.1 Verify page load times are acceptable
  - [x] 6.2.2 Verify no console errors or warnings
  - [x] 6.2.3 Check bundle size is reasonable (reduced from 101.95 kB to 35.71 kB CSS!)
- [x] 6.3 Accessibility check
  - [x] 6.3.1 Verify buttons have proper aria labels
  - [x] 6.3.2 Verify theme toggle is keyboard accessible
  - [x] 6.3.3 Verify cards have proper semantic structure
