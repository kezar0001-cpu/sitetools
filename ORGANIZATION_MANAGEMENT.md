# Organization Management System

This document describes the comprehensive organization management system implemented for SiteSign, enabling multi-user organizations with role-based access control and approval workflows.

## Overview

The organization management system allows:
- Users to create their own organizations
- New users to discover and request to join existing organizations
- Admins to invite users directly to their organization
- Admins to approve/reject join requests
- Role-based access control (Admin, Editor, Viewer)
- Member management (add, remove, change roles)

## Database Schema

### New Tables

#### `org_invitations`
- **Purpose**: Admin invitations sent to specific email addresses
- **Key Fields**:
  - `org_id`: Organization reference
  - `email`: Target email address
  - `role`: Assigned role (admin/editor/viewer)
  - `site_id`: Site assignment for editors
  - `status`: pending/accepted/declined/expired
  - `expires_at`: 7-day expiration
  - `invited_by`: Admin who sent invitation

#### `org_join_requests`
- **Purpose**: User requests to join organizations
- **Key Fields**:
  - `org_id`: Organization reference
  - `user_id`: Requesting user
  - `message`: Optional message to admin
  - `status`: pending/approved/rejected
  - `reviewed_by`: Admin who processed request
  - `reviewed_at`: Review timestamp

#### Enhanced Tables
- **`organisations`**: Added `is_public` and `description` fields
- **`sites`**: Added `logo_url` field for QR code customization

### Security Functions

#### `accept_invitation(invitation_id)`
- Accepts an invitation and creates membership
- Validates email match and expiration
- Handles role and site assignment

#### `approve_join_request(request_id, assign_role, assign_site_id)`
- Approves a join request with specified role
- Creates membership with proper permissions
- Handles site assignment for editors

## User Interface Components

### OrgSetupScreen
Enhanced setup screen with three modes:
1. **Create New**: Create a new organization (public or private)
2. **Browse & Join**: Discover public organizations and send join requests
3. **Pending Invitations**: Accept/decline invitations sent to user

### Admin Panels (Admin Only)

#### InvitationsPanel
- Send email invitations to specific users
- Assign roles and sites during invitation
- View pending/accepted/declined invitations
- Revoke pending invitations

#### JoinRequestsPanel
- Review user join requests
- Approve with role assignment
- Reject requests with feedback
- View request history

#### MembersPanel (Enhanced)
- View all organization members
- Change member roles (admin/editor/viewer)
- Remove members from organization
- Role-based access control

### PendingInvitationsView
- Display pending invitations for current user
- Accept/decline invitations
- Automatic redirect after acceptance

## Workflows

### New User Registration
1. User creates account
2. System checks for pending invitations
3. User can:
   - Accept pending invitations
   - Create new organization
   - Browse and request to join public organizations

### Admin Invitation Workflow
1. Admin sends invitation via email
2. User receives email with signup link
3. User creates account
4. User accepts invitation in dashboard
5. Membership created automatically

### Join Request Workflow
1. User discovers public organization
2. User sends join request with message
3. Admin receives notification
4. Admin reviews and assigns role
5. User becomes member upon approval

### Role Management

Roles are enforced in the UI and (where applicable) in the database:

| Role    | Organization | Sites | Members / Invites / Join requests | Visits (assigned or all) |
|---------|--------------|-------|------------------------------------|---------------------------|
| **Admin** | Can view and edit org name, description, discoverability | Create, edit, delete; switch between all org sites | Full management | Full CRUD on all org sites |
| **Editor** | View only (no org settings) | One or more assigned sites; switch between them; no create/delete | No access | Full CRUD for their assigned sites only |
| **Viewer** | View only | Can switch between all org sites (read-only list) | No access | Read-only: view visits and signatures, no add/edit/sign-out/delete |

- **Admin**: Full organization access — edit organization details, create and manage sites, manage members/invitations/join requests, and manage all visits across sites.
- **Editor**: Assigned sites (one or more) — can only see and manage their assigned site’s visits on those sites only. Cannot create sites or manage members. Assignments stored in `org_member_sites`.
- **Viewer**: Read-only — can view all org sites and their visits (and export). No add visit, edit, sign out, or delete.

## Security Features

### Row Level Security (RLS)
- All tables have comprehensive RLS policies
- Users can only see their own invitations/join requests
- Admins can manage their organization's data
- Security definer functions prevent recursion issues

### Access Control
- Email validation for invitations
- Expiration dates for invitations
- Role-based UI permissions
- Audit trails for all actions

## QR Code Enhancement

### Site Logo Support
- Admins upload logo **files** (no URL required) from the admin dashboard.
- Supported formats: PNG, JPEG, WebP, SVG (max 2 MB). Files are stored in Supabase Storage and the public URL is saved to the site.
- The API route `/api/upload-site-logo` checks that the caller is an org admin for the site; the bucket `site-logos` is created automatically if missing (public read).
- Higher QR error correction (H) is used when a logo is present.

## API Endpoints

### Existing: `/api/create-editor`
Enhanced to support viewer role creation and dynamic role assignment.

### Database Functions
- `accept_invitation()`: Handle invitation acceptance
- `approve_join_request()`: Handle join request approval
- `email_matches_invitation()`: Validate email matches

## Migration Files

1. **`20260228_org_invitations_and_requests.sql`**: Core organization management tables and functions
2. **`20260228_site_logo_url.sql`**: Site logo support for QR codes
3. **`20260227_add_viewer_role.sql`**: Viewer role support (previously implemented)

## Testing

The system has been tested with:
- Build compilation passes
- TypeScript types validated
- ESLint rules satisfied
- Component integration verified

## Usage Instructions

### For Admins
1. Create organization or accept admin invitation
2. Use **Organization** (collapsible panel) to view and edit org name, description, and discoverability
3. Use InvitationsPanel to invite team members
4. Monitor JoinRequestsPanel for new requests
5. Manage existing members via MembersPanel
6. Customize QR codes by uploading a logo per site (Upload logo in the QR Code panel)

### For Users
1. Sign up for account
2. Accept invitations or browse organizations
3. Send join requests to public organizations
4. Access organization based on assigned role

### For Site Management
1. Admins can create and manage multiple sites
2. Editors are assigned to specific sites
3. Viewers can access all site data in read-only mode

## Future Enhancements

Potential improvements:
- Email notification system
- Advanced member permissions
- Audit logs and activity tracking
- Bulk member operations
- Organization templates

*(Organization settings — name, description, discoverability — are available in the admin Organization panel.)*
