import { useState, useEffect, useMemo, useRef } from "react";
import React from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Activity, Users, Stethoscope, AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { useEnabledDates } from "@/hooks/use-enabled-dates";
import { FacilityInfoBanner } from "@/components/facility-info-banner";
import { NoFacilityData } from "@/components/no-facility-data";
import { EcgLoader } from "@/components/ecg-loader";
import { useFacilityHasData } from "@/hooks/use-facility-has-data";
import { DataSourceBadge } from "@/components/data-source-badge";
import { onAuthEvent, AUTH_EVENTS } from "@/lib/auth-events";
import { LOCAL_API } from "@/lib/api-config";
import { usePersistedDates } from "@/hooks/use-persisted-dates";
import { logger } from "@/lib/logger";

export default function AcuityReport() {
  const { getToken, getSelectedFacility } = useAuth();
  const { isComponentEnabled } = useSettings();

  // Check if facility has wound encounter data
  const { hasData: facilityHasData, facilityName } = useFacilityHasData();

  // Get initial facility ID from storage/auth - don't use hardcoded fallback
  const getInitialFacilityId = () => {
    const selected = getSelectedFacility();
    return selected || null;
  };

  const [facilityId, setFacilityId] = useState<string | null>(() => {
    const initial = getInitialFacilityId();
    logger.debug('[AcuityReport] useState initializer: Initial facilityId:', initial);
    return initial;
  });

  // Persisted date picker state (single date mode)
  const {
    startDate: selectedDate,
    setStartDate: setSelectedDate,
    startDateStr: selectedDateStr,
    hasPersistedDates
  } = usePersistedDates({ facilityId, singleDateMode: true });

  // Listen for facility changes and update facilityId reactively
  useEffect(() => {
    logger.debug('[AcuityReport] Setting up facility change listener');

    // Listen for facility changes
    const unsubscribe = onAuthEvent(AUTH_EVENTS.FACILITY_CHANGED, (newFacilityId: string) => {
      logger.debug('[AcuityReport] 🔄 Facility changed event received:', newFacilityId);
      setFacilityId(newFacilityId);
    });

    return unsubscribe;
  }, []);

  const { data: enabledDates = [], isLoading: enabledDatesLoading } = useEnabledDates(facilityId || '1');

  // facilityId will always have a value (fallback to 5 if no selected facility/entityId)
  logger.debug("[AcuityReport] Loading dashboard for facilityId:", facilityId);
  logger.debug("[AcuityReport] Enabled dates:", enabledDates);
  logger.debug("[AcuityReport] enabledDatesLoading:", enabledDatesLoading);

  // Calculate first and last encounter dates from enabledDates
  const { firstEncounterDate, lastEncounterDate } = useMemo(() => {
    if (enabledDates && enabledDates.length > 0) {
      const sorted = [...enabledDates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      const parseDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      };
      logger.debug("[AcuityReport] Date range from enabledDates:", sorted[0], "to", sorted[sorted.length - 1]);
      return {
        firstEncounterDate: parseDate(sorted[0]),
        lastEncounterDate: parseDate(sorted[sorted.length - 1])
      };
    }
    logger.debug("[AcuityReport] No enabledDates available");
    return { firstEncounterDate: undefined, lastEncounterDate: undefined };
  }, [enabledDates]);

  // Set initial date to last encounter date (from enabledDates)
  // This effect runs once when enabledDates is loaded (only if no persisted date)
  useEffect(() => {
    if (hasPersistedDates) return; // Don't override persisted dates
    if (!selectedDate && lastEncounterDate && !enabledDatesLoading) {
      logger.debug("[AcuityReport] Setting initial selectedDate to lastEncounterDate:", lastEncounterDate);
      setSelectedDate(lastEncounterDate);
    }
  }, [lastEncounterDate, enabledDatesLoading, hasPersistedDates]);

  // Calculate defaultMonth: always show the month of the last encounter date
  // This value is passed to the Calendar to display the correct month
  const defaultMonth = useMemo(() => {
    if (lastEncounterDate) {
      logger.debug("[AcuityReport] defaultMonth set to lastEncounterDate:", lastEncounterDate);
      return lastEncounterDate;
    }
    logger.debug("[AcuityReport] defaultMonth is undefined (waiting for enabledDates)");
    return undefined;
  }, [lastEncounterDate]);

  const token = getToken();
  const [dataSource, setDataSource] = useState<'backend' | 'mock'>('mock');

  // Debug: log when selectedDateStr changes
  useEffect(() => {
    logger.debug('[AcuityReport] selectedDate changed to:', selectedDate);
    logger.debug('[AcuityReport] selectedDateStr changed to:', selectedDateStr);
    logger.debug('[AcuityReport] Query key will be:', ['facilityAcuityIndex', facilityId, selectedDateStr]);
  }, [selectedDateStr, selectedDate, facilityId]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['facilityAcuityIndex', facilityId, selectedDateStr],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      logger.debug('[AcuityReport] ⏳ Query executing with facility:', facilityId, 'date:', selectedDateStr);
      const url = LOCAL_API.FACILITY_ACUITY_INDEX;
      logger.debug('[AcuityReport] 📍 Calling URL:', url);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Facility-Id": facilityId || '',
      };

      // Add authentication header if available
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const requestBody = {
        facility_id: facilityId,
        facilityId: facilityId,
        dos: selectedDateStr
      };
      logger.debug('[AcuityReport] 📤 Request body:', requestBody);
      logger.debug('[AcuityReport] 📤 Request headers:', headers);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody)
        });

        logger.debug('[AcuityReport] 📊 Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          logger.error('[AcuityReport] ❌ Response not OK:', response.status, errorText);
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const result = await response.json();
        logger.debug('[AcuityReport] ✅ Received response:', result);

        // Handle different response formats
        if (result.status === false) {
          throw new Error(result.error || "Failed to fetch acuity data");
        }

        // Extract data from different response structures
        const data = result.data || result;
        const finalData = Array.isArray(data) ? data : (data.data || [data] || []);
        logger.debug('[AcuityReport] 📋 Final extracted data:', finalData);
        return finalData;
      } catch (fetchError) {
        logger.error('[AcuityReport] ❌ Fetch error:', {
          message: fetchError instanceof Error ? fetchError.message : String(fetchError),
          error: fetchError,
          url: url,
          headers: headers,
          timestamp: new Date().toISOString()
        });
        throw fetchError;
      }
    },
    enabled: !!selectedDateStr && !!facilityId
  });

  // Update data source based on whether data was successfully fetched from backend
  useEffect(() => {
    if (!isLoading && !error && data && Array.isArray(data) && data.length > 0) {
      // Data loaded successfully from backend
      logger.debug('[AcuityReport] ✅ Data source set to BACKEND');
      setDataSource('backend');
    } else if (error || (isLoading === false && !data)) {
      // Error occurred or no data, using mock
      logger.debug('[AcuityReport] ⚠️  Data source set to MOCK (error or no data)');
      setDataSource('mock');
    }
  }, [data, error, isLoading]);

  // Process data - assuming the API returns an array of historical data or a single object.
  // If it's an array, we take the latest for the cards and use the array for the chart.
  // If it's a single object, we might not have trend data, or the trend data is nested.

  let currentData = {
    acuityIndex: 0,
    activeWounds: 0,
    activePatients: 0
  };

  let trendData: any[] = [];

  logger.debug('[AcuityReport] Processing data:', {
    data,
    isLoading,
    error: error?.message || error,
    dataLength: Array.isArray(data) ? data.length : 'not-array'
  });

  if (data) {
    if (Array.isArray(data)) {
      logger.debug('[AcuityReport] 📊 Data is array with length:', data.length);
      // Data is an array of acuity records (one per week)
      // Each record contains: { week, patients, wounds, Facility Acuity Index }
      if (data.length > 0) {
        const latest = data[data.length - 1];
        logger.debug('[AcuityReport] 📌 Latest record:', latest);

        // Map the backend field names to our expected field names
        const acuityIndexValue = latest["Facility Acuity Index"]
          ? parseFloat(latest["Facility Acuity Index"])
          : 0;

        currentData = {
          acuityIndex: acuityIndexValue,
          activeWounds: latest.wounds || 0,
          activePatients: latest.patients || 0
        };

        logger.debug('[AcuityReport] 🎯 Extracted current data:', currentData);

        // Map for chart - use week numbers from the data
        trendData = data.map((item) => ({
          week: `W${item.week || 'N/A'}`,
          index: item["Facility Acuity Index"]
            ? parseFloat(item["Facility Acuity Index"])
            : 0
        }));
        logger.debug('[AcuityReport] 📈 Trend data processed:', trendData);
      } else {
        logger.debug('[AcuityReport] ⚠️  Data array is empty');
      }
    } else {
      logger.debug('[AcuityReport] 📋 Data is single object:', data);
      // Single object response
      currentData = {
        acuityIndex: data.acuityIndex || data.AcuityIndex || data["Facility Acuity Index"] || 0,
        activeWounds: data.activeWounds || data.ActiveWounds || data.wounds || 0,
        activePatients: data.activePatients || data.ActivePatients || data.patients || 0
      };

      logger.debug('[AcuityReport] 🎯 Extracted current data from single object:', currentData);

      // If the single object has a 'trend' or 'history' field
      if (Array.isArray(data.trend)) {
        trendData = data.trend;
      } else if (Array.isArray(data.history)) {
        trendData = data.history;
      } else {
        // No trend data available, maybe just show a single point or nothing
        trendData = [{ week: 'Current', index: currentData.acuityIndex }];
      }
      logger.debug('[AcuityReport] 📈 Trend data from single object:', trendData);
    }
  } else {
    logger.debug('[AcuityReport] ⚠️  No data available, will show mock data');
  }

  // Show NoFacilityData if the selected facility has no wound encounters
  if (!facilityHasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Facility Acuity Index</h1>
          <p className="text-muted-foreground mt-1">Measurement of wound care complexity and patient load</p>
        </div>
        <NoFacilityData facilityName={facilityName} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Facility Acuity Index</h1>
            <p className="text-muted-foreground mt-1">Measurement of wound care complexity and patient load</p>
          </div>
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <DateRangePicker
                date={selectedDate}
                setDate={setSelectedDate}
                label="Select Date"
                enabledDates={enabledDates}
                isLoading={enabledDatesLoading}
                defaultMonth={defaultMonth}
              />
              <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            </div>
            {/* Date Range Info */}
            {enabledDates.length > 0 && firstEncounterDate && lastEncounterDate && (
              <p className="text-xs text-muted-foreground mt-[5px]">
                Data available from {format(firstEncounterDate, 'MMM dd, yyyy')} to {format(lastEncounterDate, 'MMM dd, yyyy')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Facility Info Banner - Hidden */}
      {/* <FacilityInfoBanner /> */}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error fetching report</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "An unknown error occurred while loading the data."}
          </AlertDescription>
        </Alert>
      ) : isLoading && !data ? (
        <EcgLoader title="Loading acuity data..." minHeight="min-h-[400px]" />
      ) : !data ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Data</AlertTitle>
          <AlertDescription>No acuity data available for this facility.</AlertDescription>
        </Alert>
      ) : (
        <>
          {isComponentEnabled('acuity-report', 'risk-assessment') && (
            <div className={cn("grid gap-3 md:grid-cols-3 transition-opacity duration-300", isFetching && "opacity-60")}>
              <Card className="flex flex-col h-[148px]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Facility Acuity Index</CardTitle>
                  <Stethoscope className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent className="flex-grow flex items-center">
                  <div className="text-3xl font-bold">{typeof currentData.acuityIndex === 'number' ? currentData.acuityIndex.toFixed(1) : currentData.acuityIndex}</div>
                </CardContent>
                <CardContent className="flex items-center justify-between pt-0 pb-2">
                  <p className="text-xs text-muted-foreground">Current Score</p>
                  {data && <DataSourceBadge source={dataSource} showLabel={false} />}
                </CardContent>
              </Card>
              <Card className="flex flex-col h-[148px]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Active Wounds</CardTitle>
                  <Activity className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent className="flex-grow flex items-center">
                  <div className="text-3xl font-bold">{currentData.activeWounds}</div>
                </CardContent>
                <CardContent className="flex justify-end pt-0 pb-2">
                  {data && <DataSourceBadge source={dataSource} showLabel={false} />}
                </CardContent>
              </Card>
              <Card className="flex flex-col h-[148px]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Active Patients</CardTitle>
                  <Users className="h-4 w-4 text-chart-2" />
                </CardHeader>
                <CardContent className="flex-grow flex items-center">
                  <div className="text-3xl font-bold">{currentData.activePatients}</div>
                </CardContent>
                <CardContent className="flex justify-end pt-0 pb-2">
                  {data && <DataSourceBadge source={dataSource} showLabel={false} />}
                </CardContent>
              </Card>
            </div>
          )}

          {isComponentEnabled('acuity-report', 'severity-chart') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex flex-col gap-0.5">
                  <CardTitle className="text-base">Acuity Index Trend</CardTitle>
                  <CardDescription className="text-xs">Tracking complexity over time (Data points: {trendData.length})</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isFetching && <RefreshCcw className="h-3 w-3 animate-spin text-muted-foreground" />}
                  {data && <DataSourceBadge source={dataSource} showLabel={false} />}
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn("h-[322px] w-full transition-opacity duration-300", isFetching && "opacity-60")}>
                  {trendData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No trend data available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="week"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          domain={['auto', 'auto']}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="index"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                          activeDot={{ r: 6 }}
                          isAnimationActive={true}
                          animationDuration={600}
                          animationEasing="ease-in-out"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function DateRangePicker({
  date,
  setDate,
  label,
  enabledDates,
  isLoading = false,
  defaultMonth
}: {
  date: Date | undefined,
  setDate: (d: Date | undefined) => void,
  label: string,
  enabledDates?: string[],
  isLoading?: boolean,
  defaultMonth?: Date
}) {
  const [open, setOpen] = useState(false);

  const enabledCount = enabledDates?.length ?? 0;
  const dateInfo = enabledDates && enabledDates.length > 0
    ? `${enabledCount} date${enabledCount !== 1 ? 's' : ''} available`
    : 'No dates available';

  const handleDateSelect = (selectedDate: Date | undefined) => {
    logger.debug('[DateRangePicker] Date selected:', selectedDate);
    setDate(selectedDate);
    // Close the popover after selecting a date
    if (selectedDate) {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[228px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
            isLoading && "opacity-60"
          )}
          disabled={isLoading}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {isLoading ? (
            <span className="animate-pulse">{label}...</span>
          ) : (
            date ? format(date, "PPP") : <span>{label}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[288px] p-0" align="start">
        <div className="p-3 border-b bg-muted/50 text-xs text-muted-foreground">
          {dateInfo}
        </div>
        <Calendar
          key={open ? 'open' : 'closed'}
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
          enabledDates={enabledDates}
          isLoading={isLoading}
          defaultMonth={date || defaultMonth}
          className="w-full"
        />
      </PopoverContent>
    </Popover>
  )
}
