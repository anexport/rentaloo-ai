# RBAC Quick Reference - Cheat Sheet

## 🚀 Quick Start

### 1. Protect a Route

```typescript
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Single role
<ProtectedRoute requiredRole="owner" showError>
  <OwnerDashboard />
</ProtectedRoute>

// Multiple roles (OR logic)
<ProtectedRoute requiredRole={["owner", "admin"]} showError>
  <EquipmentManagement />
</ProtectedRoute>

// Any authenticated user
<ProtectedRoute>
  <MessagingPage />
</ProtectedRoute>
```

### 2. Check Role in Component

```typescript
import { useUserRole } from "@/hooks/useUserRole";

const { role, hasRole, hasAnyRole } = useUserRole();

if (hasRole("admin")) {
  // Admin-only code
}

if (hasAnyRole(["owner", "admin"])) {
  // Owner or Admin code
}
```

### 3. Check Permissions

```typescript
import { hasPermission } from "@/lib/rbac";

if (hasPermission(role, "DELETE_ANY_EQUIPMENT")) {
  // User can delete any equipment
}
```

---

## 📋 User Roles

| Role | Hierarchy | Capabilities |
|------|-----------|--------------|
| **admin** | 100 | Full platform access |
| **owner** | 2 | List equipment, manage bookings |
| **renter** | 1 | Rent equipment, make bookings |

---

## 🔒 Common Patterns

### Pattern 1: Conditional Rendering

```typescript
{role === "admin" && <AdminPanel />}
{hasRole("owner") && <OwnerTools />}
{hasAnyRole(["owner", "admin"]) && <ManageButton />}
```

### Pattern 2: Navigation Links

```typescript
// In Sidebar.tsx
{hasRole("admin") && (
  <Link to="/admin">Admin Dashboard</Link>
)}
```

### Pattern 3: Button Visibility

```typescript
{hasPermission(role, "DELETE_ANY_EQUIPMENT") && (
  <Button onClick={handleDelete}>Delete</Button>
)}
```

### Pattern 4: RLS Policy (Database)

```sql
-- Owner-only policy
CREATE POLICY "Owners can update equipment"
  ON equipment FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'owner'
    )
  );
```

### Pattern 5: Edge Function Validation

```typescript
// In Supabase Edge Function
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
```

---

## 🛠️ Available Functions

### Client-Side Hooks

```typescript
// useUserRole hook
const { role, loading, hasRole, hasAnyRole, refetch } = useUserRole();
```

### Database RPC Functions

```sql
-- Get my role
SELECT get_my_role();

-- Check if I have a role
SELECT has_role('admin');

-- Check if I have any role
SELECT has_any_role(ARRAY['owner', 'admin']);
```

### Utility Functions

```typescript
// From @/lib/rbac
hasPermission(role, "DELETE_ANY_EQUIPMENT")
getRoleName(role) // "Administrator"
getRoleBadgeColor(role) // "bg-purple-100 text-purple-800"
```

---

## 🎨 UI Components

### Role Badge

```typescript
import { getRoleBadgeColor, getRoleName } from "@/lib/rbac";

<span className={getRoleBadgeColor(role)}>
  {getRoleName(role)}
</span>
```

### Access Denied Message

```typescript
<ProtectedRoute requiredRole="admin" showError>
  <AdminDashboard />
</ProtectedRoute>

// Shows friendly error:
// "Access Denied - You don't have permission..."
```

---

## ⚡ Permissions List

### User Management
- `VIEW_USERS` - admin
- `MANAGE_USERS` - admin
- `DELETE_USERS` - admin

### Equipment
- `CREATE_EQUIPMENT` - owner, admin
- `EDIT_OWN_EQUIPMENT` - owner, admin
- `EDIT_ANY_EQUIPMENT` - admin
- `DELETE_OWN_EQUIPMENT` - owner, admin
- `DELETE_ANY_EQUIPMENT` - admin

### Bookings
- `CREATE_BOOKING` - renter, admin
- `VIEW_OWN_BOOKINGS` - renter, owner, admin
- `VIEW_ALL_BOOKINGS` - admin
- `CANCEL_OWN_BOOKING` - renter, admin
- `CANCEL_ANY_BOOKING` - admin

### Messaging
- `SEND_MESSAGES` - renter, owner, admin
- `VIEW_ALL_MESSAGES` - admin

### Payments
- `PROCESS_PAYMENT` - renter, admin
- `VIEW_OWN_PAYMENTS` - renter, owner, admin
- `VIEW_ALL_PAYMENTS` - admin
- `PROCESS_REFUND` - admin

### Reviews
- `CREATE_REVIEW` - renter, owner, admin
- `DELETE_OWN_REVIEW` - renter, owner, admin
- `DELETE_ANY_REVIEW` - admin

### System
- `VIEW_ANALYTICS` - admin
- `MANAGE_SETTINGS` - admin

---

## 📊 Testing

### Mock User Role in Tests

```typescript
import { vi } from "vitest";
import * as useUserRoleModule from "@/hooks/useUserRole";

vi.spyOn(useUserRoleModule, "useUserRole").mockReturnValue({
  role: "admin",
  loading: false,
  error: null,
  refetch: vi.fn(),
  hasRole: (role) => role === "admin",
  hasAnyRole: () => true,
});
```

---

## 🔧 Troubleshooting

### Check User Role in Database

```sql
SELECT id, email, role FROM profiles WHERE email = 'user@example.com';
```

### Set User as Admin

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
```

### Check RLS Policies

```sql
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public';
```

---

## 📝 Migration Checklist

- [ ] Apply migration: `029_add_admin_role_and_rbac.sql`
- [ ] Create admin user
- [ ] Replace `App.tsx` with `App.updated.tsx`
- [ ] Test role-based routes
- [ ] Update navigation components
- [ ] Add admin pages (optional)
- [ ] Update RLS policies
- [ ] Remove `user_metadata.role` usage

---

## 🚨 Security Reminders

1. ✅ Always use `useUserRole()` hook, never `user.user_metadata.role`
2. ✅ Enforce permissions at database level (RLS policies)
3. ✅ Validate roles in Edge Functions
4. ✅ Use `showError` prop for better UX
5. ✅ Test with all three roles: renter, owner, admin

---

**Full Documentation:** See `RBAC_IMPLEMENTATION_GUIDE.md`
