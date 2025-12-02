import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { User, Package } from "lucide-react";
import { useRoleMode } from "@/contexts/RoleModeContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RoleSwitcherProps {
  collapsed?: boolean;
  variant?: "sidebar" | "header";
}

const RoleSwitcher = ({ collapsed = false, variant = "sidebar" }: RoleSwitcherProps) => {
  const { t } = useTranslation("navigation");
  const navigate = useNavigate();
  const { activeMode, setActiveMode, isAlsoOwner, isLoading } = useRoleMode();

  // Don't render if user is not also an owner
  if (!isAlsoOwner || isLoading) {
    return null;
  }

  const handleModeChange = (mode: "renter" | "owner") => {
    if (mode !== activeMode) {
      setActiveMode(mode, navigate);
    }
  };

  if (variant === "header") {
    // Compact header variant
    return (
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
        <Button
          variant={activeMode === "renter" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleModeChange("renter")}
          className={cn(
            "h-7 px-2 text-xs",
            activeMode === "renter" && "shadow-sm"
          )}
          aria-label={t("role_switcher.switch_to_renter")}
        >
          <User className="h-3.5 w-3.5" />
          {!collapsed && <span className="ml-1.5">{t("role_switcher.renter_mode")}</span>}
        </Button>
        <Button
          variant={activeMode === "owner" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleModeChange("owner")}
          className={cn(
            "h-7 px-2 text-xs",
            activeMode === "owner" && "shadow-sm"
          )}
          aria-label={t("role_switcher.switch_to_owner")}
        >
          <Package className="h-3.5 w-3.5" />
          {!collapsed && <span className="ml-1.5">{t("role_switcher.owner_mode")}</span>}
        </Button>
      </div>
    );
  }

  // Sidebar variant
  return (
    <div className="px-2 pb-3">
      <div
        className={cn(
          "flex items-center gap-1 rounded-lg border border-border bg-card p-1 transition-all",
          collapsed && "flex-col"
        )}
      >
        <Button
          variant={activeMode === "renter" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleModeChange("renter")}
          className={cn(
            "flex-1 gap-2 text-xs font-medium transition-all",
            activeMode === "renter" && "shadow-sm",
            collapsed && "flex-col h-auto py-2"
          )}
          aria-label={collapsed ? t("role_switcher.switch_to_renter") : undefined}
          title={collapsed ? t("role_switcher.renter_mode") : undefined}
        >
          <User className={cn("h-4 w-4 shrink-0", activeMode === "renter" && "text-primary-foreground")} />
          {!collapsed && <span>{t("role_switcher.renter_mode")}</span>}
        </Button>
        <Button
          variant={activeMode === "owner" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleModeChange("owner")}
          className={cn(
            "flex-1 gap-2 text-xs font-medium transition-all",
            activeMode === "owner" && "shadow-sm",
            collapsed && "flex-col h-auto py-2"
          )}
          aria-label={collapsed ? t("role_switcher.switch_to_owner") : undefined}
          title={collapsed ? t("role_switcher.owner_mode") : undefined}
        >
          <Package className={cn("h-4 w-4 shrink-0", activeMode === "owner" && "text-primary-foreground")} />
          {!collapsed && <span>{t("role_switcher.owner_mode")}</span>}
        </Button>
      </div>
    </div>
  );
};

export default RoleSwitcher;

