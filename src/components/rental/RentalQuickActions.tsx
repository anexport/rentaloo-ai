import { Link } from "react-router-dom";
import {
  MessageSquare,
  ClipboardCheck,
  MapPin,
  HelpCircle,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RentalQuickActionsProps {
  bookingId: string;
  ownerId?: string;
  equipmentLocation?: string;
  hasPickupInspection: boolean;
  showReturnAction?: boolean;
  className?: string;
  variant?: "grid" | "inline";
}

export default function RentalQuickActions({
  bookingId,
  ownerId,
  equipmentLocation,
  hasPickupInspection,
  showReturnAction = false,
  className,
  variant = "grid",
}: RentalQuickActionsProps) {
  const actions = [
    {
      id: "message",
      label: "Message Owner",
      icon: MessageSquare,
      href: `/messages${ownerId ? `?with=${ownerId}` : ""}`,
      variant: "outline" as const,
    },
    {
      id: "inspection",
      label: "View Inspection",
      icon: ClipboardCheck,
      href: `/inspection/${bookingId}/view/pickup`,
      variant: "outline" as const,
      disabled: !hasPickupInspection,
    },
    {
      id: "directions",
      label: "Directions",
      icon: MapPin,
      href: equipmentLocation
        ? `https://maps.google.com/maps?q=${encodeURIComponent(equipmentLocation)}`
        : "#",
      variant: "outline" as const,
      external: true,
      disabled: !equipmentLocation,
    },
    {
      id: "help",
      label: "Help",
      icon: HelpCircle,
      href: "/support",
      variant: "outline" as const,
    },
  ];

  // Add return action if applicable
  if (showReturnAction) {
    actions.push({
      id: "return",
      label: "Start Return",
      icon: Camera,
      href: `/inspection/${bookingId}/return`,
      variant: "default" as const,
    });
  }

  if (variant === "inline") {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {actions.map((action) => {
          const Icon = action.icon;
          const content = (
            <Button
              variant={action.variant}
              size="sm"
              disabled={action.disabled}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </Button>
          );

          if (action.disabled) {
            return (
              <span key={action.id}>
                {content}
              </span>
            );
          }

          if (action.external) {
            return (
              <a
                key={action.id}
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {content}
              </a>
            );
          }

          return (
            <Link key={action.id} to={action.href}>
              {content}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}>
      {actions.map((action) => {
        const Icon = action.icon;
        const content = (
          <Button
            variant={action.variant}
            disabled={action.disabled}
            className={cn(
              "flex flex-col items-center justify-center h-20 gap-2",
              action.variant === "default" && "col-span-2 sm:col-span-1"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        );

        if (action.disabled) {
          return <div key={action.id}>{content}</div>;
        }

        if (action.external) {
          return (
            <a
              key={action.id}
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {content}
            </a>
          );
        }

        return (
          <Link key={action.id} to={action.href}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}

