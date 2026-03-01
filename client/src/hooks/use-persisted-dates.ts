import { useState, useEffect, useCallback } from "react";
import { onAuthEvent, AUTH_EVENTS, dispatchAuthEvent } from "@/lib/auth-events";

// Storage keys
const STORAGE_KEY_START = "wdc_startDate";
const STORAGE_KEY_END = "wdc_endDate";
const STORAGE_KEY_FACILITY = "wdc_datesFacility";

// Custom event for date synchronization between components
const DATE_CHANGED_EVENT = "wdc_dates_changed";

interface PersistedDatesOptions {
  /** Facility ID for scoping dates */
  facilityId: string | null;
  /** Whether to use single date mode (start = end) */
  singleDateMode?: boolean;
}

/**
 * Hook for persisting date picker selections across page navigation.
 * Dates are stored in sessionStorage and cleared when facility changes.
 */
export function usePersistedDates({ facilityId, singleDateMode = false }: PersistedDatesOptions) {
  // Parse date from storage
  const parseStoredDate = (key: string): Date | undefined => {
    const stored = sessionStorage.getItem(key);
    if (!stored) return undefined;
    const [year, month, day] = stored.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;
    return new Date(year, month - 1, day);
  };

  // Check if stored dates belong to current facility
  const storedFacility = sessionStorage.getItem(STORAGE_KEY_FACILITY);
  const isSameFacility = storedFacility === facilityId;

  // Initialize from storage if same facility
  const [startDate, setStartDateState] = useState<Date | undefined>(() => {
    if (!isSameFacility || !facilityId) return undefined;
    return parseStoredDate(STORAGE_KEY_START);
  });

  const [endDate, setEndDateState] = useState<Date | undefined>(() => {
    if (!isSameFacility || !facilityId) return undefined;
    return parseStoredDate(STORAGE_KEY_END);
  });

  // Format date for storage
  const formatForStorage = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Set start date and persist (with auto-swap if start > end)
  const setStartDate = useCallback((date: Date | undefined) => {
    if (!date) {
      setStartDateState(undefined);
      sessionStorage.removeItem(STORAGE_KEY_START);
      return;
    }
    
    // Auto-swap if new start date is after current end date
    if (endDate && date > endDate && !singleDateMode) {
      // Swap: new start becomes end, old end becomes start
      setStartDateState(endDate);
      setEndDateState(date);
      if (facilityId) {
        sessionStorage.setItem(STORAGE_KEY_START, formatForStorage(endDate));
        sessionStorage.setItem(STORAGE_KEY_END, formatForStorage(date));
        sessionStorage.setItem(STORAGE_KEY_FACILITY, facilityId);
        window.dispatchEvent(new CustomEvent(DATE_CHANGED_EVENT, { 
          detail: { startDate: endDate, endDate: date } 
        }));
      }
    } else {
      setStartDateState(date);
      if (facilityId) {
        sessionStorage.setItem(STORAGE_KEY_START, formatForStorage(date));
        sessionStorage.setItem(STORAGE_KEY_FACILITY, facilityId);
        if (singleDateMode) {
          sessionStorage.setItem(STORAGE_KEY_END, formatForStorage(date));
          setEndDateState(date);
        }
        window.dispatchEvent(new CustomEvent(DATE_CHANGED_EVENT, { 
          detail: { startDate: date, endDate: singleDateMode ? date : endDate } 
        }));
      }
    }
  }, [facilityId, singleDateMode, endDate]);

  // Set end date and persist (with auto-swap if end < start)
  const setEndDate = useCallback((date: Date | undefined) => {
    if (!date) {
      setEndDateState(undefined);
      sessionStorage.removeItem(STORAGE_KEY_END);
      return;
    }
    
    // Auto-swap if new end date is before current start date
    if (startDate && date < startDate) {
      // Swap: new end becomes start, old start becomes end
      setEndDateState(startDate);
      setStartDateState(date);
      if (facilityId) {
        sessionStorage.setItem(STORAGE_KEY_END, formatForStorage(startDate));
        sessionStorage.setItem(STORAGE_KEY_START, formatForStorage(date));
        sessionStorage.setItem(STORAGE_KEY_FACILITY, facilityId);
        window.dispatchEvent(new CustomEvent(DATE_CHANGED_EVENT, { 
          detail: { startDate: date, endDate: startDate } 
        }));
      }
    } else {
      setEndDateState(date);
      if (facilityId) {
        sessionStorage.setItem(STORAGE_KEY_END, formatForStorage(date));
        sessionStorage.setItem(STORAGE_KEY_FACILITY, facilityId);
        window.dispatchEvent(new CustomEvent(DATE_CHANGED_EVENT, { 
          detail: { startDate, endDate: date } 
        }));
      }
    }
  }, [facilityId, startDate]);

  // Clear dates (e.g., on facility change)
  const clearDates = useCallback(() => {
    setStartDateState(undefined);
    setEndDateState(undefined);
    sessionStorage.removeItem(STORAGE_KEY_START);
    sessionStorage.removeItem(STORAGE_KEY_END);
    sessionStorage.removeItem(STORAGE_KEY_FACILITY);
  }, []);

  // Listen for facility changes - clear stored dates
  useEffect(() => {
    const unsubscribe = onAuthEvent(AUTH_EVENTS.FACILITY_CHANGED, (newFacilityId: string) => {
      console.log('[usePersistedDates] Facility changed, clearing stored dates');
      clearDates();
    });
    return unsubscribe;
  }, [clearDates]);

  // Listen for data import - clear stored dates so new range is used
  useEffect(() => {
    const unsubscribe = onAuthEvent(AUTH_EVENTS.DATA_IMPORTED, () => {
      console.log('[usePersistedDates] Data imported, clearing stored dates for refresh');
      clearDates();
    });
    return unsubscribe;
  }, [clearDates]);

  // Listen for date changes from other components
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { startDate: newStart, endDate: newEnd } = e.detail;
      if (newStart) setStartDateState(newStart);
      if (newEnd) setEndDateState(newEnd);
    };
    window.addEventListener(DATE_CHANGED_EVENT, handler as EventListener);
    return () => window.removeEventListener(DATE_CHANGED_EVENT, handler as EventListener);
  }, []);

  // Format dates for API calls
  const formatDateStr = (date: Date | undefined): string => {
    if (!date) return '';
    return formatForStorage(date);
  };

  return {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    clearDates,
    startDateStr: formatDateStr(startDate),
    endDateStr: formatDateStr(endDate),
    hasPersistedDates: isSameFacility && (!!startDate || !!endDate),
  };
}
