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
  return dateFormatter.format(new Date(`${dateValue}T00:00:00`));
};
