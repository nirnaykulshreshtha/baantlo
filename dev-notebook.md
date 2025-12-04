## 2025-01-XX — Monorepo Architecture Migration

- **Monorepo Structure**: Migrated backend to monorepo architecture for better code organization and shared package management.
  - **Root Structure**:
    - `apps/` - Contains all applications (frontend, backend, future mobile apps)
      - `apps/baantlo/` - Next.js frontend application
      - `apps/backend/` - FastAPI Python backend application
    - `packages/` - Shared packages for cross-app utilities (types, configs, shared libraries)
    - Root `package.json` - Workspace configuration for npm workspaces
  
  - **Benefits**:
    - Single source of truth for dependencies
    - Shared packages for types, utilities, and configurations
    - Unified development workflow
    - Easier code sharing between frontend and backend
    - Simplified CI/CD pipeline
  
  - **Workspace Configuration**:
    - Root `package.json` defines workspaces: `["apps/*", "packages/*"]`
    - Each app maintains its own `package.json` (frontend) or `pyproject.toml` (backend)
    - Shared packages can be created in `packages/` for cross-cutting concerns
  
  - **Docker Configuration**:
    - Updated `docker-compose.dev.yml` and `docker-compose.prod.yml` to reference `apps/backend` instead of `backend/`
    - All build contexts and volume mounts updated to new paths
    - Environment file paths updated to `apps/backend/.env.example`
  
  - **Development Commands**:
    - `npm run dev` - Start frontend dev server
    - `npm run dev:backend` - Start backend dev server
    - `npm run dev:frontend` - Alias for frontend dev server
    - `make up` - Start all services via Docker Compose
    - `make reup` - Restart services with rebuild
  
  - **Key Files**:
    - Root `package.json` - Workspace configuration
    - `docker-compose.dev.yml` - Development Docker configuration
    - `docker-compose.prod.yml` - Production Docker configuration
    - `Makefile` - Development commands (unchanged, works with new paths)
  
  - **Design Principles**:
    - **Separation of Concerns**: Each app is self-contained with its own dependencies
    - **Shared Resources**: Common utilities, types, and configs live in `packages/`
    - **Consistent Structure**: All apps follow the same directory pattern under `apps/`
    - **Scalability**: Easy to add new apps (mobile, admin panels, etc.) without restructuring

## 2025-01-XX — User Dashboard Design for Expense Splitting Application

- **Dashboard Philosophy - Less is More**:
  - **Single Purpose**: Dashboard answers one question: "Who owes me money and who do I owe?"
  - **Action-Oriented**: Prominent quick actions for common tasks (Create Expense, Settle Up)
  - **No Clutter**: Removed unnecessary metrics, activity feeds, and groups overview
  - **Focused Layout**: Only shows what's essential - quick actions, net balance, and balance breakdown
  - **Conditional Display**: Features appear based on user state (groups exist, balances exist, etc.)

- **Simplified Layout Structure** (`apps/baantlo/app/(user)/dashboard/page.tsx`):
  - **Header with Quick Actions**: 
    - "Add Expense" button (primary, shown if user has groups)
    - "Create Group" button (shown if no groups exist)
    - "Settle Up" button (shown if user owes money)
  - **Net Balance Card**: Large, prominent display of the most important number (they owe you / you owe)
  - **Balance Breakdown Table**: Core feature showing who owes what by friend/counterparty with quick "Settle Up" actions
  - **Pending Settlements**: Conditional card with "Review" button (only if pending settlements exist)
  - **Empty State**: Helpful onboarding card when user has no groups yet

- **Design Principles**:
  - **Simplicity First**: Users don't need to see everything at once
  - **Progressive Disclosure**: Additional info (activity, groups, trends) accessible via navigation
  - **Actionable**: Every element on the dashboard serves a clear purpose
  - **Empty States**: Helpful guidance when no data exists yet
  - **Responsive**: Clean single-column layout that works on all devices

- **What Was Removed and Why**:
  - **4 Metric Cards**: Too much information at once - net balance is the only number that matters
  - **Activity Feed**: Can be accessed via navigation when needed, not essential for dashboard
  - **Groups Overview**: Groups are accessible via navigation, no need to duplicate on dashboard
  - **Pending Actions Panel**: Redundant with balance breakdown and pending settlements
  - **Upcoming Settlements List**: Not essential for daily use, can be a separate page

- **Key Features Added**:
  - **Quick Actions Bar**: Prominent buttons in header for primary actions
    - "Add Expense" (primary button, shown when groups exist)
    - "Create Group" (shown when no groups exist)
    - "Settle Up" (shown when user owes money)
  - **Balance Breakdown Actions**: Each balance row has a quick "Settle Up" button linking to settlement creation
  - **Pending Settlements Action**: "Review" button on pending settlements card
  - **Empty State**: Onboarding card with "Create Your First Group" CTA when no groups exist

- **Key Files**:
  - `apps/baantlo/app/(user)/dashboard/page.tsx` - Simplified dashboard layout with quick actions
  - `apps/baantlo/components/dashboard/balance-breakdown.tsx` - Balance breakdown table with quick settle actions
  - `apps/baantlo/lib/dashboard/api.ts` - Dashboard data fetching
  - `apps/baantlo/lib/dashboard/schema.ts` - Type definitions for dashboard data

- **Routes Referenced** (to be implemented):
  - `/groups/new` - Create new group
  - `/groups/new/expense` - Create new expense (needs group selection)
  - `/settlements/new` - Create new settlement
  - `/settlements/new?user_id=...` - Create settlement with pre-filled user
  - `/settlements` - View all settlements

- **Available Components (Not Used on Dashboard)**:
  - `stats-cards.tsx`, `pending-actions.tsx`, `upcoming-settlements.tsx`, `activity-feed.tsx`, `groups-overview.tsx`
  - These components exist and can be used on dedicated pages (e.g., `/activity`, `/groups`, `/analytics`)
  - Keeps dashboard focused while providing rich features elsewhere

## 2025-11-06 — Token Refresh Error Handling and UX Improvements

- **Token Refresh Race Condition Fix**:
  - Fixed race condition in `apps/baantlo/lib/auth/token-refresh.ts` where concurrent refresh attempts with the same token would cause 401 errors
  - Implemented token-specific deduplication using a Map to track in-flight refreshes per refresh token
  - Added result caching (5-second TTL) to handle rapid successive refresh calls
  - Double-check pattern prevents race conditions between check and set operations
  - Backend improvements: Enhanced logging in `apps/backend/app/api/v1/endpoints/auth.py` to better diagnose concurrent refresh attempts

- **Session Error Handler Component** (`apps/baantlo/components/auth/session-error-handler.tsx`):
  - Client component that monitors `session.error` from NextAuth
  - Automatically detects critical session errors (token_expired_or_revoked, missing_refresh_token, etc.)
  - Shows user-friendly toast notifications using Sonner toast library
  - Automatically signs out and redirects users to login page after 3 seconds for critical errors
  - Provides "Sign In" action button in toast for immediate redirect
  - Prevents duplicate error handling by tracking previous error state
  - Integrated into `SessionProvider` to monitor all authenticated sessions globally

- **Toast Integration**:
  - Added `Toaster` component from Sonner to root layout (`apps/baantlo/app/layout.tsx`)
  - Configured with theme-aware icons and styling
  - Provides non-intrusive error notifications that don't block user workflow

- **Design principles**:
  - Automatic error detection: No manual error checking needed in components
  - User-friendly messaging: All errors mapped to clear, actionable messages
  - Graceful degradation: Critical errors trigger automatic sign-out, non-critical errors show toast only
  - Prevents duplicate handling: Uses refs to track error state and prevent multiple toasts

- **Key files**:
  - `apps/baantlo/components/auth/session-error-handler.tsx` - Error monitoring component
  - `apps/baantlo/components/ui/providers/session-provider.tsx` - Enhanced with error handler
  - `apps/baantlo/lib/auth/token-refresh.ts` - Improved deduplication logic
  - `backend/app/api/v1/endpoints/auth.py` - Enhanced logging for refresh endpoint

## 2025-11-05 — Shared utilities, accessibility, and loading polish

- **Preference utilities**: Consolidated layout/theme preference logic under `apps/baantlo/lib/preferences/` with a reusable cookie helper (`internal/cookie-preference.ts`) to eliminate duplicated validation and exports (`layout-actions.ts`, `theme-actions.ts`, `theme-variant-actions.ts`).
- **Skip Navigation & Accessibility**:
  - Added global skip link in `apps/baantlo/app/layout.tsx` targeting a shared `#main-content` landmark across shells and pages.
  - Ensured primary content regions in `HorizontalAppShell`, `VerticalAppShell`, homepage, and loading fallbacks expose `id="main-content"` with focus management for keyboard users.
  - Enhanced selection controls (`LayoutSelectorVisual`, `ThemeSelectorVisual`, `ThemeVariantSelectorVisual`) with `aria-pressed`/`aria-busy` semantics for assistive feedback.
  - Primary navigation receives clear labelling via `aria-label` updates (`TopNavigation`, horizontal shell wrappers) and tiered nav wrappers.
- **Consistent loading states**: Introduced skeleton-based fallbacks for the `(user)` group and settings routes (`app/(user)/loading.tsx`, `app/(user)/settings/loading.tsx`, `app/(user)/settings/appearance/loading.tsx`) to provide responsive feedback during streaming states.

## 2025-01-XX — Dynamic Breadcrumbs and Brand Name Configuration

- **Dynamic Breadcrumbs Component** (`apps/baantlo/components/common/dynamic-breadcrumbs.tsx`):
  - Automatically generates breadcrumbs from the current route pathname using `usePathname()` hook
  - Intelligent label formatting: converts URL segments (kebab-case, camelCase, underscores) to human-readable labels
  - Uses brand name from `NEXT_PUBLIC_BRAND_NAME` environment variable as the home breadcrumb
  - Supports optional props: `brandName` (override), `className`, and `showHome` (toggle home breadcrumb)
  - Positioned perfectly in horizontal layout between navigation and content for optimal UX
  - Includes aggressive logging for debugging purposes

- **Horizontal Layout Integration**:
  - Added `DynamicBreadcrumbs` component to `HorizontalAppShell` in the main content area
  - Positioned between the navigation tier and page content for clear visual hierarchy
  - Breadcrumbs are responsive and adapt to different screen sizes

- **Brand Name Configuration**:
  - Added `NEXT_PUBLIC_BRAND_NAME` environment variable support
  - Created `.env.local` file with brand name: "Baant Lo"
  - Created `.env.example` file for documentation and team reference
  - Updated `SidebarBrand` component to use environment variable as default
  - Brand name is now centrally managed and consistent across breadcrumbs and brand components
  - Fallback value: "Baant Lo" if environment variable is not set

- **Design principles**:
  - Single source of truth: Brand name comes from environment variable
  - Dynamic generation: Breadcrumbs automatically adapt to any route structure
  - User-friendly labels: URL segments are intelligently formatted for readability
  - Consistent positioning: Breadcrumbs appear in the same location across all horizontal layout pages

- **Skip Navigation & Accessibility**:
  - Added global skip link in `apps/baantlo/app/layout.tsx` targeting a shared `#main-content` landmark across shells and pages.
  - Ensured primary content regions in `HorizontalAppShell`, `VerticalAppShell`, homepage, and loading fallbacks expose `id="main-content"` with focus management for keyboard users.
  - Enhanced selection controls (`LayoutSelectorVisual`, `ThemeSelectorVisual`, `ThemeVariantSelectorVisual`) with `aria-pressed`/`aria-busy` semantics for assistive feedback.
  - Primary navigation receives clear labelling via `aria-label` updates (`TopNavigation`, horizontal shell wrappers) and tiered nav wrappers.
  - Introduced loading skeletons for the `(user)` group and settings routes (`app/(user)/loading.tsx`, `app/(user)/settings/loading.tsx`, `app/(user)/settings/appearance/loading.tsx`) to provide consistent visual feedback during streaming states.

## 2025-01-XX — Theme Variant System

- **Theme Variants**: Added support for multiple theme variants (default, natural, bubblegum, majestic) that modify the color palette while maintaining the base light/dark theme system.
- **Majestic Palette Refresh (2025-11-05)**: Updated regal hues to a violet, amber, and jade triad to improve contrast and align the UI preview swatches with the CSS tokens (`primary: oklch(0.48, 0.24, 305)`, `secondary: oklch(0.88, 0.12, 90)`, `accent: oklch(0.78, 0.17, 150)`).
- **Storage**: Theme variant preferences are stored in cookies via `apps/baantlo/lib/preferences/theme-variant-actions.ts`, similar to theme and layout preferences.
- **CSS Implementation**: Variants are applied via `data-theme-variant` attribute on the HTML element, with CSS variable overrides in `apps/baantlo/app/globals.css`:
  - `[data-theme-variant="natural"]` - Earthy green tones for primary and accent colors
  - `[data-theme-variant="bubblegum"]` - Playful pink/purple tones for primary and accent colors
  - Default variant uses base colors (no overrides needed)
- **Component**: Created `ThemeVariantSelector` component (`apps/baantlo/components/settings/theme-variant-selector.tsx`) that allows users to switch variants with immediate DOM updates.
- **Integration**: Variant selector is displayed in the Appearance settings page alongside theme and layout selectors.
- **Root Layout**: Root layout (`apps/baantlo/app/layout.tsx`) reads and applies the variant preference via `data-theme-variant` attribute on the HTML element.
- **Extensibility**: New variants can be easily added by:
  1. Adding the variant to `ThemeVariant` type in `apps/baantlo/lib/preferences/theme-variant.ts`
  2. Adding CSS variable overrides in `globals.css` for both light and dark modes
  3. Adding an option to `themeVariantOptions` array
- **Design principles**:
  - Variants are independent of theme mode (light/dark) - each variant works with both
  - CSS variables are scoped using attribute selectors for clean separation
  - Client-side component handles immediate DOM updates for instant feedback
  - Server-side preference is read on initial render for SSR compatibility

## 2025-10-?? — Multi-layout application shells

- Introduced shared navigation contract in `apps/baantlo/lib/navigation/` so horizontal and vertical shells consume a single dataset.
- Added logging utilities in `apps/baantlo/lib/logging.ts` to keep aggressive diagnostics consistent.
- Created `HorizontalAppShell` and `VerticalAppShell` under `apps/baantlo/components/layouts` to support top-nav and sidebar experiences, respectively.
- Wired new route groups `app/(shell-horizontal)` and `app/(shell-vertical)` with demo pages to validate each layout while keeping URLs tidy (`/horizontal`, `/vertical`).
- Home page now advertises both shells, guiding future contributors toward the correct scaffolding entry points.
- Added dedicated settings workspace experience: `SettingsShell` + `SettingsSidebar` under `apps/baantlo/components/layouts/settings` with nested navigation and logging.
- Centralized settings links in `apps/baantlo/lib/settings-navigation.ts`; both layout components and main navigation hydrate from this single dataset.
- Nested settings route group (`app/(shell-vertical)/settings`) ships shared layout, sidebar, and sample pages (`general`, `profile`, `security`, `billing`, `usage`) to demonstrate secondary navigation flows.
- Introduced cookie-backed layout preference (`apps/baantlo/lib/preferences/layout.ts` + `apps/baantlo/lib/preferences/layout-actions.ts`) with a global switcher component so any page can toggle between vertical and horizontal shells without rerouting.
- Root layout (`apps/baantlo/app/layout.tsx`) now reads the stored preference and injects the switcher into both `HorizontalAppShell` and `VerticalAppShell`; route-group layouts defer to this global chrome to avoid duplication.

## 2025-01-XX — Refactored layout components for reusability

- **Extracted navigation data**: Created `apps/baantlo/lib/navigation-data.ts` as single source of truth for all navigation items, user data, and menu configurations. This ensures consistency across vertical and horizontal layouts.

- **Refactored NavMain component** (`apps/baantlo/components/common/nav-main.tsx`):
  - Added `variant` prop to support both "vertical" (sidebar) and "horizontal" (top nav) rendering modes
  - Vertical mode uses Sidebar components with collapsible sub-items
  - Horizontal mode uses NavigationMenu components with dropdown menus
  - Both modes share the same navigation data structure

- **Refactored NavUser component** (`apps/baantlo/components/common/nav-user.tsx`):
  - Added `variant` prop for vertical (sidebar) and horizontal (header) contexts
  - Uses `useIsMobile` hook instead of `useSidebar` to avoid context dependency issues
  - Extracted shared dropdown content into `UserDropdownContent` helper
  - Horizontal variant renders as a Button with avatar, vertical variant uses SidebarMenuButton

- **Created SidebarBrand component** (`apps/baantlo/components/common/sidebar-brand.tsx`):
  - Reusable brand/logo component for both sidebar and header
  - Supports `compact` mode for horizontal layouts
  - Can be customized with name, subtitle, and href props

- **Updated AppSidebar** (`apps/baantlo/components/layouts/vertical/app-sidebar.tsx`):
  - Now uses shared `defaultNavigationData` from `navigation-data.ts`
  - Composes SidebarBrand, NavMain, and NavUser components
  - Accepts optional `navigationData` prop for customization

- **Updated VerticalAppShell** (`apps/baantlo/components/layouts/vertical/vertical-app-shell.tsx`):
  - Uses refactored AppSidebar with shared navigation data
  - Accepts optional `navigationData` prop for consistency
  - Removed hardcoded demo content, now renders children directly

- **Updated HorizontalAppShell** (`apps/baantlo/components/layouts/horizontal/horizontal-app-shell.tsx`):
  - Implemented two-tiered horizontal layout:
    - **Tier 1**: Brand/logo (left), Primary navigation (center), User menu (right)
    - **Tier 2**: Main navigation items with sub-menus (horizontal NavMain)
  - Uses same shared navigation data as vertical layout
  - Both tiers are sticky for persistent navigation

- **Design principles**:
  - Single source of truth: All navigation data comes from `navigation-data.ts`
  - Component reusability: NavMain, NavUser, and SidebarBrand work in both layouts
  - Type safety: Shared types ensure consistency (NavigationItem, UserData, etc.)
  - Variant-based rendering: Components adapt based on `variant` prop
  - No code duplication: Shared logic extracted into reusable components

- **Key files structure**:
  - `lib/navigation/data.ts` - Navigation data definitions and types
  - `components/common/nav-main.tsx` - Flexible navigation component
  - `components/common/nav-user.tsx` - User menu component
  - `components/common/sidebar-brand.tsx` - Brand/logo component
  - `components/layouts/vertical/app-sidebar.tsx` - Vertical sidebar composition
  - `components/layouts/vertical/vertical-app-shell.tsx` - Vertical layout shell
  - `components/layouts/horizontal/horizontal-app-shell.tsx` - Two-tiered horizontal layout shell

