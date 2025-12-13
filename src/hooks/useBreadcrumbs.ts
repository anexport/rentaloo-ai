import { useLocation } from "react-router-dom";
import {
  Calendar,
  DollarSign,
  Heart,
  Home,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Package,
  Settings,
  Shield,
  Sparkles,
  Star,
} from "lucide-react";
import { useRoleMode } from "@/contexts/RoleModeContext";

export interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const useBreadcrumbs = (): BreadcrumbItem[] => {
  const location = useLocation();
  const { activeMode, isAlsoOwner } = useRoleMode();
  const path = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const tab = searchParams.get("tab");

  // Normalize alias routes to their canonical dashboard routes
  const normalizedPath =
    path === "/renter"
      ? "/renter/dashboard"
      : path === "/owner"
        ? "/owner/dashboard"
        : path;

  const isRenterDashboard = normalizedPath === "/renter/dashboard";
  const isOwnerDashboard = normalizedPath === "/owner/dashboard";

  const dashboardHome =
    normalizedPath.startsWith("/owner")
      ? isAlsoOwner
        ? "/owner/dashboard"
        : "/renter/dashboard"
      : normalizedPath.startsWith("/renter")
        ? "/renter/dashboard"
        : activeMode === "owner"
          ? "/owner/dashboard"
          : "/renter/dashboard";
  
  // Base breadcrumb
  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: dashboardHome.startsWith("/owner") ? "Owner Dashboard" : "Renter Dashboard",
      href: dashboardHome,
      icon: dashboardHome.startsWith("/owner") ? Package : Home,
    },
  ];

  // Dashboard overview breadcrumb
  if ((isRenterDashboard || isOwnerDashboard) && (!tab || tab === "overview")) {
    breadcrumbs.push({
      label: "Overview",
      href: isOwnerDashboard ? "/owner/dashboard?tab=overview" : "/renter/dashboard?tab=overview",
      icon: LayoutDashboard,
    });
    return breadcrumbs;
  }

  // Dashboard tab breadcrumbs
  if (isRenterDashboard && tab) {
    if (tab === "bookings") {
      breadcrumbs.push({
        label: "My Bookings",
        href: "/renter/dashboard?tab=bookings",
        icon: Calendar,
      });
      return breadcrumbs;
    }
    if (tab === "saved") {
      breadcrumbs.push({
        label: "Saved",
        href: "/renter/dashboard?tab=saved",
        icon: Heart,
      });
      return breadcrumbs;
    }
  }

  if (isOwnerDashboard && tab && tab !== "overview") {
    const ownerTabMap: Record<string, BreadcrumbItem> = {
      equipment: { label: "Equipment", href: "/owner/dashboard?tab=equipment", icon: Package },
      bookings: { label: "Booking Requests", href: "/owner/dashboard?tab=bookings", icon: Calendar },
      messages: { label: "Messages", href: "/owner/dashboard?tab=messages", icon: MessageSquare },
      reviews: { label: "Reviews", href: "/owner/dashboard?tab=reviews", icon: Star },
      payments: { label: "Payments", href: "/owner/dashboard?tab=payments", icon: DollarSign },
    };

    const crumb = ownerTabMap[tab];
    if (crumb) {
      breadcrumbs.push(crumb);
      return breadcrumbs;
    }
  }

  // Route mapping (non-dashboard pages rendered inside DashboardLayout)
  const routeMap: Record<string, BreadcrumbItem[]> = {
    "/renter/payments": [{ label: "Payments", href: "/renter/payments", icon: DollarSign }],
    "/owner/become-owner": [{ label: "Become an Owner", href: "/owner/become-owner", icon: Sparkles }],
    "/messages": [{ label: "Messages", href: "/messages", icon: MessageSquare }],
    "/support": [{ label: "Support", href: "/support", icon: LifeBuoy }],
    "/settings": [{ label: "Settings", href: "/settings", icon: Settings }],
    "/verification": [{ label: "Verification", href: "/verification", icon: Shield }],
    "/payment/confirmation": [
      { label: "Payments", href: "/renter/payments", icon: DollarSign },
      { label: "Confirmation", href: "/payment/confirmation", icon: DollarSign },
    ],
  };

  breadcrumbs.push(...(routeMap[normalizedPath] || []));
  return breadcrumbs;
};
