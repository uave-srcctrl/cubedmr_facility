import { useState, useEffect, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar as CalendarIcon, AlertCircle, RefreshCcw } from "lucide-react";
import { cn, normalizeEtiology } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EcgLoader } from "@/components/ecg-loader";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { useEnabledDates } from "@/hooks/use-enabled-dates";
import { useWoundsByEtiology } from "@/hooks/use-patients";
import { onAuthEvent, AUTH_EVENTS } from "@/lib/auth-events";
import { usePersistedDates } from "@/hooks/use-persisted-dates";
import { FacilityInfoBanner } from "@/components/facility-info-banner";
import { NoFacilityData } from "@/components/no-facility-data";
import { DataSourceBadge } from "@/components/data-source-badge";
import { useFacilityHasData } from "@/hooks/use-facility-has-data";
import { WoundsByEtiologyModal } from "@/components/wounds-by-etiology-modal";
import { normalizeFieldNamesArray } from "@/lib/field-mapper";
import { useLocation } from "wouter";
import { logger } from "@/lib/logger";

// Colors for the chart - pastel with solid border colors
const COLORS = [
  { fill: "#dbeafe", stroke: "#3b82f6" },   // Blue pastel
  { fill: "#d1fae5", stroke: "#10b981" },   // Green pastel
  { fill: "#fef9c3", stroke: "#eab308" },   // Yellow pastel
  { fill: "#fee2e2", stroke: "#ef4444" },   // Red pastel
  { fill: "#ede9fe", stroke: "#8b5cf6" },   // Purple pastel
  { fill: "#e0e7ff", stroke: "#6366f1" },   // Indigo pastel
  { fill: "#ccfbf1", stroke: "#14b8a6" },   // Teal pastel
  { fill: "#ffedd5", stroke: "#f97316" }    // Orange pastel
];

interface EtiologyItem {
  woundEtiology: string;
  count: number;
  percentage: number;
}

export default function EtiologyReport() {
  const { getToken, getEmail, getSelectedFacility } = useAuth();
  const { isComponentEnabled } = useSettings();

  // Check if facility has wound encounter data
  const { hasData: facilityHasData, facilityName } = useFacilityHasData();

  // Use state for facilityId to support reactive updates
  const [facilityId, setFacilityId] = useState<string | null>(() => getSelectedFacility());

  // Wounds by etiology modal state
  const [etiologyModalOpen, setEtiologyModalOpen] = useState(false);
  const [selectedEtiology, setSelectedEtiology] = useState<string | null>(null);
  const [pressedEtiologyIndex, setPressedEtiologyIndex] = useState<number | null>(null);
  const [hiddenEtiologies, setHiddenEtiologies] = useState<Set<string>>(new Set());

  // Persisted date picker state
  const {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    startDateStr,
    endDateStr,
    hasPersistedDates
  } = usePersistedDates({ facilityId });

  // Listen for facility changes
  useEffect(() => {
    const unsubscribe = onAuthEvent(AUTH_EVENTS.FACILITY_CHANGED, (newFacilityId: string) => {
      logger.debug('[EtiologyReport] 🔄 Facility changed:', newFacilityId);
      setFacilityId(newFacilityId);
    });
    return unsubscribe;
  }, []);

  // Fetch enabled dates for the facility (dates with encounters)
  const { data: enabledDates = [], isLoading: enabledDatesLoading } = useEnabledDates(facilityId);

  // Get wounds by etiology data - only fetch when etiology is selected
  const { data: woundsByEtiologyData, isLoading: woundsByEtiologyLoading, refetch: refetchWoundsByEtiology } = useWoundsByEtiology(
    facilityId || '',
    selectedEtiology,
    startDateStr,
    endDateStr
  );

  // Calculate first encounter date from enabledDates
  const firstEncounterDate = useMemo(() => {
    if (enabledDates && enabledDates.length > 0) {
      const firstDateStr = enabledDates[0];
      const [year, month, day] = firstDateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return undefined;
  }, [enabledDates]);

  // Calculate last encounter date from enabledDates
  const lastEncounterDate = useMemo(() => {
    if (enabledDates && enabledDates.length > 0) {
      const lastDateStr = enabledDates[enabledDates.length - 1];
      const [year, month, day] = lastDateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return undefined;
  }, [enabledDates]);

  // Calculate visible components for dynamic grid
  const visibleEtiologyComponents = useMemo(() => {
    const components = ['etiology-breakdown', 'patterns'];
    return components.filter(c => isComponentEnabled('etiology-report', c)).length;
  }, [isComponentEnabled]);

  const etiologyGridClass = useMemo(() => {
    if (visibleEtiologyComponents <= 1) return 'grid gap-6 grid-cols-1';
    return 'grid gap-6 lg:grid-cols-2';
  }, [visibleEtiologyComponents]);

  // Set initial dates when enabledDates are loaded (both start and end = last encounter)
  useEffect(() => {
    if (hasPersistedDates) return; // Don't override persisted dates
    if (!startDate && !endDate && lastEncounterDate && !enabledDatesLoading) {
      setStartDate(lastEncounterDate);
      setEndDate(lastEncounterDate);
    }
  }, [lastEncounterDate, enabledDatesLoading, hasPersistedDates]);

  // Note: Auto-swap of dates (if start > end) is now handled by usePersistedDates hook

  // Check if it's a single date (same start and end)
  const isSingleDate = startDateStr === endDateStr;

  // If no facilityId, show error - shouldn't happen if auth is working
  if (!facilityId) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>
            Missing facility information. Please log in again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const token = getToken();
  const email = getEmail();

  const [dataSource, setDataSource] = useState<'backend' | 'mock'>('mock');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['etiologyReport', startDateStr, endDateStr, facilityId],
    queryFn: async () => {
      // Fetch etiology distribution directly from PHP API
      const { fetchFromPhpApi } = await import("@/lib/date-fallback");
      const { transformEtiologyMetrics } = await import("@/lib/transforms");

      const result = await fetchFromPhpApi("rptEtiologyDistribution", {
        facilityId,
        dosStart: startDateStr,
        dosEnd: endDateStr,
        email: email || "etiology-report",
        token,
        deviceId: "etiology-report",
      });

      logger.debug('[EtiologyReport] Received response:', result);

      if (!result || result.status === false) {
        throw new Error(result?.error || "Failed to fetch etiology data");
      }

      let data = result.data || result;
      if (!Array.isArray(data)) data = [];

      // Transform metric_name/metric_value format if needed
      data = transformEtiologyMetrics(data);

      // Normalize field names from backend format
      return normalizeFieldNamesArray(data);
    },
    placeholderData: keepPreviousData,
  });

  // Track data source based on response - use useEffect to properly update state
  useEffect(() => {
    if (!isLoading && !error && data && data.length > 0) {
      // Data loaded successfully from backend
      setDataSource('backend');
    } else if (error) {
      // Error occurred, using mock
      setDataSource('mock');
    }
  }, [data, error, isLoading]);

  // Process data for charts and tables
  // We expect the API to return objects. We might need to map keys if they differ.
  // Based on user prompt: "Wound Etiology", "Count", "Percentage"
  const processedData = useMemo(() => {
    return (data || []).map((item: any) => {
      let etiologyName = item.woundEtiology || item['Wound Etiology'] || item.name || 'Unknown';
      // Replace 'null' string with 'Other'
      if (etiologyName === 'null' || etiologyName === null) {
        etiologyName = 'Other';
      }
      // Normalize pressure etiology variants
      etiologyName = normalizeEtiology(etiologyName);
      return {
        name: etiologyName,
        value: Number(item.count || item.Count || item.value || 0),
        percentage: Number(item.percentage || item.Percentage || 0),
        fill: COLORS[0].fill,
        stroke: COLORS[0].stroke
      };
    }).map((item: any, index: number) => ({
      ...item,
      fill: COLORS[index % COLORS.length].fill,
      stroke: COLORS[index % COLORS.length].stroke
    }));
  }, [data]);

  const totalCount = useMemo(() => {
    return processedData.reduce((acc: number, curr: any) => acc + curr.value, 0);
  }, [processedData]);

  // Show NoFacilityData if the selected facility has no wound encounters
  if (!facilityHasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Wound Etiology Distribution</h1>
          <p className="text-muted-foreground mt-1">Breakdown of wound types for selected date range</p>
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Wound Etiology Distribution</h1>
            <p className="text-muted-foreground mt-1">
              {isSingleDate
                ? "Breakdown of wound types for selected date"
                : "Breakdown of wound types for selected date range"}
            </p>
          </div>

          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <DatePicker
                date={startDate}
                setDate={setStartDate}
                label="Start Date"
                enabledDates={enabledDates}
                isLoading={enabledDatesLoading}
                defaultMonth={startDate || firstEncounterDate}
              />
              <span className="text-muted-foreground">to</span>
              <DatePicker
                date={endDate}
                setDate={setEndDate}
                label="End Date"
                enabledDates={enabledDates}
                isLoading={enabledDatesLoading}
                defaultMonth={endDate || lastEncounterDate}
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

      {/* <FacilityInfoBanner /> */}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error fetching report</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "An unknown error occurred while loading the data. Please check your connection or try again."}
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <EcgLoader title="Loading report data..." minHeight="min-h-[400px]" />
      ) : processedData.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Data Available</AlertTitle>
          <AlertDescription>
            {startDate && isSingleDate
              ? `No records found for ${format(startDate, 'MMM dd, yyyy')}. Try selecting a different date.`
              : startDate && endDate
                ? `No records found for ${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}. Try selecting a different date range.`
                : 'Select a date range to view data.'}
          </AlertDescription>
        </Alert>
      ) : (
        <div className={etiologyGridClass}>
          {isComponentEnabled('etiology-report', 'etiology-breakdown') && (
            <Card>
              <CardHeader className="relative pb-2">
                <CardTitle>Wound Distribution</CardTitle>
                <CardDescription>
                  {startDate && isSingleDate
                    ? `Proportion of wound types for ${format(startDate, 'MMM dd, yyyy')}`
                    : startDate && endDate
                      ? `Proportion of wound types for ${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`
                      : 'Proportion of wound types'}
                </CardDescription>
                <div className="absolute top-4 right-4">
                  <DataSourceBadge source={dataSource} showLabel={false} />
                </div>
              </CardHeader>
              <CardContent className="relative pl-2 pr-2">
                {isLoading && !data ? (
                  <EcgLoader title="Loading Wound Distribution..." minHeight="min-h-[450px]" />
                ) : (
                  <div className="flex h-[450px] w-full gap-2 pl-1">
                    {/* Legend on the left with scroll */}
                    <div className="w-[120px] overflow-y-auto flex-shrink-0 py-4">
                      <div className="space-y-2">
                        {processedData.map((entry: any, index: number) => {
                          const isHidden = hiddenEtiologies.has(entry.name);
                          return (
                            <div
                              key={`legend-${index}`}
                              className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:bg-muted/50 rounded p-1 -m-1 transition-colors"
                              onClick={() => {
                                setHiddenEtiologies(prev => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(entry.name)) {
                                    newSet.delete(entry.name);
                                  } else {
                                    newSet.add(entry.name);
                                  }
                                  return newSet;
                                });
                              }}
                            >
                              <div
                                className="w-3 h-3 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: isHidden ? 'transparent' : entry.fill, border: isHidden ? `2px solid ${entry.stroke}` : `1px solid ${entry.stroke}` }}
                              />
                              <span className={`truncate text-xs ${isHidden ? 'line-through text-muted-foreground' : ''}`}>{entry.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Chart */}
                    <div className="flex-1 min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <Pie
                            data={processedData.filter((entry: any) => !hiddenEtiologies.has(entry.name))}
                            cx="50%"
                            cy="50%"
                            innerRadius={120}
                            outerRadius={190}
                            paddingAngle={5}
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={800}
                            animationEasing="ease-out"
                            isAnimationActive={true}
                            onClick={(data, index) => {
                              if (data && data.name) {
                                setPressedEtiologyIndex(index);
                                setTimeout(() => {
                                  setPressedEtiologyIndex(null);
                                  setSelectedEtiology(data.name);
                                  setEtiologyModalOpen(true);
                                }, 150);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {processedData.filter((entry: any) => !hiddenEtiologies.has(entry.name)).map((entry: any, index: number) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.fill}
                                stroke={entry.stroke}
                                strokeWidth={1}
                                style={{
                                  cursor: 'pointer',
                                  outline: 'none',
                                  transform: pressedEtiologyIndex === index ? 'scale(0.92)' : 'scale(1)',
                                  transformOrigin: 'center',
                                  transformBox: 'fill-box',
                                  transition: 'transform 0.15s ease-out'
                                }}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                            itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isComponentEnabled('etiology-report', 'patterns') && (
            <Card>
              <CardHeader className="relative pb-2">
                <CardTitle>Detailed Etiology Count</CardTitle>
                <CardDescription>Specific count and percentage for each wound type</CardDescription>
                <div className="absolute top-4 right-4">
                  <DataSourceBadge source={dataSource} showLabel={false} />
                </div>
              </CardHeader>
              <CardContent className="relative pb-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50%]">Wound Etiology</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedData.map((item: any) => (
                      <TableRow
                        key={item.name}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          setSelectedEtiology(item.name);
                          setEtiologyModalOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{item.value}</TableCell>
                        <TableCell className="text-right">{item.percentage.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{totalCount}</TableCell>
                      <TableCell className="text-right">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Wounds by Etiology Modal */}
      <WoundsByEtiologyModal
        patients={woundsByEtiologyData?.data || []}
        totalWounds={woundsByEtiologyData?.total_wounds || 0}
        totalPatients={woundsByEtiologyData?.total_patients || 0}
        etiology={selectedEtiology || ''}
        facilityId={facilityId || ''}
        isLoading={woundsByEtiologyLoading}
        open={etiologyModalOpen}
        onOpenChange={setEtiologyModalOpen}
        onRefetch={refetchWoundsByEtiology}
        startDate={startDateStr}
        endDate={endDateStr}
      />
    </div>
  );
}

function DatePicker({
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
    setDate(selectedDate);
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
