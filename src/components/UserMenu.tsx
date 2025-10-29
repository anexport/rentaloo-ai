import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<"owner" | "renter" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const role = user.user_metadata?.role as "owner" | "renter" | undefined;
        if (role) {
          setUserRole(role);
        }
      }
    };

    fetchUserRole();
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
    navigate("/");
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
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
    <DropdownMenu ref={menuRef}>
      <DropdownMenuTrigger
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 focus:outline-none"
        aria-label="User menu"
      >
        {/* User Avatar with Initials */}
        <div className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm">
            {initials}
          </div>
          <ChevronDown
            className={`h-4 w-4 text-gray-600 transition-transform hidden sm:block ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </DropdownMenuTrigger>

      {isOpen && (
        <DropdownMenuContent>
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {displayName}
            </p>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {userRole === "owner" ? "Equipment Owner" : "Renter"}
            </p>
          </div>

          {/* Navigation Items */}
          <DropdownMenuItem
            onClick={() => handleNavigation(getDashboardPath())}
          >
            <div className="flex items-center space-x-3">
              <LayoutDashboard className="h-4 w-4 text-gray-500" />
              <span>Dashboard</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleNavigation("/equipment")}>
            <div className="flex items-center space-x-3">
              <Search className="h-4 w-4 text-gray-500" />
              <span>Browse Equipment</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleNavigation("/messages")}>
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              <span>Messages</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleNavigation("/verification")}>
            <div className="flex items-center space-x-3">
              <Shield className="h-4 w-4 text-gray-500" />
              <span>Verification</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => handleNavigation("/settings")}>
            <div className="flex items-center space-x-3">
              <Settings className="h-4 w-4 text-gray-500" />
              <span>Settings</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem>
            <ThemeToggle variant="menu-item" />
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-red-600 hover:bg-red-50"
          >
            <div className="flex items-center space-x-3">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
};

export default UserMenu;
