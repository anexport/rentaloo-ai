# Role-Based Access Control (RBAC) Implementation Guide

This guide explains how to use the RBAC system in RentAloo to enforce role-based access control.

## Table of Contents

1. [Overview](#overview)
2. [Database Setup](#database-setup)
3. [User Roles](#user-roles)
4. [Frontend Implementation](#frontend-implementation)
5. [Usage Examples](#usage-examples)
6. [Security Best Practices](#security-best-practices)
7. [Testing](#testing)

---

## Overview

The RBAC system provides three user roles:
- **Renter**: Users who rent equipment
- **Owner**: Users who list equipment for rent
- **Admin**: Platform administrators with full access

### Key Features

- ✅ Role stored securely in database (not client-accessible metadata)
- ✅ Server-side role validation via RLS policies
- ✅ Client-side route protection with `ProtectedRoute` component
- ✅ Granular permission system
- ✅ Multi-role support (routes accessible to multiple roles)

---

## Database Setup

### 1. Apply the Migration

Run the migration to add admin role and RBAC functions:

```bash
# If using Supabase CLI
supabase migration up

# Or apply manually via Supabase Dashboard
# Upload: supabase/migrations/029_add_admin_role_and_rbac.sql
```

### 2. Database Functions Added

The migration creates these helper functions:

| Function | Description | Example |
|----------|-------------|---------|
| `get_my_role()` | Returns current user's role | `SELECT get_my_role()` |
| `has_role(role)` | Check if user has specific role | `SELECT has_role('admin')` |
| `has_any_role(roles[])` | Check if user has any of multiple roles | `SELECT has_any_role(ARRAY['owner', 'admin'])` |

### 3. Admin Profile Table

A new `admin_profiles` table is created for admin-specific data:

```sql
CREATE TABLE admin_profiles (
  profile_id UUID UNIQUE REFERENCES profiles(id),
  permissions JSONB,
  last_admin_action_at TIMESTAMP,
  ...
);
```

---

## User Roles

### Role Hierarchy

```
Admin (100)
  ├── All Owner permissions
  ├── All Renter permissions
  └── Platform administration

Owner (2)
  ├── Create/manage equipment
  ├── Approve bookings
  └── View earnings

Renter (1)
  ├── Browse equipment
  ├── Create bookings
  └── Make payments
```

### Assigning Roles

#### Method 1: During Signup

Roles are set during registration in `user_metadata`:

```typescript
await signUp(email, password, {
  role: "owner", // or "renter"
  fullName: "John Doe"
});
```

#### Method 2: Directly in Database (Admin Only)

```sql
-- Promote user to admin
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@rentaloo.com';

-- This automatically creates admin_profile via trigger
```

#### Method 3: Via Admin Dashboard (Future)

Create an admin interface to manage user roles.

---

## Frontend Implementation

### 1. Use the `useUserRole` Hook

Fetch and manage user roles in components:

```typescript
import { useUserRole } from "@/hooks/useUserRole";

export default function MyComponent() {
  const { role, loading, hasRole, hasAnyRole } = useUserRole();

  if (loading) return <div>Loading...</div>;

  if (hasRole("admin")) {
    return <div>Admin content</div>;
  }

  if (hasAnyRole(["owner", "admin"])) {
    return <div>Owner or Admin content</div>;
  }

  return <div>Default content</div>;
}
```

### 2. Protect Routes with `ProtectedRoute`

Wrap route elements with the `ProtectedRoute` component:

```typescript
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Renter-only route
<Route
  path="/renter/dashboard"
  element={
    <ProtectedRoute requiredRole="renter" showError>
      <RenterDashboard />
    </ProtectedRoute>
  }
/>

// Owner-only route
<Route
  path="/owner/dashboard"
  element={
    <ProtectedRoute requiredRole="owner" showError>
      <OwnerDashboard />
    </ProtectedRoute>
  }
/>

// Admin-only route
<Route
  path="/admin"
  element={
    <ProtectedRoute requiredRole="admin" showError>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>

// Multi-role route (owner OR admin)
<Route
  path="/equipment/manage"
  element={
    <ProtectedRoute requiredRole={["owner", "admin"]} showError>
      <EquipmentManagement />
    </ProtectedRoute>
  }
/>

// Any authenticated user (no role requirement)
<Route
  path="/messages"
  element={
    <ProtectedRoute>
      <MessagingPage />
    </ProtectedRoute>
  }
/>
```

### 3. Component-Level Permission Checks

Use the RBAC utilities for granular permissions:

```typescript
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { useUserRole } from "@/hooks/useUserRole";

export default function EquipmentCard({ equipment }) {
  const { role } = useUserRole();

  return (
    <div>
      <h3>{equipment.title}</h3>

      {/* Show delete button only if user has permission */}
      {hasPermission(role, "DELETE_ANY_EQUIPMENT") && (
        <Button onClick={handleDelete}>Delete</Button>
      )}

      {/* Show edit button for own equipment or admins */}
      {(equipment.owner_id === userId || role === "admin") && (
        <Button onClick={handleEdit}>Edit</Button>
      )}
    </div>
  );
}
```

### 4. Conditional UI Elements

Show/hide UI elements based on role:

```typescript
import { useUserRole } from "@/hooks/useUserRole";
import { getRoleBadgeColor, getRoleName } from "@/lib/rbac";

export default function UserProfile() {
  const { role } = useUserRole();

  return (
    <div>
      <h2>Profile</h2>

      {/* Role badge */}
      <span className={getRoleBadgeColor(role)}>
        {getRoleName(role)}
      </span>

      {/* Admin-only section */}
      {role === "admin" && (
        <div className="mt-4 p-4 bg-purple-50 rounded">
          <h3>Admin Tools</h3>
          <Link to="/admin">Go to Admin Dashboard</Link>
        </div>
      )}

      {/* Owner-specific content */}
      {role === "owner" && (
        <div className="mt-4">
          <h3>My Listings</h3>
          {/* Owner equipment list */}
        </div>
      )}

      {/* Renter-specific content */}
      {role === "renter" && (
        <div className="mt-4">
          <h3>My Bookings</h3>
          {/* Renter bookings list */}
        </div>
      )}
    </div>
  );
}
```

---

## Usage Examples

### Example 1: Owner-Only Equipment Management

```typescript
// src/pages/equipment/ManageEquipment.tsx
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useUserRole } from "@/hooks/useUserRole";

export default function ManageEquipment() {
  const { role } = useUserRole();

  return (
    <ProtectedRoute requiredRole="owner" showError>
      <div>
        <h1>Manage Your Equipment</h1>
        {/* Equipment management UI */}
      </div>
    </ProtectedRoute>
  );
}
```

### Example 2: Admin User Management

```typescript
// src/pages/admin/UserManagement.tsx
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";

export default function UserManagement() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Admins can view all users via RLS policies
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      setUsers(data || []);
    };

    void fetchUsers();
  }, []);

  return (
    <ProtectedRoute requiredRole="admin" showError>
      <div>
        <h1>User Management</h1>
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <Button onClick={() => handleEdit(user)}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProtectedRoute>
  );
}
```

### Example 3: Multi-Role Access (Owner OR Admin)

```typescript
// src/pages/analytics/EquipmentAnalytics.tsx
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function EquipmentAnalytics() {
  return (
    <ProtectedRoute requiredRole={["owner", "admin"]} showError>
      <div>
        <h1>Equipment Analytics</h1>
        {/* Analytics dashboard accessible to owners and admins */}
      </div>
    </ProtectedRoute>
  );
}
```

### Example 4: Conditional Rendering in Sidebar

```typescript
// src/components/layout/Sidebar.tsx
import { useUserRole } from "@/hooks/useUserRole";
import { Link } from "react-router-dom";

export default function Sidebar() {
  const { role, hasRole, hasAnyRole } = useUserRole();

  return (
    <nav>
      {/* All authenticated users */}
      <Link to="/messages">Messages</Link>
      <Link to="/settings">Settings</Link>

      {/* Renter-only links */}
      {hasRole("renter") && (
        <>
          <Link to="/renter/dashboard">My Bookings</Link>
          <Link to="/renter/payments">Payments</Link>
        </>
      )}

      {/* Owner-only links */}
      {hasRole("owner") && (
        <>
          <Link to="/owner/dashboard">My Equipment</Link>
          <Link to="/owner/earnings">Earnings</Link>
        </>
      )}

      {/* Admin-only links */}
      {hasRole("admin") && (
        <>
          <Link to="/admin">Admin Dashboard</Link>
          <Link to="/admin/users">User Management</Link>
          <Link to="/admin/analytics">Analytics</Link>
        </>
      )}

      {/* Owner OR Admin */}
      {hasAnyRole(["owner", "admin"]) && (
        <Link to="/equipment/manage">Manage Equipment</Link>
      )}
    </nav>
  );
}
```

---

## Security Best Practices

### 1. Always Use Database Roles (Not user_metadata)

❌ **INSECURE:**
```typescript
// Don't rely on user_metadata (client-accessible)
const role = user?.user_metadata?.role;
```

✅ **SECURE:**
```typescript
// Use database role via useUserRole hook
const { role } = useUserRole();
```

### 2. Server-Side Validation with RLS

Always enforce permissions at the database level:

```sql
-- Example: Only owners can update their own equipment
CREATE POLICY "Owners can update their equipment"
  ON equipment FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'owner'
    )
  );

-- Admins can update any equipment
CREATE POLICY "Admins can update any equipment"
  ON equipment FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
```

### 3. Double-Check in Edge Functions

Even with RLS, validate roles in edge functions:

```typescript
// supabase/functions/admin-action/index.ts
import { createClient } from "@supabase/supabase-js";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get authenticated user
  const authHeader = req.headers.get("Authorization");
  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader?.replace("Bearer ", "")
  );

  if (error || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  // Verify user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
  }

  // Proceed with admin action...
});
```

### 4. Use `showError` for Better UX

Show friendly error messages instead of redirecting:

```typescript
<ProtectedRoute requiredRole="admin" showError>
  <AdminDashboard />
</ProtectedRoute>
```

This displays:
> **Access Denied**
> You don't have permission to access this page.
> Required role: admin
> Your current role: renter

---

## Testing

### Testing Role-Based Routes

```typescript
// src/App.test.tsx
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";
import * as useUserRoleModule from "@/hooks/useUserRole";

describe("Role-Based Routing", () => {
  it("should allow renters to access renter dashboard", () => {
    vi.spyOn(useUserRoleModule, "useUserRole").mockReturnValue({
      role: "renter",
      loading: false,
      error: null,
      refetch: vi.fn(),
      hasRole: (role) => role === "renter",
      hasAnyRole: (roles) => roles.includes("renter"),
    });

    render(<App />);
    // Navigate to /renter/dashboard and verify access
  });

  it("should deny owners from accessing renter dashboard", () => {
    vi.spyOn(useUserRoleModule, "useUserRole").mockReturnValue({
      role: "owner",
      loading: false,
      error: null,
      refetch: vi.fn(),
      hasRole: (role) => role === "owner",
      hasAnyRole: (roles) => roles.includes("owner"),
    });

    render(<App />);
    // Verify "Access Denied" message is shown
  });

  it("should allow admins to access all routes", () => {
    vi.spyOn(useUserRoleModule, "useUserRole").mockReturnValue({
      role: "admin",
      loading: false,
      error: null,
      refetch: vi.fn(),
      hasRole: () => true, // Admin has all roles
      hasAnyRole: () => true,
    });

    render(<App />);
    // Verify admin can access renter, owner, and admin routes
  });
});
```

### Testing Database RLS Policies

```sql
-- Test as renter
SET request.jwt.claims = '{"sub": "renter-user-id"}';

-- Should succeed (renters can view available equipment)
SELECT * FROM equipment WHERE is_available = true;

-- Should fail (renters cannot view admin profiles)
SELECT * FROM admin_profiles;

-- Test as owner
SET request.jwt.claims = '{"sub": "owner-user-id"}';

-- Should succeed (owners can create equipment)
INSERT INTO equipment (title, description, ...) VALUES (...);

-- Should fail (owners cannot delete other owners' equipment)
DELETE FROM equipment WHERE owner_id != 'owner-user-id';

-- Test as admin
SET request.jwt.claims = '{"sub": "admin-user-id"}';

-- Should succeed (admins can view all profiles)
SELECT * FROM profiles;

-- Should succeed (admins can update any equipment)
UPDATE equipment SET is_available = false WHERE id = '...';
```

---

## Migration Checklist

- [ ] Apply migration `029_add_admin_role_and_rbac.sql`
- [ ] Create admin user in database
- [ ] Replace `src/App.tsx` with `src/App.updated.tsx`
- [ ] Test all protected routes
- [ ] Update navigation components to use role-based rendering
- [ ] Add admin dashboard pages (if needed)
- [ ] Update RLS policies to enforce roles
- [ ] Test with different user roles
- [ ] Remove any reliance on `user_metadata.role`
- [ ] Add role badges to user profiles

---

## Troubleshooting

### Issue: "Access Denied" for valid role

**Solution:** Check that the role is correctly set in the `profiles` table:

```sql
SELECT id, email, role FROM profiles WHERE id = 'user-id';
```

### Issue: Role loading never completes

**Solution:** Ensure `get_my_role()` function exists and has proper grants:

```sql
-- Check function exists
SELECT proname FROM pg_proc WHERE proname = 'get_my_role';

-- Check grants
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'get_my_role';
```

### Issue: RLS policies not working

**Solution:** Verify RLS is enabled and policies exist:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- List all policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public';
```

---

## Next Steps

1. **Apply the migration** and test with existing users
2. **Create admin user** for testing admin routes
3. **Update App.tsx** to use ProtectedRoute components
4. **Build admin dashboard** pages as needed
5. **Add role management** UI for admins
6. **Update all edge functions** to validate roles
7. **Add comprehensive tests** for role-based access

---

**Questions?** Refer to the security audit report or consult the development team.
