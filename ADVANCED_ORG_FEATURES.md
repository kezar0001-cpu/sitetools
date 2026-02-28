# Advanced Organization Management Features

This document describes the advanced organization management features that have been implemented to provide comprehensive control and flexibility for SiteSign organizations.

## Overview

The advanced features include:
- **Organization-less accounts**: Users can create accounts without being tied to an organization
- **Organization deletion**: Admins can delete organizations with proper approval workflows
- **Organization transfers**: Admins can transfer ownership to other users
- **Join codes**: Direct access codes for joining organizations without approval
- **Enhanced dashboard**: Dedicated interface for users without organizations

## Database Schema Enhancements

### New Tables

#### `org_transfer_requests`
- **Purpose**: Handle organization ownership transfers
- **Key Fields**:
  - `org_id`: Organization reference
  - `from_user_id`: Current admin requesting transfer
  - `to_user_id`: Target user to receive ownership
  - `message`: Optional message to target user
  - `status`: pending/accepted/declined/expired
  - `expires_at`: 7-day expiration for requests

#### `org_deletion_requests`
- **Purpose**: Handle organization deletion with multi-admin approval
- **Key Fields**:
  - `org_id`: Organization reference
  - `requested_by`: Admin requesting deletion
  - `reason`: Deletion reason (required)
  - `status`: pending/approved/cancelled
  - `approved_by`: Admin who approved (for multi-admin orgs)
  - `approved_at`: Approval timestamp

#### Enhanced `organisations` Table
- **New Fields**:
  - `join_code`: 12-character alphanumeric code for direct joining
  - `join_code_expires`: Expiration timestamp for join codes
  - `created_by`: Original creator user ID

### Database Functions

#### `generate_join_code()`
- Generates secure 12-character alphanumeric codes
- Used for creating organization join codes

#### `join_by_code(join_code, user_id)`
- Allows users to join organizations directly using codes
- Validates code exists and hasn't expired
- Adds user as viewer role by default
- Returns success/error messages

#### `request_org_transfer(org_id, to_user_id, message)`
- Initiates organization ownership transfer
- Validates requester is admin
- Creates transfer request with 7-day expiration
- Prevents duplicate requests to same user

#### `accept_org_transfer(request_id)`
- Accepts pending organization transfer
- Validates target user and request validity
- Adds user as admin to organization
- Updates request status

#### `request_org_deletion(org_id, reason)`
- Requests organization deletion
- Single admin: Deletes immediately
- Multi-admin: Creates approval request
- Includes comprehensive data cleanup

#### `approve_org_deletion(request_id)`
- Approves pending deletion request
- Validates approver is different admin
- Executes complete data deletion
- Removes all related data safely

#### `generate_org_join_code(org_id, expires_hours)`
- Generates new join code for organization
- Sets expiration (default 7 days)
- Updates organization record
- Returns generated code

## User Interface Components

### NoOrgDashboard
**Purpose**: Dedicated interface for users without organizations

**Features**:
- Welcome screen with options
- Create new organization
- Browse public organizations
- Join with transfer codes
- View pending invitations
- Join organization panel

**Modes**:
1. **Browse**: Welcome screen with all options
2. **Create**: Organization creation form
3. **Join**: Browse and request to join public orgs

### OrgManagementPanel
**Purpose**: Advanced organization management for admins

**Features**:
- **Join Code Management**:
  - Generate secure join codes
  - Set custom expiration times
  - Copy codes to clipboard
  - View code expiration status

- **Organization Transfer**:
  - Transfer ownership to other users
  - Send transfer requests with messages
  - View pending transfer requests
  - Accept/decline incoming transfers

- **Organization Deletion**:
  - Request deletion with reason
  - Multi-admin approval workflow
  - View pending deletion requests
  - Approve deletion requests
  - Immediate deletion for single admins

### JoinOrgPanel
**Purpose**: Join organizations using various methods

**Features**:
- **Transfer Requests**: Accept ownership transfers
- **Join Codes**: Enter codes for direct access
- **Status Tracking**: View request statuses

## Workflows

### Organization-less User Journey
1. User creates account without organization
2. Lands on NoOrgDashboard
3. Options available:
   - Create new organization
   - Browse and request to join public orgs
   - Use join codes for direct access
   - Accept transfer invitations

### Organization Transfer Workflow
1. **Initiation**:
   - Admin requests transfer to specific user
   - Provides optional message
   - System creates 7-day expiration request

2. **Acceptance**:
   - Target user receives notification
   - Can accept or decline transfer
   - Acceptance adds user as admin

3. **Completion**:
   - Organization now has multiple admins
   - Original admin retains access
   - Transfer history preserved

### Organization Deletion Workflow
1. **Single Admin**:
   - Admin requests deletion with reason
   - System deletes immediately
   - All related data removed

2. **Multi Admin**:
   - Admin requests deletion with reason
   - Other admins receive notification
   - Different admin must approve
   - Approval triggers complete deletion

### Join Code Workflow
1. **Generation**:
   - Admin generates secure join code
   - Sets expiration period (default 7 days)
   - Code can be shared via any channel

2. **Usage**:
   - User enters code in JoinOrgPanel
   - System validates code and expiration
   - User added as viewer immediately
   - No admin approval required

## Security Features

### Access Control
- **Admin-only operations**: Transfer, deletion, code generation
- **Role validation**: All functions verify user permissions
- **Expiration handling**: Automatic cleanup of expired requests/codes
- **Request limits**: Prevent duplicate transfer requests

### Data Protection
- **Complete deletion**: Removes all related data safely
- **Audit trails**: All actions tracked with timestamps
- **Validation**: Comprehensive input validation and sanitization
- **RLS policies**: Row-level security on all new tables

### Code Security
- **Secure generation**: Cryptographically random join codes
- **Expiration enforcement**: Time-based access control
- **Rate limiting**: Prevent abuse of code generation
- **Validation**: Server-side verification of all actions

## Migration Files

### `20260228_org_management_features.sql`
- Creates all new tables and functions
- Implements comprehensive RLS policies
- Adds helper functions for secure operations
- Updates existing table structures

### `20260228_site_logo_url.sql`
- Adds logo support to sites table
- Updates RLS policies for logo access
- Enables QR code customization

## API Endpoints

### Database Functions (RPC)
- `generate_org_join_code()` - Generate join codes
- `join_by_code()` - Join using codes
- `request_org_transfer()` - Initiate transfers
- `accept_org_transfer()` - Accept transfers
- `request_org_deletion()` - Request deletion
- `approve_org_deletion()` - Approve deletion

### Existing Endpoints
- `/api/create-editor` - Enhanced for new roles
- All existing endpoints remain compatible

## Usage Instructions

### For Admins
1. **Generate Join Codes**:
   - Open OrgManagementPanel
   - Click "Generate New Code"
   - Share code with new users

2. **Transfer Organization**:
   - Enter target user email
   - Add optional message
   - Wait for user acceptance

3. **Delete Organization**:
   - Provide deletion reason
   - For multi-admin: wait for approval
   - For single admin: immediate deletion

### For Users
1. **Join with Code**:
   - Enter 12-character code
   - Immediate access as viewer

2. **Accept Transfer**:
   - View transfer requests
   - Accept to become admin

3. **Browse Organizations**:
   - Use NoOrgDashboard
   - Request to join public orgs
   - Wait for admin approval

## Best Practices

### Organization Management
- **Regular cleanup**: Remove expired join codes
- **Transfer planning**: Ensure smooth ownership transitions
- **Backup data**: Export important data before deletion
- **Access review**: Regularly review member permissions

### Security
- **Code distribution**: Share join codes securely
- **Transfer verification**: Confirm recipient identity
- **Deletion approval**: Require proper authorization
- **Audit monitoring**: Review organization activity

### User Experience
- **Clear communication**: Provide transfer context
- **Timely responses**: Process requests promptly
- **Documentation**: Maintain org policies
- **Training**: Educate admins on features

## Future Enhancements

Potential improvements:
- **Bulk operations**: Multiple user management
- **Audit logs**: Detailed activity tracking
- **Email notifications**: Automated alerts
- **Organization templates**: Pre-configured setups
- **Advanced permissions**: Granular access control
- **Integration APIs**: External system connections
- **Analytics**: Organization usage metrics
- **Compliance**: Industry-specific features

## Troubleshooting

### Common Issues
- **Expired codes**: Generate new join codes
- **Transfer delays**: Check user notifications
- **Deletion conflicts**: Ensure all admins approve
- **Access denied**: Verify user permissions

### Support
- Check database migration status
- Verify RLS policies are applied
- Review function permissions
- Test with different user roles

This advanced organization management system provides enterprise-level control while maintaining simplicity and security for all users.
