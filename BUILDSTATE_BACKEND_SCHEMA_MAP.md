# Buildstate Backend/Supabase Schema Map

> Generated: April 27, 2026
> Project: Buildstate Construction Operations Toolkit
> Location: `c:\Users\kezar\site-signin`

---

## 1. Current Supabase Tables Used by Buildstate

### Core Workspace Tables
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profiles extending auth.users | id, email, full_name, phone_number, active_company_id, active_site_id |
| `companies` | Organizations/companies | id, name, slug, owner_user_id, logo_url, created_at, updated_at |
| `company_memberships` | User-company-role associations | id, company_id, user_id, role, invited_by, created_at |
| `company_invitations` | Invite tokens for new members | id, company_id, email, role, token, invite_code, status, expires_at |
| `projects` | Project containers | id, company_id, name, description, status, created_by, created_at |
| `sites` | Physical construction sites | id, company_id, project_id, name, slug, timezone, is_active, logo_url |
| `site_visits` | QR sign-in/sign-out records | id, company_id, site_id, full_name, visitor_type, signed_in_at, signed_out_at, signature |

### SiteCapture Module Tables (Daily Records)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `site_diaries` | Daily diary headers | id, company_id, project_id, site_id, date, weather (JSONB), status, notes |
| `site_diary_labor` | Labor entries per diary | id, diary_id, trade_or_company, worker_count, hours_worked |
| `site_diary_equipment` | Equipment usage per diary | id, diary_id, equipment_type, quantity, hours_used |
| `site_diary_photos` | Photo attachments | id, diary_id, storage_path, caption, uploaded_by |
| `site_diary_issues` | Issues/RFIs/delays per diary | id, diary_id, type, description, responsible_party, delay_hours |
| `equipment_catalog` | AI-managed equipment types | id, company_id, equipment_type, default_quantity, default_hours, category |
| `prestart_checklists` | Prestart safety checklists | id, company_id, site_id, equipment_name, status, checklist_data (JSONB) |

### SiteITP Module Tables (Quality Checklists)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `itp_sessions` | ITP signing sessions | id, company_id, project_id, site_id, task_description, status, location_lat/lng |
| `itp_items` | Individual checklist items | id, session_id, type (witness/hold), title, description, status, signature, signed_off_at |
| `itp_records` | Structured ITP headers | id, company_id, project_id, name, status, current_version |
| `itp_signoffs` | Signature records per item | id, itp_id, item_id, signed_by, signature_data, status, notes |
| `itp_templates` | Reusable ITP templates | id, company_id, name, items (JSONB), created_by |
| `itp_audit_log` | ITP change tracking | id, itp_id, action, performed_by, changes (JSONB), created_at |

### SitePlan Module Tables (Project Planning)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `siteplan_tasks` | Project schedule tasks | id, project_id, parent_id, wbs_code, name, type, status, start_date, end_date, progress |
| `siteplan_progress_log` | Task progress history | id, task_id, progress_before, progress_after, note, logged_by |
| `plan_phases` | Phase groupings | id, plan_id, name, sort_order, color |
| `plan_tasks` | Tasks (legacy planner) | id, plan_id, phase_id, title, status, priority, percent_complete, planned_start/finish |
| `task_dependencies` | Task dependency links | id, plan_id, predecessor_task_id, successor_task_id, dependency_type, lag_days |
| `task_updates` | Daily task updates | id, plan_id, task_id, update_date, status, percent_complete, note, delay_reason |
| `plan_revisions` | Plan version snapshots | id, plan_id, revision_no, revision_type, summary, payload (JSONB) |
| `plan_baselines` | Schedule baselines | id, project_id, name, snapshot (JSONB), created_by |
| `weather_delay_logs` | Weather delay tracking | id, company_id, project_id, delay_date, reason, affected_task_ids |

### SiteDocs Module Tables (Documents)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `site_documents` | AI-generated documents | id, company_id, project_id, site_id, document_type, title, summary_input, generated_content (JSONB), status |
| `document_versions` | Document version history | id, document_id, version_number, content (JSONB), created_by, created_at |

### Audit & Admin Tables
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `company_audit_log` | Company-level audit trail | id, company_id, entity_type, entity_id, action, performed_by, changes (JSONB), metadata (JSONB) |

### Legacy Tables (Being Migrated)
| Table | Status | Notes |
|-------|--------|-------|
| `organisations` | Deprecated | Migrated to `companies` |
| `org_members` | Deprecated | Migrated to `company_memberships` |
| `org_invitations` | Deprecated | Migrated to `company_invitations` |
| `org_transfer_requests` | Deprecated | Ownership transfer functionality |

---

## 2. Current Organisation/Company Structure

### Hierarchy
```
auth.users (Supabase Auth)
    └── profiles (1:1 extension)
        └── company_memberships (1:N - user can be in multiple companies)
            └── companies (the organization)
                ├── projects (N per company)
                │   └── sites (N per project, or standalone)
                ├── sites (can be standalone or project-linked)
                │   └── site_visits (sign-in records)
                ├── company_invitations (pending invites)
                └── company_audit_log (activity tracking)
```

### Company Model
- **Table**: `companies`
- **Key Fields**:
  - `id`: UUID primary key
  - `name`: Display name
  - `slug`: URL-friendly unique identifier
  - `owner_user_id`: The owner (references auth.users)
  - `logo_url`: Company branding asset
- **Uniqueness**: `slug` is unique

---

## 3. Current User/Profile/Member/Role Structure

### Profile (extends auth.users)
**Table**: `profiles`
```typescript
interface Profile {
  id: string;                    // FK to auth.users (primary key)
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  active_company_id: string | null;  // Current selected company
  active_site_id: string | null;     // Current selected site
  created_at: string;
  updated_at: string;
}
```

### Company Roles
**Enum**: `company_role` (PostgreSQL enum)
```typescript
type CompanyRole = "owner" | "admin" | "manager" | "member";
```

Role hierarchy:
- **owner**: Full control, can delete company, transfer ownership
- **admin**: Manage company settings, team, projects
- **manager**: Create/edit projects, sites, daily records
- **member**: Create records, view data (default)

### Company Membership
**Table**: `company_memberships`
```typescript
interface CompanyMembership {
  id: string;
  company_id: string;    // FK to companies
  user_id: string;       // FK to auth.users
  role: CompanyRole;
  invited_by: string | null;
  created_at: string;
  // Joined fields:
  companies?: Company | null;
  profiles?: Pick<Profile, "id" | "email" | "full_name"> | null;
}
```

**Constraints**:
- Unique: `(company_id, user_id)` - one membership per user per company

---

## 4. Current Clients Table

**Status**: There is NO dedicated `clients` table.

Client/contractor information is handled through:
1. **company_name** field in `site_visits` (free text for visitor's company)
2. **trade_or_company** field in `site_diary_labor` (labor contractor name)
3. Company branding uses the `companies` table directly

---

## 5. Current Projects Table

**Table**: `projects`

```typescript
interface Project {
  id: string;                    // UUID primary key
  company_id: string;            // FK to companies (required)
  name: string;                  // Display name
  description: string | null;    // Optional details
  status: "active" | "completed" | "on-hold" | "archived";
  created_by: string | null;     // FK to auth.users
  created_at: string;
  updated_at: string;
}
```

**Constraints**:
- Unique: `(company_id, name)` - project names must be unique within a company

**Related**:
- `ProjectWithCounts`: Extended type with `site_count` and `plan_count`

---

## 6. Current Sites Table

**Table**: `sites`

```typescript
interface Site {
  id: string;                    // UUID primary key
  company_id: string;            // FK to companies (required)
  project_id: string | null;     // FK to projects (optional - standalone sites allowed)
  name: string;                  // Display name
  slug: string;                  // URL-friendly unique ID
  logo_url: string | null;       // Site branding
  is_active: boolean;            // Archive state (default: true)
  timezone: string | null;         // IANA timezone (e.g., "Australia/Sydney")
  created_at: string;
}
```

**Constraints**:
- `slug` is globally unique (for QR code URLs)
- Sites can exist without a project (`project_id` is nullable)

---

## 7. Current RLS Assumptions and Policies

### RLS Enablement
All tables have `ENABLE ROW LEVEL SECURITY` set.

### Key RLS Helper Functions
```sql
-- Returns all company IDs where current user is a member
get_my_company_ids() -> SETOF uuid

-- Checks if current user has specific role in a company
has_company_role(p_company_id uuid, p_roles company_role[]) -> boolean

-- Returns current user's email from JWT
current_user_email() -> text
```

### Core RLS Policy Patterns

#### 1. Company-Based Isolation (Standard Pattern)
```sql
-- SELECT: User can see data from companies they're a member of
USING (company_id IN (SELECT get_my_company_ids()))

-- INSERT/UPDATE: User must have specific role in that company
WITH CHECK (has_company_role(company_id, ARRAY['owner','admin','manager']::company_role[]))
```

#### 2. Profile-Specific Policies
```sql
-- Users can always view/update their own profile
profiles_select: USING (id = auth.uid() OR is_company_peer)
profiles_update: USING (id = auth.uid())
```

#### 3. Anon/QR Access Patterns (SiteSign)
```sql
-- Sites can be viewed by anyone (for QR lookups)
sites_anon_select: to anon USING (true)

-- Site visits allow anon insert/update (QR sign-in flow)
site_visits_anon_insert: to anon WITH CHECK (site_id IS NOT NULL)
site_visits_anon_update: to anon USING (signed_out_at IS NULL)
```

#### 4. Inherited Access (Child Tables)
```sql
-- Child tables check access via parent (e.g., site_diary_labor via site_diaries)
USING (EXISTS (
  SELECT 1 FROM site_diaries sd
  WHERE sd.id = site_diary_labor.diary_id
    AND sd.company_id IN (SELECT get_my_company_ids())
))
```

### Policy Summary by Table

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| companies | All members | Owner only | Owner/Admin | Owner only |
| profiles | Own + peers | Own record only | Own only | - |
| company_memberships | All members | Owner/Admin | Owner/Admin | Owner/Admin |
| company_invitations | Admin + invitee | Owner/Admin | Admin + invitee | Owner/Admin |
| projects | All members | Owner/Admin/Manager | Owner/Admin/Manager | Owner/Admin |
| sites | Anon + members | Owner/Admin/Manager | Owner/Admin/Manager | Owner/Admin |
| site_visits | All members | Anon + members | Anon + members | All members |
| site_diaries | All members | All members | Creator + Manager+ | Owner/Admin |
| itp_sessions | All members | All members | All members | - |
| siteplan_tasks | All members | Manager+ | Manager+ | Manager+ |
| site_documents | All members | All members | All members | All members |

---

## 8. Current Storage Buckets

| Bucket | Purpose | Access | File Limits |
|--------|---------|--------|-------------|
| `diary_media` | Site diary photos | Private (signed URLs) | 20MB, images only (jpeg, png, webp, heic, heif) |
| `itp-signatures` | ITP digital signatures | Private | No explicit limit, PNG format |

### Storage RLS Policies

**diary_media**:
- `diary_media_insert`: Authenticated users can upload
- `diary_media_select`: Authenticated users can view
- `diary_media_delete`: Owner or Manager+ can delete

**itp-signatures**:
- `itp_signatures_select`: Company members can view their company's signatures
- `itp_signatures_insert`: Authenticated users can insert (path validation via itp_sessions)

---

## 9. Current Environment Variables Used for Supabase

### Required (Public/Browser)
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Optional (Module Feature Flags - now deprecated/hardcoded)
```bash
# These are now hardcoded in lib/modules.ts but remain in .env.example
NEXT_PUBLIC_SITESIGN_PRIMARY=true
NEXT_PUBLIC_SHOW_PLANNER_PRIMARY=false
NEXT_PUBLIC_SHOW_ROADMAP_MODULES=false
```

### Server-Side Only
```bash
# CMS Admin credentials (for /cms routes)
CMS_ADMIN_USERNAME=admin
CMS_ADMIN_PASSWORD=change-this-password
CMS_ADMIN_SESSION_TOKEN=change-this-session-token
CMS_RECOVERY_TOKEN=

# AI Integration (ITP generation)
ANTHROPIC_API_KEY=your-key-here

# Rate limiting (ITP sign route)
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-rest-token

# Admin password (legacy)
ADMIN_PASSWORD=your-admin-password
```

### Supabase Client Configuration
Located in `lib/supabase.ts`:
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Uses lock bypass for iOS Safari compatibility
export const supabase = createClient(url, key, {
  auth: {
    lock: (_name, _acquireTimeout, fn) => fn(),
  },
});
```

---

## 10. How a User is Linked to Company/Organisation/Project

### Linkage Chain

```
auth.users (authentication)
    │
    ├──► profiles (1:1) - stores active_company_id, active_site_id
    │
    └──► company_memberships (1:N) - formal membership with role
              │
              ├──► companies (the organization)
              │       ├──► projects (N per company)
              │       │       └──► sites (N per project)
              │       └──► sites (standalone, project_id = null)
              │
              └──► All data scoped by company_id
```

### Access Resolution Flow

1. **Authentication**: User signs in via Supabase Auth → receives JWT
2. **Profile Load**: `profiles` table queried for `active_company_id`
3. **Membership Resolution**: `company_memberships` loaded for user
4. **Workspace Summary**: `get_workspace_summary()` RPC returns:
   - Current profile (with active company/site)
   - All memberships (with joined company data)
   - Active membership (selected or first)

### Data Access Pattern
All operational tables include `company_id`:
```sql
-- Example: site_diaries
SELECT * FROM site_diaries
WHERE company_id IN (SELECT get_my_company_ids());
```

### Switching Context
Users can switch active company/site:
- `set_active_company(p_company_id uuid)` - RPC function
- `set_active_site(p_site_id uuid)` - RPC function
- Updates `profiles.active_company_id` and `profiles.active_site_id`

---

## 11. Naming Convention Used

### ID Column Naming
| Pattern | Usage | Example |
|---------|-------|---------|
| `id` | Primary key (always UUID) | `companies.id` |
| `company_id` | FK to companies table | `projects.company_id` |
| `project_id` | FK to projects table | `sites.project_id` |
| `site_id` | FK to sites table | `site_visits.site_id` |
| `user_id` | FK to auth.users | `company_memberships.user_id` |
| `created_by` | Who created the record | `projects.created_by` |
| `updated_by` | Who last updated | `plan_tasks.updated_by` |
| `*_at` | Timestamp columns | `created_at`, `updated_at`, `signed_in_at` |

### Legacy Migration Note
- Old naming: `org_id`, `org_members`, `organisations`
- New naming: `company_id`, `company_memberships`, `companies`
- Migration: `20260308_company_workspace_foundation.sql` handles backfill

### Table Naming Conventions
| Pattern | Examples |
|---------|----------|
| Singular nouns | `company`, `project`, `site` |
| Module prefix | `site_diaries`, `site_diary_labor`, `site_diary_photos` |
| Action suffix | `site_visits`, `task_updates`, `weather_delay_logs` |
| Descriptive compound | `company_memberships`, `company_invitations` |

### Snake Case
All database columns use `snake_case`:
- ✅ `company_id`, `created_at`, `signed_in_at`
- ❌ `companyId`, `createdAt` (TypeScript uses camelCase)

---

## 12. Existing App/Module Naming Patterns

### Module ID Format
```typescript
type ModuleId =
  | "site-sign-in"      // SiteSign (QR attendance)
  | "planner"           // SitePlan (scheduling)
  | "site-capture"      // SiteCapture (daily diaries)
  | "itp-builder"       // SiteITP (quality checklists)
  | "site-docs"         // SiteDocs (AI documents)
  | "dashboard"         // Dashboard (overview)
  | "sites-projects"    // Projects management
  | "team"              // Team management
  | "settings";         // Workspace settings
```

### Module Slug Format
```typescript
type ModuleSlug =
  | "sitesign"          // SiteSign
  | "siteplan"          // SitePlan
  | "sitecapture"       // SiteCapture
  | "siteitp"           // SiteITP
  | "sitedocs"          // SiteDocs
  | "dashboard"
  | "sites-projects"
  | "team"
  | "settings";
```

### Module Categorization
| Category | Modules | Visibility |
|----------|---------|------------|
| **Primary** | SiteSign | Public marketing |
| **Supporting** | SiteCapture, SiteITP, SiteDocs, SitePlan | Product depth |
| **Internal** | Dashboard, Sites/Projects, Team, Settings | Admin only |

### Route Naming Pattern
```
/dashboard/site-sign-in     → SiteSign module
/dashboard/site-capture     → SiteCapture module
/dashboard/site-itp        → SiteITP module
/dashboard/site-docs        → SiteDocs module
/dashboard/sites           → Sites/Projects management
/dashboard/team            → Team management
/dashboard/settings        → Settings
/site-plan                 → SitePlan (separate layout)
```

### Color Assignment
| Module | Color | Hex (approx) |
|--------|-------|--------------|
| SiteSign | amber | #f59e0b |
| SiteCapture | sky | #0ea5e9 |
| SiteITP | violet | #8b5cf6 |
| SiteDocs | cyan | #06b6d4 |
| SitePlan | indigo | #6366f1 |
| Dashboard/Internal | zinc | #71717a |

### File Structure Pattern
```
lib/
  ├── workspace/           # Core workspace (company, site, profile)
  ├── site-capture/        # SiteCapture module
  ├── siteplan/            # SitePlan module
  ├── itp/                 # SiteITP module
  └── site-docs/           # SiteDocs module

app/
  ├── (app)/               # Authenticated layout
  │   ├── dashboard/
  │   │   ├── site-sign-in/
  │   │   ├── site-capture/
  │   │   ├── site-itp/
  │   │   ├── site-docs/
  │   │   ├── sites/       # Sites/Projects
  │   │   ├── team/
  │   │   └── settings/
  │   └── projects/[id]/plan/  # SitePlan (per-project)
  └── api/                 # API routes
```

### Form Type Naming
```typescript
type FormType = 
  | "daily-diary" 
  | "prestart-checklist" 
  | "site-induction" 
  | "toolbox-talk" 
  | "incident-report" 
  | "site-inspection";
```

---

## Appendix: Database Functions & RPC

### Workspace Functions
| Function | Purpose |
|----------|---------|
| `get_workspace_summary()` | Returns profile + memberships in one call |
| `set_active_company(p_company_id uuid)` | Sets user's active company |
| `set_active_site(p_site_id uuid)` | Sets user's active site |
| `get_my_company_ids()` | Returns all company IDs for current user |
| `has_company_role(uuid, company_role[])` | Role check for RLS |
| `create_company_with_owner(text)` | Creates company + membership |
| `create_company_invitation(uuid, text, company_role)` | Creates invite token |
| `accept_company_invitation(text)` | Accepts invite by token |
| `transfer_company_ownership(uuid, uuid)` | Transfers ownership |

### SitePlan Functions
| Function | Purpose |
|----------|---------|
| `get_projects_with_counts(uuid)` | Projects with site_count and plan_count |
| `get_siteplan_projects_with_stats(uuid)` | Projects with aggregated task stats |
| `log_siteplan_delay(...)` | Logs weather delays with cascade updates |
| `reverse_siteplan_delay(uuid)` | Reverses a delay entry |
| `create_siteplan_task(...)` | Creates task with validation |
| `reorder_siteplan_tasks(...)` | Batch reorder tasks |

---

*End of Schema Map*
