import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Required role(s) to access this route. If array, user must have ANY of the roles */
  requiredRole?: UserRole | UserRole[];
  /** Redirect path if user is not authenticated (default: "/?login=true") */
  redirectTo?: string;
  /** If true, shows a friendly error message instead of redirecting */
  showError?: boolean;
}

/**
 * ProtectedRoute component for role-based access control
 *
 * Features:
 * - Validates user authentication
 * - Validates user role against required role(s)
 * - Shows loading state while checking permissions
 * - Redirects unauthorized users or shows error message
 *
 * @example
 * // Protect route for owners only
 * <ProtectedRoute requiredRole="owner">
 *   <OwnerDashboard />
 * </ProtectedRoute>
 *
 * @example
 * // Protect route for owners OR admins
 * <ProtectedRoute requiredRole={["owner", "admin"]}>
 *   <EquipmentManagement />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = "/?login=true",
  showError = false,
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, hasRole, hasAnyRole } = useUserRole();
  const location = useLocation();

  // Show loading spinner while checking authentication and role
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if user is not authenticated
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If no role requirement, just check authentication
  if (!requiredRole) {
    return <>{children}</>;
  }

  // Check if user has required role(s)
  const hasRequiredRole = Array.isArray(requiredRole)
    ? hasAnyRole(requiredRole)
    : hasRole(requiredRole);

  if (!hasRequiredRole) {
    // Show error message instead of redirecting
    if (showError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Access Denied</AlertTitle>
              <AlertDescription className="mt-2">
                You don't have permission to access this page.
                {Array.isArray(requiredRole) ? (
                  <p className="mt-2">
                    Required role: {requiredRole.join(" or ")}
                  </p>
                ) : (
                  <p className="mt-2">Required role: {requiredRole}</p>
                )}
                <p className="mt-2">Your current role: {role || "unknown"}</p>
              </AlertDescription>
              <div className="mt-4">
                <Button
                  onClick={() => window.history.back()}
                  variant="outline"
                  className="mr-2"
                >
                  Go Back
                </Button>
                <Button onClick={() => (window.location.href = "/")}>
                  Go Home
                </Button>
              </div>
            </Alert>
          </div>
        </div>
      );
    }

    // Redirect to home page with error message in URL
    const roleStr = Array.isArray(requiredRole)
      ? requiredRole.join(",")
      : requiredRole;
    return (
      <Navigate
        to={`/?error=unauthorized&required=${roleStr}&current=${role}`}
        state={{ from: location }}
        replace
      />
    );
  }

  // User is authenticated and has required role
  return <>{children}</>;
}
