# SiteSign Project Memory

## Overview
SiteSign is a construction site access management system built with Next.js and Supabase. It provides digital sign-in/out functionality for workers, subcontractors, visitors, and deliveries with signature capture and real-time monitoring.

## Architecture
- **Frontend**: Next.js 14 with TypeScript, TailwindCSS, React
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Deployment**: Vercel
- **Key Features**: Digital signatures, org management, site-level access control, QR code generation

## User Defined Namespaces
- frontend
- backend
- database

## Components
### Admin Dashboard
- `app/admin/page.tsx` - Main admin page with auth flow and org redirection
- `app/admin/components/UnifiedOrgManagementPanel.tsx` - Organization member/invitation/request management
- `app/admin/components/NoOrgDashboard.tsx` - Dashboard for users without organization

### Public Pages
- `app/page.tsx` - Public sign-in/sign-out interface with signature capture

## Database Schema
- `organisations` - Organization records with public/private settings
- `org_members` - User-to-organization membership with roles (admin, editor, viewer)
- `sites` - Site records linked to organizations
- `site_visits` - Visit records with signatures and timestamps
- `org_invitations` - Pending invitations
- `org_join_requests` - Join requests from users

## Key Patterns
- RLS policies enforce org-scoped access
- RPC functions (`get_user_by_email`, `get_user_by_id`) for user lookups
- Signature data stored as base64 data URLs
- Role-based UI rendering (admin/editor/viewer)

## Recent Changes
- Fixed SQL type mismatch in RPC functions (email casting to text)
- Added redirect flow: users without org go to `/admin/orgs`
- Added "Add / Join Org" link in admin header for existing org members
- Replaced `<img>` tags with Next.js `<Image>` components for signatures
- Created `/admin/orgs` page to handle organization creation/joining
- Added success/error feedback banners to join mode in NoOrgDashboard
- Fixed React hooks ordering and removed unused variables

## Current Status
- ✅ All build errors resolved
- ✅ New organization management flow implemented
- ✅ Users without org are redirected to dedicated org setup page
- ✅ Users with org can access org setup via header link
- ✅ Join requests now show visual feedback
- ✅ Build passes successfully (next build completed)