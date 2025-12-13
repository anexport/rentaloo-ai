import type { ClaimStatus } from "@/types/claim";

export const getClaimStatusColor = (status: ClaimStatus): string => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "accepted":
      return "bg-green-100 text-green-800";
    case "disputed":
      return "bg-orange-100 text-orange-800";
    case "resolved":
      return "bg-blue-100 text-blue-800";
    case "escalated":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getClaimStatusText = (status: ClaimStatus): string => {
  switch (status) {
    case "pending":
      return "Pending Review";
    case "accepted":
      return "Accepted";
    case "disputed":
      return "Disputed";
    case "resolved":
      return "Resolved";
    case "escalated":
      return "Escalated";
    default:
      return status;
  }
};
