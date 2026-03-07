# Buildstate Platform Architecture (Stage 1)

## Product positioning
Buildstate is the parent brand and platform. Individual tools (modules) are product capabilities inside Buildstate, not separate brands.

## Recommended sitemap

### Public website
- `/` — Buildstate homepage (brand + platform narrative)
- `/tools` — module overview (live + planned)
- `/tools/site-sign-in` — current live module detail page
- `/tools/[moduleId]` — future module pages marked as planned/coming soon
- `/login` — unified Buildstate authentication

### Logged-in application
- `/dashboard` — Buildstate workspace and module launcher
- `/dashboard/site-sign-in` — active Site Sign In module
- `/dashboard/[moduleId]` — placeholder page for planned modules

## Navigation model

### Public
- Primary nav: Home, Tools, Site Sign In
- Secondary CTA: Log in, Start free

### App
- Sidebar sections:
  - Platform: Dashboard
  - Live tools: Site Sign In
  - Planned modules: Diary, ITP, Inspections, Plant, Incidents, Timesheets

## Logged-in experience principles
1. Single Buildstate login.
2. Dashboard is the control centre for all modules.
3. Live modules are clearly usable; planned modules are clearly labelled.
4. Common shell persists between modules (sidebar, topbar, account controls).

## Shared domain model (for future backend expansion)
- `users`
- `companies` (contractor/subcontractor orgs)
- `memberships` (user ↔ company role)
- `projects`
- `sites` (project locations)
- `module_records` (module-specific data with shared foreign keys)

This enables cross-module context like: one company, many projects, many sites, many module workflows.

## Folder and component architecture

- `app/(public)` — marketing pages and auth
- `app/(app)` — authenticated shell
- `app/(app)/dashboard/[moduleId]` — module placeholders for non-live products
- `components/layout` — shared nav/shell components
- `components/modules` — reusable module cards and module UI blocks
- `lib/modules.ts` — single source of truth for module registry (name, status, routes, copy)

## Release strategy
1. Keep Site Sign In fully operational.
2. Keep roadmap modules visible but non-functional.
3. Add each future module behind existing app shell using `lib/modules.ts` registry.
4. Reuse shared auth, organisation context, and navigation for every module launch.
