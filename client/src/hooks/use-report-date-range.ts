import { useState, useCallback } from "react";
import { format } from "date-fns";

/**
 * Custom hook to manage date range for reports
 * Provides start/end dates and their formatted string versions for API calls
 * Auto-swaps dates if start > end
 * Dates start as undefined until initialized with last enabled date
 */
export function useReportDateRange() {
  // Start undefined - pages will initialize to last enabled date
  const [startDate, setStartDateState] = useState<Date | undefined>(undefined);
  const [endDate, setEndDateState] = useState<Date | undefined>(undefined);

  // Set start date with auto-swap if needed
  const setStartDate = useCallback((date: Date) => {
    if (endDate && date > endDate) {
      // Swap: new start becomes end, old end becomes start
      setStartDateState(endDate);
      setEndDateState(date);
    } else {
      setStartDateState(date);
    }
  }, [endDate]);

  // Set end date with auto-swap if needed
  const setEndDate = useCallback((date: Date) => {
    if (startDate && date < startDate) {
      // Swap: new end becomes start, old start becomes end
      setEndDateState(startDate);
      setStartDateState(date);
    } else {
      setEndDateState(date);
    }
  }, [startDate]);

  // Format dates as yyyy-MM-dd for API calls (empty string if undefined)
  const startDateStr = startDate ? format(startDate, "yyyy-MM-dd") : "";
  const endDateStr = endDate ? format(endDate, "yyyy-MM-dd") : "";

  return {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    startDateStr,
    endDateStr,
    datesReady: !!startDate && !!endDate,
  };
}
