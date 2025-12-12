import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("auth");
  const [selectedRole, setSelectedRole] = useState<"renter" | "owner" | null>(
    initialRole || null
  );
  const [showRoleSelection, setShowRoleSelection] = useState(!initialRole);
  const navigate = useNavigate();
  const dialogElementRef = useRef<Element | null>(null);

  // Callback to scroll dialog to top (using cached ref)
  const scrollToTop = useCallback(() => {
    // Cache dialog element on first call
    if (!dialogElementRef.current) {
      dialogElementRef.current = document.querySelector('[role="dialog"]');
    }
    dialogElementRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Handle state updates when modal opens/closes or initialRole changes
  useEffect(() => {
    if (!open) {
      // Reset when modal closes
      setSelectedRole(initialRole || null);
      setShowRoleSelection(!initialRole);
      // Clear cached dialog ref when modal closes
      dialogElementRef.current = null;
    } else if (initialRole) {
      // Update immediately when initialRole becomes non-null while modal is open
      setSelectedRole(initialRole);
      setShowRoleSelection(false);
    }
  }, [open, initialRole]);

  // Scroll to top when role changes or when returning to role selection
  useEffect(() => {
    scrollToTop();
  }, [selectedRole, showRoleSelection, scrollToTop]);

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
              <DialogTitle className="text-2xl">{t("signup.title")}</DialogTitle>
              <DialogDescription>
                {t("signup.subtitle")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Renter Option */}
              <button
                type="button"
                onClick={() => handleRoleSelect("renter")}
                className="w-full text-left p-6 rounded-lg border-2 border-border hover:border-primary transition-colors hover:bg-accent/50"
                aria-label={t("signup.renter_option_title")}
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">
                      {t("signup.renter_option_title")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("signup.renter_option_description")}
                    </p>
                  </div>
                </div>
              </button>

              {/* Owner Option */}
              <button
                type="button"
                onClick={() => handleRoleSelect("owner")}
                className="w-full text-left p-6 rounded-lg border-2 border-border hover:border-primary transition-colors hover:bg-accent/50"
                aria-label={t("signup.owner_option_title")}
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">
                      {t("signup.owner_option_title")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("signup.owner_option_description")}
                    </p>
                  </div>
                </div>
              </button>

              {/* Reassuring message about role flexibility */}
              <p className="text-sm text-muted-foreground text-center pt-2">
                {t("signup.role_flexibility_message")}
              </p>

              {/* Login Link */}
              <div className="text-center pt-4">
                <p className="text-sm text-muted-foreground">
                  {t("signup.already_have_account")}{" "}
                  <button
                    type="button"
                    onClick={handleShowLogin}
                    className="text-primary hover:underline font-medium"
                  >
                    {t("signup.login_link")}
                  </button>
                </p>
              </div>
            </div>
          </>
        ) : selectedRole === "renter" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>{t("signup.renter.join_title")}</DialogTitle>
              <DialogDescription>
                {t("signup.renter.join_subtitle")}
              </DialogDescription>
            </DialogHeader>
            <RenterSignupForm
              onSuccess={handleSignupSuccess}
              onBack={handleBackToRoleSelection}
              onShowLogin={handleShowLogin}
              onScrollToTop={scrollToTop}
            />
          </>
        ) : selectedRole === "owner" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>{t("signup.owner.join_title")}</DialogTitle>
              <DialogDescription>
                {t("signup.owner.join_subtitle")}
              </DialogDescription>
            </DialogHeader>
            <OwnerSignupForm
              onSuccess={handleSignupSuccess}
              onBack={handleBackToRoleSelection}
              onShowLogin={handleShowLogin}
              onScrollToTop={scrollToTop}
            />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default SignupModal;
