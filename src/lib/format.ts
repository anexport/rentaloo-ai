const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export const formatDateRange = (start: string, end: string) => {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  return `${dateFormatter.format(startDate)} - ${dateFormatter.format(endDate)}`;
};

export const formatDateLabel = (dateValue: string | null) => {
  if (!dateValue) return "No payouts yet";
  // Handle both date-only strings ("2024-01-15") and full ISO timestamps ("2024-01-15T10:30:00.000Z")
  const date = dateValue.includes("T")
    ? new Date(dateValue)
    : new Date(`${dateValue}T00:00:00`);
  return dateFormatter.format(date);
};
