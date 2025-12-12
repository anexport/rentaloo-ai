import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { NuqsAdapter } from "nuqs/adapters/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import EmailVerification from "@/pages/auth/EmailVerification";
import RenterDashboard from "@/pages/renter/RenterDashboard";
import OwnerDashboard from "@/pages/owner/OwnerDashboard";
import HomePage from "@/pages/HomePage";
import ExplorePage from "@/pages/ExplorePage";
import EquipmentDetailPage from "@/pages/equipment/EquipmentDetailPage";
import MessagingPage from "@/pages/MessagingPage";
import PaymentConfirmation from "@/pages/payment/PaymentConfirmation";
import PaymentsPage from "@/pages/renter/PaymentsPage";
import VerifyIdentity from "@/pages/verification/VerifyIdentity";
import ProfileSettings from "@/pages/ProfileSettings";
import SupportPage from "@/pages/SupportPage";
import EquipmentInspectionPage from "@/pages/inspection/EquipmentInspectionPage";
import InspectionView from "@/components/inspection/InspectionView";
import FileClaimPage from "@/pages/claims/FileClaimPage";
import ReviewClaimPage from "@/pages/claims/ReviewClaimPage";
import ActiveRentalPage from "@/pages/rental/ActiveRentalPage";
import { Analytics } from "@vercel/analytics/react";
import OwnerUpgrade from "@/pages/owner/OwnerUpgrade";

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
              </>
            )}
            </Routes>
            <Toaster />
          </div>
        </NuqsAdapter>
      </Router>
      <Analytics />
    </>
  );
}

export default App;
