import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  LayoutDashboard,
  Search,
  MessageSquare,
  Shield,
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

const UserMenu = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<"owner" | "renter" | null>(null);

  useEffect(() => {
    if (user?.user_metadata?.role) {
      setUserRole(user.user_metadata.role as "owner" | "renter");
    } else {
      setUserRole(null);
    }
  }, [user]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error("Sign out error:", error);
      toast({
        variant: "destructive",
        title: "Sign out failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to sign out. Please try again.",
      });
      return;
    }
    setIsOpen(false);
    void navigate("/");
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
    return userRole === "owner" ? "/owner/dashboard" : "/renter/dashboard";
  };

  if (!user) return null;

  const initials = getInitials(user.email);
  const displayName = user.user_metadata?.fullName || user.email;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        className="flex items-center space-x-2 focus:outline-none"
        aria-label="User menu"
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
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {userRole == null
              ? "Loading..."
              : userRole === "owner"
                ? "Equipment Owner"
                : "Renter"}
          </p>
        </div>

        {/* Navigation Items */}
        <DropdownMenuItem
          onClick={() => handleNavigation(getDashboardPath())}
        >
          <LayoutDashboard className="h-4 w-4 text-gray-500" />
          <span>Dashboard</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleNavigation("/equipment")}>
          <Search className="h-4 w-4 text-gray-500" />
          <span>Browse Equipment</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleNavigation("/messages")}>
          <MessageSquare className="h-4 w-4 text-gray-500" />
          <span>Messages</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleNavigation("/verification")}>
          <Shield className="h-4 w-4 text-gray-500" />
          <span>Verification</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => handleNavigation("/settings")}>
          <Settings className="h-4 w-4 text-gray-500" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <ThemeToggle variant="menu-item" />
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            void handleSignOut();
          }}
          className="text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
