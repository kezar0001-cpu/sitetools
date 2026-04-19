# Buildstate Codebase Index

> Construction site management platform for Australian civil contractors. Next.js 14 + Supabase + Tailwind.

---

## Overview

**Project**: Buildstate  
**Framework**: Next.js 14 (App Router)  
**Database**: Supabase (PostgreSQL + RLS)  
**Auth**: Supabase Auth with company/workspace multi-tenancy  
**Styling**: Tailwind CSS + Lucide icons  
**Data Fetching**: TanStack Query v5  
**Testing**: Vitest  

**Key Purpose**: Digital replacement for paper-based construction workflows — site sign-in, quality inspections, document management, and team coordination.

---

## User Defined Namespaces

- **frontend** - UI components, pages, hooks
- **backend** - API routes, server functions
- **database** - Supabase migrations, policies, types
- **planner** - SitePlan scheduler/planner module
- **site-capture** - Forms, diaries, inspections
- **site-docs** - AI document parsing
- **itp** - Inspection and Test Plans
- **workspace** - Multi-tenant company/site management

---

## Architecture

### App Router Structure (`app/`)

```
app/
├── (app)/                    # Authenticated app shell
│   ├── dashboard/            # Main dashboard (94 items)
│   │   ├── page.tsx          # Dashboard home with activity feed
│   │   ├── [moduleId]/       # Dynamic module loader
│   │   ├── itp-builder/      # ITP creation/management
│   │   ├── projects/         # Project management
│   │   ├── settings/         # User/org settings
│   │   ├── site-capture/     # Forms & diaries (58 items)
│   │   ├── site-docs/        # AI document parsing
│   │   ├── site-itp/         # ITP signing interface
│   │   ├── site-sign-in/     # QR sign-in management
│   │   ├── sites/            # Site management
│   │   └── team/             # Team/permissions
│   ├── layout.tsx            # Workspace provider wrapper
│   └── site-plan/            # Public site plan viewer
├── api/                      # API routes (34 endpoints)
├── auth/                     # Auth flows (post-login, etc.)
├── invite/                   # Invitation acceptance
├── itp-sign/                 # Public ITP signing
├── onboarding/               # New user onboarding
├── sign-in/                  # Public site sign-in (QR)
└── print-qr/                 # QR code printing
```

### Library Structure (`lib/`)

```
lib/
├── workspace/               # Multi-tenancy core
│   ├── types.ts             # Company, Site, Project, Profile types
│   ├── useWorkspace.ts      # Workspace context hook
│   ├── client.ts            # Workspace data fetching
│   ├── permissions.ts       # RBAC logic
│   └── invitations.ts       # Invite flow
├── site-capture/            # Site diary & forms
│   ├── types.ts             # Form types, diary structures
│   ├── client.ts            # CRUD operations
│   ├── validation.ts        # Form validation
│   └── offline.ts           # Offline support
├── site-docs/               # Document AI parsing
├── siteplan/                # Planner module (see Planner section)
├── dashboard/               # Dashboard-specific
├── cms/                     # CMS/settings
├── marketing/               # Marketing site utils
├── queryKeys.ts             # TanStack Query keys
├── routing.ts               # Route utilities
└── supabase.ts              # Supabase client
```

---

## Core Components

### Workspace System (`lib/workspace/`)
- **Multi-tenancy**: Company-based with role hierarchy (owner > admin > manager > member > viewer)
- **Active Context**: Users have `active_company_id` and `active_site_id` in profile
- **Summary Cache**: `WorkspaceSummary` loads memberships, companies, active context
- **Permissions**: Granular RBAC with `canManageCompany()`, `canManageSite()`, etc.

### Site Capture Module (`app/dashboard/site-capture/`, `lib/site-capture/`)
**Form Types**: Daily Diary, Prestart Checklist, Site Induction, Toolbox Talk, Incident Report, Site Inspection

**Key Files**:
- `lib/site-capture/types.ts` - 943 lines of type definitions
- `app/dashboard/site-capture/components/` - 55 React components
- `app/dashboard/site-capture/[diaryId]/` - Individual diary editing

**Form Config System**: `ACTIVITY_FORM_CONFIGS` maps form types to sections, required fields, output documents

### ITP Builder (`app/dashboard/itp-builder/`, `lib/itp/`)
- Inspection and Test Plan creation
- Checklist items with pass/fail/sign-off
- Client hold/reopen workflow
- Template system with audit logging
- Public signing interface at `/itp-sign/`

### Site Docs Module (`app/dashboard/site-docs/`, `lib/site-docs/`)
- AI-assisted document parsing (Claude SDK)
- Drawing and spec extraction
- Version control with status tracking
- Document templates

### Site Sign-In (`app/sign-in/`, `app/dashboard/site-sign-in/`)
- QR code-based check-in
- Digital signatures
- Induction integration
- Daily briefings

### Planner Module (see Planner section below)

---

## Database Schema (Supabase)

**Core Tables**:
- `profiles` - User profiles with active company/site
- `companies` - Organizations
- `company_memberships` - User-company-role links
- `company_invitations` - Invite flow
- `projects` - Project container
- `sites` - Physical construction sites (belongs to project)
- `site_visits` - Sign-in/sign-out records

**Site Capture Tables**:
- `site_diaries` - Main diary record
- `site_diary_photos` - Photo attachments
- `site_diary_labor` - Labour records
- `site_diary_equipment` - Equipment usage
- `site_diary_issues` - Diary issues (Safety, Delay, RFI, etc.)
- `equipment_catalog` - AI equipment management

**ITP Tables**:
- `itp_records` - ITP headers
- `itp_items` - Checklist items
- `itp_signoffs` - Sign-off records
- `itp_templates` - Reusable templates
- `itp_audit_log` - Change tracking

**Planner Tables**:
- `project_plans` - Project schedules
- `plan_phases` - Schedule phases
- `plan_tasks` - Individual tasks with dependencies
- `plan_task_predecessors` - Task dependency links
- `task_updates` - Task change history
- `weather_delay_logs` - Delay tracking
- `plan_baselines` - Schedule baselines

---

## API Routes

**Dashboard APIs**:
- `/api/dashboard/activity` - Recent activity feed

**ITP APIs**:
- `/api/itp-generate` - AI ITP generation
- `/api/itp-expand` - AI item expansion
- `/api/itp-import/*` - Import from various formats
- `/api/itp-signoffs` - Sign-off operations
- `/api/itp-sessions` - Signing sessions
- `/api/itp-sign` - Public signing

**Site Docs APIs**:
- `/api/site-docs/*` - Document parsing and management

**Planner APIs**:
- `/api/site-plan` - Plan CRUD operations

**Other**:
- `/api/admin/*` - Admin operations
- `/api/cms/*` - CMS endpoints
- `/api/cron-nudge` - WhatsApp nudge system
- `/api/whatsapp-webhook` - WhatsApp integration

---

## Key Patterns

### 1. Form Config Architecture
`ACTIVITY_FORM_CONFIGS` in `lib/site-capture/types.ts` defines:
- Sections per form type
- Required sections
- Output document types
- PDF templates
- Icons and colors

### 2. Workspace Context Pattern
```tsx
const { summary, activeMembership, setActiveCompany } = useWorkspace();
```
Provides company/site context to all authenticated pages.

### 3. Module System (`lib/modules.ts`)
Feature flags + module configuration for enabling/disabling features per company.

### 4. Query Key Pattern (`lib/queryKeys.ts`)
Centralized TanStack Query keys for cache management.

### 5. Activity Feed Pattern
Aggregates from multiple sources (diaries, photos, checklists, visits, ITPs) into unified feed.

---

## External Integrations

- **Supabase**: Auth + Database + Storage + Realtime
- **Anthropic Claude**: AI document parsing, text improvement, ITP generation
- **Upstash Redis**: Rate limiting
- **WhatsApp**: Nudge/notification system

---

## Migrations to Know

**Important Migration Files** (`supabase/migrations/`):
- `20260308_company_workspace_foundation.sql` - Core workspace schema
- `20260309_planner_module_foundation.sql` - Planner v1
- `20260315_site_diary_foundation.sql` - Site capture core
- `20260327_create_itp_module.sql` - ITP system
- `20260402_create_site_docs_module.sql` - Document AI
- `20260403_toolbox_talk_form.sql` - Toolbox talk forms
- `20260413_sitesign_induction_briefing.sql` - Induction system

---

## Testing

- **Framework**: Vitest
- **Config**: `vitest.config.ts`
- **Location**: `__tests__/`, `lib/__tests__/`

---

## Documentation Files

- `README.md` - Main project readme
- `ADVANCED_ORG_FEATURES.md` - Multi-tenancy features
- `BRAND_MEDIA_RUNBOOK.md` - Brand guidelines
- `CUSTOMER_FACING_PAGES_REVIEW.md` - Customer page audit
- `ORGANIZATION_MANAGEMENT.md` - Org management features
- `SYSTEM_FLOW_ANALYSIS.md` - System architecture
- `UNIFIED_MANAGEMENT_IMPLEMENTATION.md` - Management UI patterns

