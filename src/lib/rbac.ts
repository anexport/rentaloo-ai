import type { UserRole } from "@/hooks/useUserRole";

/**
 * Role hierarchy and permissions utility
 *
 * This module provides utilities for role-based access control (RBAC)
 * throughout the application.
 */

/**
 * Role hierarchy (higher number = more permissions)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  renter: 1,
  owner: 2,
  admin: 100,
  null: 0,
};

/**
 * Check if a role has at least the permissions of another role
 *
 * @example
 * roleHasPermission("admin", "owner") // true (admin >= owner)
 * roleHasPermission("renter", "owner") // false (renter < owner)
 */
export const roleHasPermission = (
  userRole: UserRole,
  requiredRole: UserRole
): boolean => {
  if (!userRole || !requiredRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

/**
 * Check if a role has any of the specified permissions
 */
export const roleHasAnyPermission = (
  userRole: UserRole,
  requiredRoles: UserRole[]
): boolean => {
  if (!userRole) return false;
  return requiredRoles.some((role) => roleHasPermission(userRole, role));
};

/**
 * Define specific permissions for features
 */
export const PERMISSIONS = {
  // User Management
  VIEW_USERS: ["admin"] as UserRole[],
  MANAGE_USERS: ["admin"] as UserRole[],
  DELETE_USERS: ["admin"] as UserRole[],

  // Equipment Management
  CREATE_EQUIPMENT: ["owner", "admin"] as UserRole[],
  EDIT_OWN_EQUIPMENT: ["owner", "admin"] as UserRole[],
  EDIT_ANY_EQUIPMENT: ["admin"] as UserRole[],
  DELETE_OWN_EQUIPMENT: ["owner", "admin"] as UserRole[],
  DELETE_ANY_EQUIPMENT: ["admin"] as UserRole[],

  // Booking Management
  CREATE_BOOKING: ["renter", "admin"] as UserRole[],
  VIEW_OWN_BOOKINGS: ["renter", "owner", "admin"] as UserRole[],
  VIEW_ALL_BOOKINGS: ["admin"] as UserRole[],
  CANCEL_OWN_BOOKING: ["renter", "admin"] as UserRole[],
  CANCEL_ANY_BOOKING: ["admin"] as UserRole[],

  // Messaging
  SEND_MESSAGES: ["renter", "owner", "admin"] as UserRole[],
  VIEW_ALL_MESSAGES: ["admin"] as UserRole[],

  // Payments
  PROCESS_PAYMENT: ["renter", "admin"] as UserRole[],
  VIEW_OWN_PAYMENTS: ["renter", "owner", "admin"] as UserRole[],
  VIEW_ALL_PAYMENTS: ["admin"] as UserRole[],
  PROCESS_REFUND: ["admin"] as UserRole[],

  // Reviews
  CREATE_REVIEW: ["renter", "owner", "admin"] as UserRole[],
  DELETE_OWN_REVIEW: ["renter", "owner", "admin"] as UserRole[],
  DELETE_ANY_REVIEW: ["admin"] as UserRole[],

  // System Settings
  VIEW_ANALYTICS: ["admin"] as UserRole[],
  MANAGE_SETTINGS: ["admin"] as UserRole[],
} as const;

/**
 * Check if user has a specific permission
 *
 * @example
 * hasPermission("admin", "DELETE_ANY_EQUIPMENT") // true
 * hasPermission("renter", "DELETE_ANY_EQUIPMENT") // false
 */
export const hasPermission = (
  userRole: UserRole,
  permission: keyof typeof PERMISSIONS
): boolean => {
  if (!userRole) return false;
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles.includes(userRole);
};

/**
 * Get user-friendly role name
 */
export const getRoleName = (role: UserRole): string => {
  const roleNames: Record<string, string> = {
    renter: "Renter",
    owner: "Owner",
    admin: "Administrator",
    null: "Unknown",
  };
  return roleNames[role || "null"] || "Unknown";
};

/**
 * Get role badge color for UI
 */
export const getRoleBadgeColor = (role: UserRole): string => {
  const colors: Record<string, string> = {
    renter: "bg-blue-100 text-blue-800",
    owner: "bg-green-100 text-green-800",
    admin: "bg-purple-100 text-purple-800",
    null: "bg-gray-100 text-gray-800",
  };
  return colors[role || "null"] || colors.null;
};
