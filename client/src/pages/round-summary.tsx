import { useState, useEffect, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertCircle, RefreshCcw, FileText, Calendar as CalendarIcon, Clock, TrendingDown, Download, FileSpreadsheet, Printer } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { useEnabledDates } from "@/hooks/use-enabled-dates";
import { onAuthEvent, AUTH_EVENTS } from "@/lib/auth-events";
import { FacilityInfoBanner } from "@/components/facility-info-banner";
import { usePersistedDates } from "@/hooks/use-persisted-dates";
import { DataSourceBadge } from "@/components/data-source-badge";
import { EcgLoader } from "@/components/ecg-loader";
import { RoundSummaryWoundsModal, RoundSummaryWound } from "@/components/round-summary-wounds-modal";
import { LOCAL_API } from "@/lib/api-config";
import { cn, normalizeEtiology, getEtiologyColor } from "@/lib/utils";
import { exportToExcel, exportTableToPDF, printElement } from "@/lib/export-utils";

export default function RoundSummary() {
  const { getAuthInfo, getSelectedFacility, getToken, getEmail } = useAuth();
  const { isComponentEnabled } = useSettings();
  const authInfo = getAuthInfo();
  const token = getToken();
  const email = getEmail();
  
  // Use state for facilityId to support reactive updates
  const [facilityId, setFacilityId] = useState<string | null>(() => getSelectedFacility());
  
  // Persisted date picker state (single date mode)
  const {
    startDate: selectedDate,
    setStartDate: setSelectedDate,
    startDateStr: selectedDateStr,
    hasPersistedDates
  } = usePersistedDates({ facilityId, singleDateMode: true });
  
  // Listen for facility changes
  useEffect(() => {
    const unsubscribe = onAuthEvent(AUTH_EVENTS.FACILITY_CHANGED, (newFacilityId: string) => {
      console.log('[RoundSummary] 🔄 Facility changed:', newFacilityId);
      setFacilityId(newFacilityId);
    });
    return unsubscribe;
  }, []);
  
  // Modal states
  const [chronicWoundsModalOpen, setChronicWoundsModalOpen] = useState(false);
  const [deterioratingWoundsModalOpen, setDeterioratingWoundsModalOpen] = useState(false);

  console.log('[RoundSummary] authInfo:', authInfo);
  console.log('[RoundSummary] facilityId:', facilityId);
  console.log('[RoundSummary] token present:', !!token);
  console.log('[RoundSummary] email:', email);

  // Get enabled dates for this facility
  const { data: enabledDates = [], isLoading: enabledDatesLoading } = useEnabledDates(facilityId || '');

  // Calculate last encounter date from enabledDates
  const lastEncounterDate = useMemo(() => {
    if (enabledDates && enabledDates.length > 0) {
      const lastDateStr = enabledDates[enabledDates.length - 1];
      const [year, month, day] = lastDateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return undefined;
  }, [enabledDates]);

  // Set initial date to last encounter date (only if no persisted date)
  useEffect(() => {
    if (hasPersistedDates) return; // Don't override persisted dates
    if (!selectedDate && lastEncounterDate && !enabledDatesLoading) {
      setSelectedDate(lastEncounterDate);
    }
  }, [lastEncounterDate, enabledDatesLoading, hasPersistedDates]);

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

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['roundSummary', facilityId, selectedDateStr],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      console.log('[RoundSummary] Query executing with facility:', facilityId, 'date:', selectedDateStr);
      const url = LOCAL_API.FACILITIES_LIST; // Uses /facility/api/get endpoint for entity/method calls

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Facility-Id": facilityId,
      };

      // Add authentication header if available
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "woundcareRoundSummary",
          facilityId: facilityId,
          dos: selectedDateStr,
          email: email,
          token: token,
          deviceId: "web-client"
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch round summary: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[RoundSummary] Received response:', result);

      // Handle different response formats
      if (result.status === false) {
        throw new Error(result.error || "Failed to fetch round summary data");
      }

      // Extract data from different response structures
      const data = result.data || result;
      return Array.isArray(data) ? data : (data.data || [data] || []);
    },
    enabled: !!selectedDateStr && !!facilityId
  });

  // Update data source based on whether data was successfully fetched from backend
  const [dataSource, setDataSource] = useState<'backend' | 'mock'>('mock');

  useEffect(() => {
    if (!isLoading && !error && data && Array.isArray(data) && data.length > 0) {
      // Data loaded successfully from backend
      setDataSource('backend');
    } else if (error || (isLoading === false && !data)) {
      // Error occurred or no data, using mock
      setDataSource('mock');
    }
  }, [data, error, isLoading]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Woundcare Round Summary</h1>
          <p className="text-muted-foreground">
            Summary of wound care rounds{selectedDate && ` for ${format(selectedDate, 'MMM dd, yyyy')}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <DatePicker
              date={selectedDate}
              setDate={setSelectedDate}
              label="Select Date"
              enabledDates={enabledDates}
              isLoading={enabledDatesLoading}
              defaultMonth={selectedDate || lastEncounterDate}
            />
            <DataSourceBadge source={dataSource} />
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
          
          {/* Export Dropdown */}
          {data && Array.isArray(data) && data.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 w-full">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    const columns = [
                      { key: 'Patient Name', header: 'Patient Name', width: 20 },
                      { key: 'Location', header: 'Location', width: 15 },
                      { key: 'Etiology', header: 'Etiology', width: 15 },
                      { key: 'Size (cm)', header: 'Size (cm)', width: 12 },
                      { key: 'Exudate', header: 'Exudate', width: 10 },
                      { key: 'Tissue', header: 'Tissue', width: 10 },
                      { key: 'Tx Plan', header: 'Tx Plan', width: 15 },
                      { key: 'Frequency', header: 'Frequency', width: 10 },
                      { key: 'Progress', header: 'Progress', width: 12 },
                      { key: 'Disposition', header: 'Disposition', width: 12 },
                      { key: 'Wound Start Date', header: 'Start Date', width: 12 },
                      { key: 'Duration (days)', header: 'Days', width: 8 },
                      { key: 'Facility Acquired', header: 'Fac. Acquired', width: 12 }
                    ];
                    const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : 'all';
                    exportToExcel(data, `WoundcareRoundSummary_${dateStr}`, 'Round Summary', columns);
                  }}
                  className="gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const columns = [
                      { key: 'Patient Name', header: 'Patient' },
                      { key: 'Location', header: 'Location' },
                      { key: 'Etiology', header: 'Etiology' },
                      { key: 'Size (cm)', header: 'Size' },
                      { key: 'Progress', header: 'Progress' },
                      { key: 'Disposition', header: 'Disposition' },
                      { key: 'Duration (days)', header: 'Days' },
                      { key: 'Facility Acquired', header: 'Fac.Acq.' }
                    ];
                    const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : 'all';
                    exportTableToPDF(data, columns, `WoundcareRoundSummary_${dateStr}`, {
                      title: 'Woundcare Round Summary',
                      subtitle: selectedDate ? `Date: ${format(selectedDate, 'MMM dd, yyyy')}` : undefined,
                      orientation: 'landscape'
                    });
                  }}
                  className="gap-2 cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  Export to PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const title = selectedDate 
                      ? `Woundcare Round Summary - ${format(selectedDate, 'MMM dd, yyyy')}`
                      : 'Woundcare Round Summary';
                    printElement('round-summary-printable', title);
                  }}
                  className="gap-2 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* <FacilityInfoBanner /> */}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Round Summary</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "An error occurred while loading the round summary data"}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && !data && (
        <EcgLoader title="Loading round summary data..." minHeight="min-h-[400px]" />
      )}

      {/* KPI Cards */}
      {isComponentEnabled('round-summary', 'summary-cards') && data && Array.isArray(data) && data.length > 0 && (() => {
        const chronicWoundsList = data.filter((item: any) => item['Duration (days)'] > 100);
        const deterioratingWoundsList = data.filter((item: any) => 
          item['Progress'] === 'Deteriorating' || item['Progress'] === 'Deteriorated'
        );
        
        // Calculate visible cards for dynamic grid
        const visibleCards = [
          isComponentEnabled('round-summary', 'card-total-wounds'),
          isComponentEnabled('round-summary', 'card-chronic-wounds'),
          isComponentEnabled('round-summary', 'card-deteriorating'),
        ].filter(Boolean).length;
        
        const gridClass = visibleCards <= 1 
          ? 'grid gap-4 grid-cols-1' 
          : visibleCards === 2 
            ? 'grid gap-4 grid-cols-1 md:grid-cols-2' 
            : 'grid gap-4 md:grid-cols-3';
        
        return (
          <div className={gridClass}>
            {isComponentEnabled('round-summary', 'card-total-wounds') && (
            <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow min-h-[140px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Wounds</CardTitle>
                <FileText className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{data.length}</div>
                <p className="text-xs text-muted-foreground">wounds in this round</p>
              </CardContent>
            </Card>
            )}
            {isComponentEnabled('round-summary', 'card-chronic-wounds') && (
            <Card 
              className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow min-h-[140px] cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-950/20"
              onClick={() => chronicWoundsList.length > 0 && setChronicWoundsModalOpen(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Chronic Wounds</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-orange-600">{chronicWoundsList.length}</div>
                <p className="text-xs text-muted-foreground">wounds older than 100 days</p>
              </CardContent>
            </Card>
            )}
            {isComponentEnabled('round-summary', 'card-deteriorating') && (
            <Card 
              className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow min-h-[140px] cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={() => deterioratingWoundsList.length > 0 && setDeterioratingWoundsModalOpen(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deteriorating</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-red-600">{deterioratingWoundsList.length}</div>
                <p className="text-xs text-muted-foreground">wounds worsening</p>
              </CardContent>
            </Card>
            )}
          </div>
        );
      })()}

      {/* Data Display */}
      {isComponentEnabled('round-summary', 'wound-list') && (
      <>
      {data && Array.isArray(data) && data.length > 0 && (
        <Card id="round-summary-printable" className={cn("transition-opacity duration-300", isFetching && "opacity-60")}>
          <CardHeader>
            <CardTitle>Round Summary Data</CardTitle>
            <CardDescription>
              {data.length} records found{selectedDate && ` for ${format(selectedDate, 'MMM dd, yyyy')}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Etiology</TableHead>
                    <TableHead className="text-center">L</TableHead>
                    <TableHead className="text-center">W</TableHead>
                    <TableHead className="text-center">D</TableHead>
                    <TableHead>Exudate</TableHead>
                    <TableHead>Tissue</TableHead>
                    <TableHead>Tx Plan</TableHead>
                    <TableHead>Freq</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Disposition</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Fac. Acq.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item: any, index: number) => {
                    const size = item['Size (cm)'] || '';
                    const [length, width, depth] = size.split('x').map((v: string) => v?.trim() || '-');
                    const progress = item['Progress'] || 'N/A';
                    const progressColor = 
                      progress === 'Improving' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                      progress === 'Stable' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' :
                      (progress === 'Deteriorating' || progress === 'Deteriorated') ? 'bg-red-100 text-red-800 hover:bg-red-100' :
                      'bg-gray-100 text-gray-800 hover:bg-gray-100';
                    const isChronic = item['Duration (days)'] > 100;
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item['Patient Name'] || 'N/A'}</TableCell>
                        <TableCell>{item['Location'] || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", getEtiologyColor(item['Etiology']))}>
                            {normalizeEtiology(item['Etiology'])}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{length}</TableCell>
                        <TableCell className="text-center">{width}</TableCell>
                        <TableCell className="text-center">{depth}</TableCell>
                        <TableCell>{item['Exudate'] || 'N/A'}</TableCell>
                        <TableCell>{item['Tissue'] || 'N/A'}</TableCell>
                        <TableCell>{item['Tx Plan'] || 'N/A'}</TableCell>
                        <TableCell>{item['Frequency'] || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={progressColor}>{progress}</Badge>
                        </TableCell>
                        <TableCell>{item['Disposition'] || 'N/A'}</TableCell>
                        <TableCell>{item['Wound Start Date'] || 'N/A'}</TableCell>
                        <TableCell className={cn(isChronic && "text-orange-600 font-semibold")}>
                          {item['Duration (days)'] ?? 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            item['Facility Acquired']?.toString().toLowerCase() === 'yes' 
                              ? "bg-red-500 text-white hover:bg-red-600" 
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          )}>
                            {item['Facility Acquired'] || 'N/A'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {data && Array.isArray(data) && data.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <div className="ml-4">
              <h3 className="text-lg font-medium">No Round Summary Data</h3>
              <p className="text-muted-foreground">
                No round summary records found{selectedDate && ` for ${format(selectedDate, 'MMM dd, yyyy')}`}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      </>
      )}

      {/* Chronic Wounds Modal */}
      <RoundSummaryWoundsModal
        wounds={data && Array.isArray(data) ? data.filter((item: RoundSummaryWound) => item['Duration (days)'] > 100) : []}
        type="chronic"
        open={chronicWoundsModalOpen}
        onOpenChange={setChronicWoundsModalOpen}
        selectedDate={selectedDate}
        facilityId={facilityId}
        onRefresh={refetch}
      />

      {/* Deteriorating Wounds Modal */}
      <RoundSummaryWoundsModal
        wounds={data && Array.isArray(data) ? data.filter((item: RoundSummaryWound) => 
          item['Progress'] === 'Deteriorating' || item['Progress'] === 'Deteriorated'
        ) : []}
        type="deteriorating"
        open={deterioratingWoundsModalOpen}
        onOpenChange={setDeterioratingWoundsModalOpen}
        selectedDate={selectedDate}
        facilityId={facilityId}
        onRefresh={refetch}
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