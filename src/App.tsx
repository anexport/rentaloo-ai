import { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { NuqsAdapter } from "nuqs/adapters/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/react";

// Lazy-loaded page components
const EmailVerification = lazy(() => import("@/pages/auth/EmailVerification"));
const RenterDashboard = lazy(() => import("@/pages/renter/RenterDashboard"));
const OwnerDashboard = lazy(() => import("@/pages/owner/OwnerDashboard"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const ExplorePage = lazy(() => import("@/pages/ExplorePage"));
const EquipmentDetailPage = lazy(() => import("@/pages/equipment/EquipmentDetailPage"));
const MessagingPage = lazy(() => import("@/pages/MessagingPage"));
const PaymentConfirmation = lazy(() => import("@/pages/payment/PaymentConfirmation"));
const PaymentsPage = lazy(() => import("@/pages/renter/PaymentsPage"));
const VerifyIdentity = lazy(() => import("@/pages/verification/VerifyIdentity"));
const ProfileSettings = lazy(() => import("@/pages/ProfileSettings"));
const SupportPage = lazy(() => import("@/pages/SupportPage"));
const EquipmentInspectionPage = lazy(() => import("@/pages/inspection/EquipmentInspectionPage"));
const InspectionView = lazy(() => import("@/components/inspection/InspectionView"));
const FileClaimPage = lazy(() => import("@/pages/claims/FileClaimPage"));
const ReviewClaimPage = lazy(() => import("@/pages/claims/ReviewClaimPage"));
const ManageClaimPage = lazy(() => import("@/pages/claims/ManageClaimPage"));
const ActiveRentalPage = lazy(() => import("@/pages/rental/ActiveRentalPage"));
const OwnerUpgrade = lazy(() => import("@/pages/owner/OwnerUpgrade"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
);

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
    <>
      <Router>
        <NuqsAdapter>
          <div className="min-h-screen bg-background">
            <Suspense fallback={<PageLoader />}>
              <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
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
            <Route path="/verify" element={<EmailVerification />} />
            <Route
              path="/equipment"
              element={<Navigate to="/explore" replace />}
            />
            <Route path="/equipment/:id" element={<EquipmentDetailPage />} />

            {/* Protected routes */}
            {user && (
              <>
                <Route path="/renter" element={<RenterDashboard />} />
                <Route path="/renter/dashboard" element={<RenterDashboard />} />
                <Route path="/renter/payments" element={<PaymentsPage />} />
                <Route path="/rental/:bookingId" element={<ActiveRentalPage />} />
                <Route path="/owner" element={<OwnerDashboard />} />
                <Route path="/owner/dashboard" element={<OwnerDashboard />} />
                <Route path="/owner/become-owner" element={<OwnerUpgrade />} />
                <Route path="/messages" element={<MessagingPage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route
                  path="/payment/confirmation"
                  element={<PaymentConfirmation />}
                />
                <Route path="/verification" element={<VerifyIdentity />} />
                <Route path="/settings" element={<ProfileSettings />} />
                <Route
                  path="/inspection/:bookingId/:type"
                  element={<EquipmentInspectionPage />}
                />
                <Route
                  path="/inspection/:bookingId/view/:inspectionType"
                  element={<InspectionView />}
                />
                <Route
                  path="/claims/file/:bookingId"
                  element={<FileClaimPage />}
                />
                <Route
                  path="/claims/review/:claimId"
                  element={<ReviewClaimPage />}
                />
                <Route
                  path="/claims/manage/:claimId"
                  element={<ManageClaimPage />}
                />
              </>
            )}
              </Routes>
            </Suspense>
            <Toaster />
          </div>
        </NuqsAdapter>
      </Router>
      <Analytics />
    </>
  );
}

export default App;
