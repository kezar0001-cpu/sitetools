# Buildstate Planner — Module Design + Implementation Blueprint

## 1) Module definition + naming recommendation
**Recommended module name: `Buildstate Planner`.**

Why this is strongest for MVP:
- Clear for field + office users (everyone understands “planner”).
- Broad enough to cover both programme creation and daily tracking.
- Avoids over-formality of “Programme” while still construction-professional.
- Works cleanly as route + nav label (`/dashboard/planner`).

**Definition:**
Buildstate Planner is a practical civil project planning and delivery-tracking module that combines:
1. Structured planning sheet (spreadsheet-like)
2. Simplified programme view (timeline)
3. Daily operational update workflow (today/overdue)
4. Revision-aware live execution board
5. Programme import path for existing schedules (including Microsoft Project `.mpp`)

It is not an enterprise CPM clone. It is a site-usable operational planning + live programme control tool.

---

## 2) Core concepts + data model
- **Company/workspace:** tenant boundary for plans and permissions.
- **Project:** optional parent context for plan.
- **Site(s):** plan can attach to multiple sites via join table.
- **Project plan:** main planning container (status + version).
- **Programme source:** whether plan was created in Buildstate or imported from external file.
- **Plan phase:** grouping for activities (e.g., Mobilisation, Civil Works).
- **Task/activity:** executable unit with planned/actual dates, priority, status, progress.
- **Dependency:** simplified predecessor→successor (FS only in MVP).
- **Assignee/responsible:** `assigned_to` profile id.
- **Daily update:** timestamped field update log for progress, blockages, notes.
- **Delay/constraint:** stored on task + update level (weather, redesign, waiting on council info, site events).
- **Planned vs actual tracking:** captures baseline intent against real site progress.
- **Revision trail:** lightweight event log capturing key changes.

---

## 3) Product behaviour (MVP)
1. User creates a new programme **or imports an existing programme** (priority support: Microsoft Project `.mpp`), then links project + sites.
2. For new programmes, user can optionally seed civil starter activities.
3. User adds/edits rows inline in sheet view and maintains plan data as site conditions change.
4. Dates and completion values can be edited quickly as actual progress is reported.
5. Status auto-adjusts from completion where practical, while preserving planned vs actual visibility.
6. Daily site users operate primarily via **Today** bucketed view:
   - Overdue
   - Due today
   - This week
7. Quick actions create daily update records and sync task status/progress from site.
8. Delays/events can be logged against tasks and updates (weather delays, redesign required, waiting on council information, other site disruptions).
9. Programme adjustments are captured with revision events so changes remain traceable.

---

## 4) UX structure
### Views
- **Master Sheet (MVP):** inline-editable activity table.
- **Timeline (MVP):** simplified bar visibility from planned dates.
- **Today (MVP):** mobile-first action cards for progress/blocked/done.

### UX interaction decisions
- Quick-add activity row at bottom of sheet.
- Inline editing for title/status/%/dates/notes.
- Segmented top nav per plan (Sheet, Timeline, Today).
- Mobile users primarily use card actions in Today view.

---

## 5) MVP scope discipline
### Must-have now
- Plan create/list/open
- Existing programme import (including `.mpp` mapping workflow)
- Project + multi-site association
- Task CRUD-ish flow (create + update)
- Status + completion updates
- Planned vs actual progress comparison at task level
- Today/overdue/week workflow
- Delay/event tracking linked to tasks and updates
- Basic timeline representation
- Task updates log and revision table foundations

### Nice-to-have later
- Drag reorder + phase collapse/expand
- Dependency editing UI
- Assignee directory UI
- Bulk import from CSV/Excel
- Better timeline scaling and zoom

### Defer
- Full CPM engine
- Full baseline comparison suite (beyond core planned vs actual)
- Complex resource leveling
- Deep earned-value analytics

---

## 6) Buildstate ecosystem relationship
- **Company/workspace:** all planner entities scoped by `company_id`.
- **Projects/sites:** plan links to project and many sites.
- **Future integrations:**
  - Site Sign In → crew presence context for due tasks.
  - Site Diary → auto-link delay reasons to diary/weather.
  - ITP Builder / Inspections → completion gates + hold points.
  - Incident Reports → blocked tasks can reference incidents.
  - Labour/Timesheets → planned vs actual labour productivity.

---

## 7) Technical architecture implemented
- Supabase migration with planner tables, enums, indexes, RLS.
- Route structure implemented:
  - `/dashboard/planner`
  - `/dashboard/planner/[planId]`
  - `/dashboard/planner/[planId]/timeline`
  - `/dashboard/planner/[planId]/today`
- Module structure added:
  - `lib/planner/types.ts`
  - `lib/planner/validation.ts`
  - `lib/planner/client.ts`
  - `app/(app)/dashboard/planner/components/*`

---

## 8) Data-entry model (construction practical)
- Fast quick-add row for many tasks.
- Inline date/percent edits.
- Simple status controls.
- Notes and delay/event reasons captured without heavy forms.
- Today view quick-buttons for field updates.

---

## 8.1) Existing programme import + normalization (MVP+)
- Accept uploaded programme files, prioritizing Microsoft Project `.mpp`.
- Parse/import into Buildstate canonical task model (phases, tasks, dates, links where available).
- Preserve original import metadata (source file, import timestamp, version reference).
- Flag unmapped/ambiguous fields for user review before publish.
- After import, treat programme identically to Buildstate-authored plans for live updates.

---

## 9) Dependency simplification
- MVP DB supports predecessor-successor with `FS` default.
- No full CPM calculations in MVP UI.
- Future-ready with lag days and manual date override support.

---

## 10) View strategy (MVP vs later)
### MVP
- Master sheet
- Timeline
- Today/overdue/this-week

### Later
- Blocked-only board
- Completed archive view
- Site-filtered and person-responsibility saved views
- Critical path highlighting

---

## 11) Civil construction usage alignment
Starter activities include realistic sequences:
- mobilisation
- survey/setout
- demolition/sawcutting
- excavation/service proving
- conduit/pit installation
- subgrade/kerb prep
- concrete pour/curing
- reinstatement/line marking
- defects + authority closeout

---

## 12) Mobile-first field usability
MVP includes a dedicated Today view optimized for phone:
- card layout
- quick progress buttons
- quick delay/event logging from site
- no spreadsheet dependence for daily updates

This keeps supervisor updates practical while preserving office-grade sheet editing.

---

## 13) Live programme tracking principle
Planner success is measured by whether teams keep using it during delivery, not just at setup.

Therefore the module must continuously support:
- live updating of real task progress on site
- planned vs actual comparison
- rapid logging of delays/events (weather, redesign, council info waits, etc.)
- controlled programme adjustments as conditions evolve

The outcome is a living programme of record for delivery execution.
