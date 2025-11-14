import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mountain, User, Store } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import RenterSignupForm from "./RenterSignupForm";
import OwnerSignupForm from "./OwnerSignupForm";

type SignupModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRole?: "renter" | "owner";
};

const SignupModal = ({ open, onOpenChange, initialRole }: SignupModalProps) => {
  const [selectedRole, setSelectedRole] = useState<"renter" | "owner" | null>(
    initialRole || null
  );
  const [showRoleSelection, setShowRoleSelection] = useState(!initialRole);
  const navigate = useNavigate();

  // Handle state updates when modal opens/closes or initialRole changes
  useEffect(() => {
    if (!open) {
      // Reset when modal closes
      setSelectedRole(initialRole || null);
      setShowRoleSelection(!initialRole);
    } else if (initialRole) {
      // Update immediately when initialRole becomes non-null while modal is open
      setSelectedRole(initialRole);
      setShowRoleSelection(false);
    }
  }, [open, initialRole]);

  const handleRoleSelect = (role: "renter" | "owner") => {
    setSelectedRole(role);
    setShowRoleSelection(false);
  };

  const handleBackToRoleSelection = () => {
    setShowRoleSelection(true);
    setSelectedRole(null);
  };

  const handleSignupSuccess = (email: string) => {
    // Close signup modal
    onOpenChange(false);
    // Navigate to verify page
    navigate("/verify", { state: { email } });
  };

  const handleShowLogin = () => {
    // Close signup modal and open login modal
    onOpenChange(false);
    // Navigate to login modal
    navigate("/?login=true", { replace: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {showRoleSelection ? (
          <>
            <DialogHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Mountain className="h-12 w-12 text-primary" />
              </div>
              <DialogTitle className="text-2xl">Join RentAloo</DialogTitle>
              <DialogDescription>
                Choose how you'd like to use RentAloo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Renter Option */}
              <button
                type="button"
                onClick={() => handleRoleSelect("renter")}
                className="w-full text-left p-6 rounded-lg border-2 border-border hover:border-primary transition-colors hover:bg-accent/50"
                aria-label="Sign up as a renter"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">
                      Join as a Renter
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Rent outdoor equipment from local owners. Perfect for
                      trying new activities or occasional adventures.
                    </p>
                  </div>
                </div>
              </button>

              {/* Owner Option */}
              <button
                type="button"
                onClick={() => handleRoleSelect("owner")}
                className="w-full text-left p-6 rounded-lg border-2 border-border hover:border-primary transition-colors hover:bg-accent/50"
                aria-label="Sign up as an owner"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">
                      Join as an Owner
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      List your equipment and earn money. Share your gear with
                      the community and start earning today.
                    </p>
                  </div>
                </div>
              </button>

              {/* Login Link */}
              <div className="text-center pt-4">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={handleShowLogin}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          </>
        ) : selectedRole === "renter" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Join as a Renter</DialogTitle>
              <DialogDescription>
                Create your account to start renting outdoor equipment
              </DialogDescription>
            </DialogHeader>
            <RenterSignupForm
              onSuccess={handleSignupSuccess}
              onBack={handleBackToRoleSelection}
              onShowLogin={handleShowLogin}
            />
          </>
        ) : selectedRole === "owner" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Join as an Owner</DialogTitle>
              <DialogDescription>
                Create your account to start listing your equipment
              </DialogDescription>
            </DialogHeader>
            <OwnerSignupForm
              onSuccess={handleSignupSuccess}
              onBack={handleBackToRoleSelection}
              onShowLogin={handleShowLogin}
            />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default SignupModal;
