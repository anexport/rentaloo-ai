import { Shield, Check, X, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { VerificationStatus } from "../../types/verification";

interface VerificationBadgeProps {
  status: VerificationStatus;
  type?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const VerificationBadge = ({
  status,
  type = "identity",
  size = "md",
  showLabel = true,
}: VerificationBadgeProps) => {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const getStatusConfig = () => {
    switch (status) {
      case "verified":
        return {
          icon: <Check className={sizeClasses[size]} />,
          color: "bg-green-100 text-green-800",
          label: "Verified",
        };
      case "pending":
        return {
          icon: <Clock className={sizeClasses[size]} />,
          color: "bg-yellow-100 text-yellow-800",
          label: "Pending",
        };
      case "rejected":
        return {
          icon: <X className={sizeClasses[size]} />,
          color: "bg-red-100 text-red-800",
          label: "Rejected",
        };
      default:
        return {
          icon: <Shield className={sizeClasses[size]} />,
          color: "bg-gray-100 text-gray-800",
          label: "Unverified",
        };
    }
  };

  const config = getStatusConfig();

  if (!showLabel) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full p-1 ${config.color}`}
        title={`${type} ${config.label}`}
      >
        {config.icon}
      </div>
    );
  }

  return (
    <Badge className={config.color}>
      {config.icon}
      <span className="ml-1 capitalize">{config.label}</span>
    </Badge>
  );
};

export default VerificationBadge;
