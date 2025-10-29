import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import LandingPage from "@/pages/LandingPage";
import RenterRegistration from "@/pages/auth/RenterRegistration";
import OwnerRegistration from "@/pages/auth/OwnerRegistration";
import LoginPage from "@/pages/auth/LoginPage";
import RenterDashboard from "@/pages/renter/RenterDashboard";
import OwnerDashboard from "@/pages/owner/OwnerDashboard";
import EquipmentSearch from "@/pages/EquipmentSearch";
import MessagingPage from "@/pages/MessagingPage";
import PaymentConfirmation from "@/pages/payment/PaymentConfirmation";
import VerifyIdentity from "@/pages/verification/VerifyIdentity";
import ProfileSettings from "@/pages/ProfileSettings";

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
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/register/renter" element={<RenterRegistration />} />
          <Route path="/register/owner" element={<OwnerRegistration />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/equipment" element={<EquipmentSearch />} />

          {/* Protected routes */}
          {user && (
            <>
              <Route path="/renter" element={<RenterDashboard />} />
              <Route path="/renter/dashboard" element={<RenterDashboard />} />
              <Route path="/owner" element={<OwnerDashboard />} />
              <Route path="/owner/dashboard" element={<OwnerDashboard />} />
              <Route path="/messages" element={<MessagingPage />} />
              <Route
                path="/payment/confirmation"
                element={<PaymentConfirmation />}
              />
              <Route path="/verification" element={<VerifyIdentity />} />
              <Route path="/settings" element={<ProfileSettings />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
