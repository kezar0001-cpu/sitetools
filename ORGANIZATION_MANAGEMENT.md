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
- **Admin**: Full organization access, can manage members and sites
- **Editor**: Can manage assigned site visitors and data
- **Viewer**: Read-only access to organization data

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
- Admins can upload logos to QR codes
- Supports HTTPS URLs, local paths, and data URIs
- Logo validation for security
- Higher error correction when logo present

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
2. Use InvitationsPanel to invite team members
3. Monitor JoinRequestsPanel for new requests
4. Manage existing members via MembersPanel
5. Customize QR codes with organization logos

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
- Organization settings and preferences
- Advanced member permissions
- Audit logs and activity tracking
- Bulk member operations
- Organization templates
