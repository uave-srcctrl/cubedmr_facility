import { useState } from "react";
import { format, subDays } from "date-fns";

/**
 * Custom hook to manage date range for reports
 * Provides start/end dates and their formatted string versions for API calls
 */
export function useReportDateRange() {
  // Default to last 30 days
  const [startDate, setStartDate] = useState<Date>(() => subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(() => new Date());

  // Format dates as yyyy-MM-dd for API calls
  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");

  return {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    startDateStr,
    endDateStr,
  };
}
