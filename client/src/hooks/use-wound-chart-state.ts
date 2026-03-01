import { useState, useCallback } from "react";

/**
 * Chart line visibility state
 */
export interface ChartLineVisibility {
  surface: boolean;
  prev: boolean;
  change: boolean;
}

/**
 * Default visibility - all lines visible
 */
const DEFAULT_VISIBILITY: ChartLineVisibility = {
  surface: true,
  prev: true,
  change: true,
};

/**
 * Hook for managing chart line visibility state across multiple wounds/charts
 * 
 * @example
 * ```tsx
 * const { getVisibility, toggleLine } = useChartVisibility();
 * 
 * <LineChart>
 *   {getVisibility(woundId).surface && <Line dataKey="surface" />}
 *   {getVisibility(woundId).prev && <Line dataKey="prev" />}
 * </LineChart>
 * 
 * <Button onClick={() => toggleLine(woundId, 'surface')}>Toggle Surface</Button>
 * ```
 */
export function useChartVisibility() {
  const [chartVisibility, setChartVisibility] = useState<Record<string, ChartLineVisibility>>({});

  const getVisibility = useCallback(
    (woundId: string): ChartLineVisibility => {
      return chartVisibility[woundId] || DEFAULT_VISIBILITY;
    },
    [chartVisibility]
  );

  const toggleLine = useCallback(
    (woundId: string, line: keyof ChartLineVisibility) => {
      setChartVisibility((prev) => ({
        ...prev,
        [woundId]: {
          ...(prev[woundId] || DEFAULT_VISIBILITY),
          [line]: !(prev[woundId]?.[line] ?? DEFAULT_VISIBILITY[line]),
        },
      }));
    },
    []
  );

  const setVisibility = useCallback(
    (woundId: string, visibility: ChartLineVisibility) => {
      setChartVisibility((prev) => ({
        ...prev,
        [woundId]: visibility,
      }));
    },
    []
  );

  const resetVisibility = useCallback((woundId?: string) => {
    if (woundId) {
      setChartVisibility((prev) => {
        const newState = { ...prev };
        delete newState[woundId];
        return newState;
      });
    } else {
      setChartVisibility({});
    }
  }, []);

  return {
    chartVisibility,
    getVisibility,
    toggleLine,
    setVisibility,
    resetVisibility,
  };
}

/**
 * Hook for managing selected encounter date per wound
 * 
 * @example
 * ```tsx
 * const { getSelectedDate, handleEncounterDateClick } = useEncounterDateSelection();
 * 
 * <Badge onClick={() => handleEncounterDateClick(woundKey, date)}>
 *   {date}
 * </Badge>
 * ```
 */
export function useEncounterDateSelection() {
  const [selectedEncounterDate, setSelectedEncounterDate] = useState<Record<string, string>>({});

  /**
   * Get selected encounter date for a wound, defaulting to most recent
   */
  const getSelectedDate = useCallback(
    (woundKey: string, history: Array<{ dos: string }>): string => {
      if (selectedEncounterDate[woundKey]) {
        return selectedEncounterDate[woundKey];
      }
      // Default to most recent encounter (last in array)
      return history[history.length - 1]?.dos || '';
    },
    [selectedEncounterDate]
  );

  /**
   * Handle click on encounter date row
   */
  const handleEncounterDateClick = useCallback(
    (woundKey: string, date: string) => {
      setSelectedEncounterDate((prev) => ({
        ...prev,
        [woundKey]: date,
      }));
    },
    []
  );

  /**
   * Reset selection for a specific wound or all wounds
   */
  const resetSelection = useCallback((woundKey?: string) => {
    if (woundKey) {
      setSelectedEncounterDate((prev) => {
        const newState = { ...prev };
        delete newState[woundKey];
        return newState;
      });
    } else {
      setSelectedEncounterDate({});
    }
  }, []);

  return {
    selectedEncounterDate,
    getSelectedDate,
    handleEncounterDateClick,
    resetSelection,
  };
}

/**
 * Combined hook for modal wound chart state management
 * Provides both chart visibility and encounter date selection
 */
export function useWoundChartState() {
  const chartVisibility = useChartVisibility();
  const encounterDateSelection = useEncounterDateSelection();

  const resetAll = useCallback(() => {
    chartVisibility.resetVisibility();
    encounterDateSelection.resetSelection();
  }, [chartVisibility, encounterDateSelection]);

  return {
    ...chartVisibility,
    ...encounterDateSelection,
    resetAll,
  };
}
