import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Mountain, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";

// Validation messages will be translated in the component
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginFormData = z.infer<typeof loginSchema>;

type LoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const LoginModal = ({ open, onOpenChange }: LoginModalProps) => {
  const { t } = useTranslation("auth");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signInWithOAuth } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      reset();
      setError(null);
      setShowPassword(false);
    }
  }, [open, reset]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error, user: returnedUser } = await signIn(
        data.email,
        data.password
      );

      if (error) {
        setError(error.message);
      } else if (!returnedUser) {
        // Explicit defensive check: authentication succeeded but user data is missing
        setError(t("login.errors.auth_failed"));
      } else {
        // Close modal
        onOpenChange(false);
        // Redirect based on user role from returned user
        const role = returnedUser.user_metadata?.role;
        if (role === "renter") {
          void navigate("/renter/dashboard");
        } else if (role === "owner") {
          void navigate("/owner/dashboard");
        } else {
          void navigate("/");
        }
      }
    } catch {
      setError(t("login.errors.unexpected_error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowSignup = (role: "renter" | "owner") => {
    // Close login modal and open signup modal
    onOpenChange(false);
    // Navigate to signup modal with role
    void navigate(`/?signup=true&role=${role}`, { replace: true });
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleGoogleSignIn = async () => {
    setIsOAuthLoading(true);
    setError(null);

    try {
      const redirectTo = `${window.location.origin}/`;
      const { error } = await signInWithOAuth("google", redirectTo);

      if (error) {
        setError(error.message);
      }
      // Note: If successful, user will be redirected to Google OAuth page
      // and then back to the redirectTo URL. The modal will be closed
      // when the user returns and is authenticated.
    } catch {
      setError(t("login.errors.unexpected_error"));
    } finally {
      setIsOAuthLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Mountain className="h-12 w-12 text-primary" />
          </div>
          <DialogTitle className="text-2xl">{t("login.title")}</DialogTitle>
          <DialogDescription>
            {t("login.subtitle")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              void handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email_label")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoCapitalize="off"
                spellCheck="false"
                {...register("email")}
                placeholder={t("login.email_placeholder")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {t("login.errors.invalid_email")}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">{t("login.password_label")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  {...register("password")}
                  placeholder={t("login.password_placeholder")}
                  className="pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent"
                  onClick={handleTogglePassword}
                  aria-label={showPassword ? t("login.hide_password") : t("login.show_password")}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">
                  {t("login.errors.password_required")}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t("login.submitting") : t("login.submit_button")}
            </Button>
          </form>

          {/* OR Separator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t("login.or_separator")}
              </span>
            </div>
          </div>

          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isOAuthLoading || isLoading}
          >
            {isOAuthLoading ? (
              t("login.connecting")
            ) : (
              <div className="flex items-center justify-center gap-2">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>{t("login.google_button")}</span>
              </div>
            )}
          </Button>

          {/* Registration Links */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("login.no_account")}{" "}
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 font-normal"
                onClick={() => handleShowSignup("renter")}
              >
                {t("login.signup_renter")}
              </Button>
            </p>
            <p className="text-sm text-muted-foreground">
              {t("login.want_to_list")}{" "}
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 font-normal"
                onClick={() => handleShowSignup("owner")}
              >
                {t("login.signup_owner")}
              </Button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;
