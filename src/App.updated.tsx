import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Auth pages
import EmailVerification from "@/pages/auth/EmailVerification";

// Renter pages
import RenterDashboard from "@/pages/renter/RenterDashboard";
import PaymentsPage from "@/pages/renter/PaymentsPage";

// Owner pages
import OwnerDashboard from "@/pages/owner/OwnerDashboard";

// Shared/Public pages
import ExplorePage from "@/pages/ExplorePage";
import EquipmentDetailPage from "@/pages/equipment/EquipmentDetailPage";
import MessagingPage from "@/pages/MessagingPage";
import PaymentConfirmation from "@/pages/payment/PaymentConfirmation";
import VerifyIdentity from "@/pages/verification/VerifyIdentity";
import ProfileSettings from "@/pages/ProfileSettings";

// TODO: Create admin pages
// import AdminDashboard from "@/pages/admin/AdminDashboard";
// import UserManagement from "@/pages/admin/UserManagement";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* ====================================
              PUBLIC ROUTES (No authentication required)
              ==================================== */}
          <Route path="/" element={<ExplorePage />} />

          {/* Auth redirects */}
          <Route
            path="/register/renter"
            element={<Navigate to="/?signup=true&role=renter" replace />}
          />
          <Route
            path="/register/owner"
            element={<Navigate to="/?signup=true&role=owner" replace />}
          />
          <Route
            path="/login"
            element={<Navigate to="/?login=true" replace />}
          />

          {/* Email verification */}
          <Route path="/verify" element={<EmailVerification />} />

          {/* Equipment browsing */}
          <Route path="/equipment" element={<Navigate to="/" replace />} />
          <Route path="/equipment/:id" element={<EquipmentDetailPage />} />

          {/* ====================================
              AUTHENTICATED ROUTES (Any logged-in user)
              ==================================== */}

          {/* Messaging - accessible to all authenticated users */}
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagingPage />
              </ProtectedRoute>
            }
          />

          {/* Payment confirmation - accessible to all authenticated users */}
          <Route
            path="/payment/confirmation"
            element={
              <ProtectedRoute>
                <PaymentConfirmation />
              </ProtectedRoute>
            }
          />

          {/* Verification - accessible to all authenticated users */}
          <Route
            path="/verification"
            element={
              <ProtectedRoute>
                <VerifyIdentity />
              </ProtectedRoute>
            }
          />

          {/* Profile settings - accessible to all authenticated users */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />

          {/* ====================================
              RENTER-ONLY ROUTES
              ==================================== */}

          <Route
            path="/renter"
            element={
              <ProtectedRoute requiredRole="renter" showError>
                <RenterDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/renter/dashboard"
            element={
              <ProtectedRoute requiredRole="renter" showError>
                <RenterDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/renter/payments"
            element={
              <ProtectedRoute requiredRole="renter" showError>
                <PaymentsPage />
              </ProtectedRoute>
            }
          />

          {/* ====================================
              OWNER-ONLY ROUTES
              ==================================== */}

          <Route
            path="/owner"
            element={
              <ProtectedRoute requiredRole="owner" showError>
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/dashboard"
            element={
              <ProtectedRoute requiredRole="owner" showError>
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />

          {/* ====================================
              ADMIN-ONLY ROUTES
              ==================================== */}

          {/* Uncomment when admin pages are created */}
          {/*
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin" showError>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRole="admin" showError>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          */}

          {/* ====================================
              MULTI-ROLE ROUTES (Accessible to multiple roles)
              ==================================== */}

          {/* Example: Equipment management accessible to owners and admins */}
          {/*
          <Route
            path="/equipment/manage"
            element={
              <ProtectedRoute requiredRole={["owner", "admin"]} showError>
                <EquipmentManagement />
              </ProtectedRoute>
            }
          />
          */}

          {/* ====================================
              CATCH-ALL / 404
              ==================================== */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster />
      </div>
    </Router>
  );
}

export default App;
