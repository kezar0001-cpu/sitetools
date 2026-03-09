# SiteSign-First Reposition Plan (Live-Safe)

## Current-state findings (from repository)

- The platform currently exposes **two live modules** (`planner`, `site-sign-in`) and several roadmap modules via one shared module registry in `lib/modules.ts`.
- Public marketing currently positions **SiteSign + SitePlan** as co-primary on both `/` and `/tools`.
- The app shell currently exposes broad navigation including dashboard, team, sites, all live modules, and planned modules.
- Core SiteSign adoption flow already exists end-to-end:
  - QR poster generation (`/print-qr/[slug]`)
  - public worker sign-in/sign-out (`/sign-in?site=...`)
  - authenticated SiteSign management dashboard (`/dashboard/site-sign-in`)
  - auth + onboarding + workspace membership bootstrap (`/login`, `/auth/post-login`, `/onboarding`)

---

## 1) SiteSign-critical components to keep active

Keep these visible and fully supported because they are directly tied to user adoption and activation for SiteSign:

1. **Authentication and account entry**
   - `/login`
   - `/auth/post-login`
   - `/onboarding`
   - `/invite/[token]`

2. **Workspace/company foundation**
   - company memberships and active-company context
   - site model + active-site selection
   - role checks used by SiteSign admin operations

3. **SiteSign core journey**
   - public sign-in endpoint: `/sign-in` (including `?site=` compatibility)
   - QR print flow: `/print-qr/[slug]`
   - SiteSign module dashboard: `/dashboard/site-sign-in`
   - visit list, filters, manual edits, sign-out controls
   - exports (CSV/XLSX/PDF)

4. **Operational support layers required by SiteSign**
   - dashboard shell + guarded app layout
   - site management page (`/dashboard/sites`) because SiteSign depends on site records and slugs
   - team/admin basics (`/dashboard/team`) only insofar as invites/roles are needed to run SiteSign in real organizations

5. **Reliability and compatibility infrastructure**
   - existing API routes used by current workflows (especially logo upload + nudge/whatsapp routes if currently live)
   - existing route compatibility behavior from homepage query forwarding (`/` with `site`/`slug` params redirects to `/sign-in`)

---

## 2) Components to keep but de-prioritize

Keep in codebase, keep routable for existing users, but move out of primary onboarding/marketing journey:

1. **SitePlan (planner) module**
   - keep route and functionality intact (`/dashboard/planner`, `/tools/planner`)
   - remove from primary hero CTA hierarchy and first-run journey

2. **Projects area**
   - `/dashboard/projects` and nested planner/project pages
   - keep available for current users; de-prioritize in default navigation order

3. **Roadmap modules marked coming-soon**
   - keep registry entries and placeholder pages
   - stop foregrounding them in launch-facing UX

4. **Free tools library**
   - retain as SEO/supporting utility, but position as secondary utility not core product

5. **CMS authoring surfaces**
   - keep for internal content operations, but do not promote from main public navigation

---

## 3) Components to hide or remove from primary UX (without deletion)

1. **Hide from primary public nav**
   - `Workspace Apps` top-level prominence
   - `CMS` public nav link
   - broad roadmap references in the first screenful

2. **Hide from primary app nav (default user role)**
   - “Planned Modules” list from main sidebar by default
   - non-SiteSign module launcher emphasis on dashboard home

3. **Feature-gate or internal-only treatment**
   - planner/project links can remain accessible by direct URL + feature flag for opted-in accounts
   - CMS admin surfaces internal-only (auth role + non-promoted links)

4. **Keep route-level compatibility**
   - do **not** remove endpoints/pages; change visibility and information architecture first

---

## 4) Recommended SiteSign-first navigation and user journey

### Public landing emphasis

1. Hero headline: SiteSign outcome-first messaging (faster gate sign-in, live headcount, export-ready compliance records).
2. Primary CTA: **Start SiteSign** (to `/tools/site-sign-in` or `/login?signup=1` depending campaign intent).
3. Secondary CTA: **Log in**.
4. Tertiary links: SitePlan / broader platform in a lower visual tier.

### First-time user flow

1. `/login?signup=1` → account creation
2. `/auth/post-login` → workspace check
3. `/onboarding` → create/join company
4. Default post-onboarding destination: **`/dashboard/site-sign-in`** (instead of generic module grid)
5. In-module checklist: create first site → print QR → collect first sign-in → export first report

### Visible app navigation (default)

- Dashboard (SiteSign summary oriented)
- SiteSign
- Sites
- Team (or “People & Access”)
- Account

Everything else (Planner, projects, roadmap modules) moved to “More” / “Explore other tools” or feature-flagged sections.

### Deferred/hidden areas

- coming-soon modules in main nav
- planner-first storytelling on homepage
- CMS from public-facing nav

---

## 5) Safe implementation plan (ordered)

### A. Zero-behavior-change cleanup (safe first)

1. Introduce a **visibility metadata layer** in `lib/modules.ts` (e.g., `primary`, `secondary`, `internal`, `roadmap`) without altering existing `href` or status behavior.
2. Add centralized navigation config helpers (public/app nav selectors) so visibility can be changed without touching route files.
3. Add telemetry/event tags for key SiteSign funnel milestones (signup, first site created, QR opened, first sign-in, first export).
4. Add/update tests for route availability and compatibility-critical redirects.

### B. Visibility/navigation changes

1. Public navbar: show SiteSign-first IA (Home, SiteSign, optional Pricing/Contact, Log in).
2. Homepage: make SiteSign the dominant product narrative and move broader platform narrative lower.
3. Dashboard home: replace “all modules launcher” first impression with SiteSign action hub.
4. Sidebar: keep SiteSign + required ops pages visible; move planner/roadmap into collapsed secondary section.

### C. Feature gating/hiding

1. Add environment flag(s), e.g.:
   - `NEXT_PUBLIC_SITESIGN_PRIMARY=true`
   - `NEXT_PUBLIC_SHOW_ROADMAP_MODULES=false`
   - `NEXT_PUBLIC_SHOW_PLANNER_PRIMARY=false`
2. Gate visibility, not route handlers.
3. Keep direct URL access for legacy users where compatibility is required.
4. Add optional per-company opt-in for Planner visibility to avoid disrupting existing customers.

### D. Later deprecation candidates (defer)

1. Public surfacing of broad roadmap modules.
2. Duplicate/overlapping module marketing blocks.
3. Legacy dashboard launcher patterns once SiteSign-first metrics stabilize.

No deletion until usage telemetry and live-link logs confirm safety.

---

## 6) Risks and safeguards

1. **Live link breakage risk**
   - Risk: removing links/pages breaks bookmarked module URLs.
   - Safeguard: keep all routes intact; if moving URLs later, use explicit 301/308 maps and monitor 404s.

2. **Sign-in compatibility risk**
   - Risk: changing `/` behavior could break QR flows that rely on query forwarding.
   - Safeguard: preserve homepage query redirect behavior to `/sign-in` for `site/slug/siteSlug/site_id` params.

3. **Auth/onboarding regression risk**
   - Risk: new defaults bypass onboarding or wrong post-login destination.
   - Safeguard: keep `/auth/post-login` membership checks and onboarding gates unchanged; only alter final destination after company setup.

4. **API/automation disruption risk**
   - Risk: hiding modules leads to premature API removal (nudge jobs, integrations, uploads).
   - Safeguard: classify APIs by live usage before any retirement; keep cron/webhook contracts stable.

5. **Role/permission confusion risk**
   - Risk: de-emphasized pages still required by admins (team/site setup).
   - Safeguard: keep admin essentials visible for privileged roles and expose direct links from SiteSign empty states.

6. **SEO and campaign drift risk**
   - Risk: mixed positioning dilutes SiteSign acquisition.
   - Safeguard: update metadata, headings, and CTA hierarchy for SiteSign-first while retaining indexable but secondary pages.

---

## 7) Explicit list of things that should NOT be changed yet

1. Do **not** delete planner or roadmap module code.
2. Do **not** remove existing routes under `/dashboard/*`, `/tools/*`, `/sign-in`, `/print-qr/*`, `/login`, `/onboarding`.
3. Do **not** alter database schema or RLS policies solely for product-positioning changes.
4. Do **not** remove current API routes, cron hooks, or webhook endpoints before usage validation.
5. Do **not** break query-param compatibility from homepage to `/sign-in`.
6. Do **not** force-migrate existing users into a new IA without fallback navigation or direct-link support.

---

## Suggested execution order (practical)

1. Instrument and baseline current funnel + route usage.
2. Ship nav visibility gating (no route changes).
3. Ship SiteSign-first homepage and dashboard ordering.
4. Roll out to a percentage / internal accounts first.
5. Monitor: signup-to-first-sign-in conversion, 404s, support tickets, and planner usage.
6. Expand rollout only after compatibility metrics are stable.
