import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useRoleMode } from "@/contexts/RoleModeContext";
import { useToast } from "@/hooks/useToast";
import {
  LayoutDashboard,
  Search,
  MessageSquare,
  Shield,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelector from "@/components/LanguageSelector";
import { useAdminAccess } from "@/hooks/useAdminAccess";

const UserMenu = () => {
  const { t } = useTranslation("navigation");
  const { user, signOut } = useAuth();
  const { activeMode } = useRoleMode();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const { isAdmin } = useAdminAccess();

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        console.error("Sign out error:", error);
        toast({
          variant: "destructive",
          title: t("errors.signout_failed_title"),
          description:
            error instanceof Error
              ? error.message
              : t("errors.signout_failed_message"),
        });
        return;
      }
      setIsOpen(false);
      void navigate("/");
    } catch (error) {
      console.error("Unexpected sign out error:", error);
      const message =
        error instanceof Error
          ? error.message
          : t("errors.signout_failed_message");
      toast({
        variant: "destructive",
        title: t("errors.signout_failed_title"),
        description: message,
      });
    }
  };

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    void navigate(path);
  };

  const getInitials = (email?: string | null) => {
    if (!email) return "U";

    // Try to get initials from email
    const namePart = email.split("@")[0];
    const parts = namePart.split(/[._-]/);

    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    return namePart.substring(0, 2).toUpperCase();
  };

  const getDashboardPath = () => {
    return activeMode === "owner" ? "/owner/dashboard" : "/renter/dashboard";
  };

  if (!user) return null;

  const initials = getInitials(user.email);
  const displayName = user.user_metadata?.fullName || user.email;
  const roleLabel = isAdmin
    ? "Admin"
    : activeMode === "owner"
      ? t("user_role.equipment_owner")
      : t("user_role.renter");

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        className="flex items-center space-x-2 focus:outline-none"
        aria-label={t("aria.user_menu")}
      >
        {/* User Avatar with Initials */}
        <div className="flex items-center space-x-2 hover:opacity-90 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 text-white flex items-center justify-center font-semibold text-sm shadow-md ring-2 ring-white/20 dark:ring-white/10">
            {initials}
          </div>
          <ChevronDown
            className={`h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform hidden sm:block ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        {/* User Info */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <p className="text-sm font-semibold text-foreground truncate">
            {displayName}
          </p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{roleLabel}</p>
        </div>

        {/* Navigation Items */}
        <DropdownMenuItem
          onClick={() => handleNavigation(getDashboardPath())}
        >
          <LayoutDashboard className="h-4 w-4 text-gray-500" />
          <span>{t("menu.dashboard")}</span>
        </DropdownMenuItem>

        {isAdmin && (
          <DropdownMenuItem onClick={() => handleNavigation("/admin")}>
            <ShieldCheck className="h-4 w-4 text-gray-500" />
            <span>Admin</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={() => handleNavigation("/equipment")}>
          <Search className="h-4 w-4 text-gray-500" />
          <span>{t("menu.browse_equipment")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleNavigation("/messages")}>
          <MessageSquare className="h-4 w-4 text-gray-500" />
          <span>{t("menu.messages")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleNavigation("/verification")}>
          <Shield className="h-4 w-4 text-gray-500" />
          <span>{t("menu.verification")}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => handleNavigation("/settings")}>
          <Settings className="h-4 w-4 text-gray-500" />
          <span>{t("menu.settings")}</span>
        </DropdownMenuItem>

        <ThemeToggle variant="menu-item" />

        <LanguageSelector variant="menu-item" />

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            void handleSignOut();
          }}
          className="text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          <span>{t("menu.sign_out")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
