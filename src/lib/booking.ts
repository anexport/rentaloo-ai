import type {
  BookingCalculation,
  AvailabilitySlot,
  BookingConflict,
} from "../types/booking";

export const calculateBookingTotal = (
  dailyRate: number,
  startDate: string,
  endDate: string,
  customRates?: AvailabilitySlot[]
): BookingCalculation => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  let subtotal = 0;

  // Calculate subtotal based on custom rates if available
  if (customRates && customRates.length > 0) {
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = currentDate.toISOString().split("T")[0];

      const customSlot = customRates.find((slot) => slot.date === dateStr);
      const rate = customSlot?.custom_rate || dailyRate;
      subtotal += rate;
    }
  } else {
    subtotal = dailyRate * days;
  }

  // Calculate fees (5% service fee)
  const serviceFeeRate = 0.05;
  const fees = subtotal * serviceFeeRate;
  const total = subtotal + fees;

  return {
    daily_rate: dailyRate,
    days,
    subtotal,
    fees,
    total,
    currency: "USD",
  };
};

export const checkBookingConflicts = (
  equipmentId: string,
  startDate: string,
  endDate: string,
  existingBookings: any[]
): BookingConflict[] => {
  const conflicts: BookingConflict[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Check minimum rental period (1 day)
  if (days < 1) {
    conflicts.push({
      type: "minimum_days",
      message: "Minimum rental period is 1 day",
    });
  }

  // Check maximum rental period (30 days)
  if (days > 30) {
    conflicts.push({
      type: "maximum_days",
      message: "Maximum rental period is 30 days",
    });
  }

  // Check for overlapping bookings
  const overlappingBookings = existingBookings.filter((booking) => {
    const bookingStart = new Date(booking.start_date);
    const bookingEnd = new Date(booking.end_date);

    return (
      (start <= bookingStart && end > bookingStart) ||
      (start < bookingEnd && end >= bookingEnd) ||
      (start >= bookingStart && end <= bookingEnd)
    );
  });

  if (overlappingBookings.length > 0) {
    conflicts.push({
      type: "overlap",
      message: "Selected dates overlap with existing bookings",
      conflicting_dates: overlappingBookings.map((b) => b.start_date),
    });
  }

  return conflicts;
};

export const formatBookingDate = (date: string): string => {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatBookingDuration = (
  startDate: string,
  endDate: string
): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (days === 1) {
    return "1 day";
  } else if (days < 7) {
    return `${days} days`;
  } else {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    if (remainingDays === 0) {
      return `${weeks} week${weeks > 1 ? "s" : ""}`;
    } else {
      return `${weeks} week${weeks > 1 ? "s" : ""} ${remainingDays} day${
        remainingDays > 1 ? "s" : ""
      }`;
    }
  }
};

export const getBookingStatusColor = (status: string): string => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "approved":
      return "bg-green-100 text-green-800";
    case "declined":
      return "bg-red-100 text-red-800";
    case "cancelled":
      return "bg-gray-100 text-gray-800";
    case "completed":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getBookingStatusText = (status: string): string => {
  switch (status) {
    case "pending":
      return "Pending Approval";
    case "approved":
      return "Approved";
    case "declined":
      return "Declined";
    case "cancelled":
      return "Cancelled";
    case "completed":
      return "Completed";
    default:
      return "Unknown";
  }
};
