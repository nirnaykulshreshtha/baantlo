# Baant Lo Admin

Modern admin control panel for the Baant Lo platform, built with Next.js App Router and shadcn/ui. The goal of this codebase is to provide a production-ready experience for platform operators so that day-to-day moderation, support, and analytics workflows can run without leaving the browser.

## Highlights

- **Role-aware layout** – authenticated administrators get a sidebar with contextual navigation, breadcrumbs, and quick actions.
- **Real backend data** – all dashboards and management tables read directly from the FastAPI backend via the `/api/v1/admin/*` endpoints.
- **Modular domains** – independent pages for groups, friend invites, friendships, and group members with filterable tables.
- **Server-first data fetching** – Next.js server components hydrate with `serverApiFetch`, keeping secrets off the client while supporting streaming UI.
- **Polished UI primitives** – built on shadcn/ui, lucide icons, and a responsive card/table system that adapts cleanly from mobile to desktop.

## Local development

```bash
npm install
npm run dev
```

The admin app is available at [http://localhost:3000](http://localhost:3000). The Next.js dev server proxies API requests through `/api/proxy` so the browser never talks to the backend directly.

### Environment

The app relies on the same session cookies issued by the main Baant Lo stack. Ensure the backend is running and that the `.env.local` file matches the rest of the monorepo (see `apps/backend` for the canonical variables).

## Key routes

| Route | Purpose |
| --- | --- |
| `/admin` | Multi-metric dashboard with live group, invite, and friendship numbers plus recent activity snapshots. |
| `/admin/groups` | Filterable grid of all groups (owner, currency, archival state). |
| `/admin/friend-invites` | Audit trail of invite traffic with status filters and timestamps. |
| `/admin/friendships` | Overview of user-to-user connections, highlighting pending approvals. |
| `/admin/group-members` | Per-group membership roster with role and status drill-down. |

Non-admin users continue to land on `/dashboard` (user-focused experience) while admins are redirected to `/admin` after login.

## Code structure

```
src/
  app/                # Next.js App Router routes
    (admin)/admin     # Admin dashboard and management pages
  components/         # Layout primitives, tables, forms, and widgets
  lib/                # Client/shared utilities (branding, navigation, RBAC)
  server/             # Server-only data access helpers
```

Data access for admin pages lives in `src/server/admin` and wraps all calls to the FastAPI backend. This enforces consistent logging, error handling, and type-safety for every route.

## Testing & linting

- `npm run lint` – checks TypeScript, unused imports, and React rules. The legacy codebase still throws warnings/errors; address them iteratively as part of feature work.
- `npm run test` – runs the Vitest suite (currently focused on domain utilities). Add regression coverage alongside new modules when possible.

## Next steps

- Extend admin summaries with trend analysis once aggregate endpoints exist on the backend.
- Introduce TanStack Query for richer client-side caching on heavily-interactive tables.
- Add meaningful Vitest coverage for the admin data transformers in `src/server/admin`.

