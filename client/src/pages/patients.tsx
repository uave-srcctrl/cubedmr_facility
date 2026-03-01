import { useState, useEffect, useMemo } from "react";
import { format, isValid } from "date-fns";
import {
  Users,
  Search,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Calendar as CalendarIcon,
  RefreshCcw,
  Activity,
  ClipboardList,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EcgLoader } from "@/components/ecg-loader";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { useFacilityPatientsByDate, usePatientDetail, PatientByDate } from "@/hooks/use-patients";
import { useEnabledDates } from "@/hooks/use-enabled-dates";
import { PatientDetailModal } from "@/components/patient-detail-modal";
import { FacilityInfoBanner } from "@/components/facility-info-banner";
import { NoFacilityData } from "@/components/no-facility-data";
import { DataSourceBadge } from "@/components/data-source-badge";
import { useFacilityHasData } from "@/hooks/use-facility-has-data";
import { onAuthEvent, AUTH_EVENTS } from "@/lib/auth-events";
import { usePersistedDates } from "@/hooks/use-persisted-dates";

export default function PatientsPage() {
  const { getSelectedFacility } = useAuth();
  const { isComponentEnabled } = useSettings();
  
  // Check if facility has wound encounter data
  const { hasData: facilityHasData, facilityName } = useFacilityHasData();
  
  // Use state for facilityId to support reactive updates
  const [facilityId, setFacilityId] = useState<string | null>(() => getSelectedFacility());
  
  // Listen for facility changes
  useEffect(() => {
    const unsubscribe = onAuthEvent(AUTH_EVENTS.FACILITY_CHANGED, (newFacilityId: string) => {
      setFacilityId(newFacilityId);
    });
    return unsubscribe;
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [patientFilter, setPatientFilter] = useState<'all' | 'active'>('active');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  
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

  // Fetch enabled dates for the facility (dates with encounters)
  const { data: enabledDates = [], isLoading: enabledDatesLoading } = useEnabledDates(facilityId || '');
  
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
  
  // Set initial dates when enabledDates are loaded (both start and end = last encounter)
  useEffect(() => {
    if (hasPersistedDates) return; // Don't override persisted dates
    if (!startDate && !endDate && lastEncounterDate && !enabledDatesLoading) {
      setStartDate(lastEncounterDate);
      setEndDate(lastEncounterDate);
    }
  }, [lastEncounterDate, enabledDatesLoading, hasPersistedDates]);

  // Note: Auto-swap of dates (if start > end) is now handled by usePersistedDates hook

  // Helper to safely format dates (avoids RangeError on invalid dates)
  const safeFormat = (date: Date | undefined, formatStr: string): string => {
    if (!date || !isValid(date)) return 'Invalid date';
    try {
      return format(date, formatStr);
    } catch {
      return 'Invalid date';
    }
  };

  // Check if it's a single date (same start and end)
  const isSingleDate = startDateStr === endDateStr;

  // Fetch facility patients filtered by date range
  const { data: facilityPatients = [], isLoading: patientsLoading, error: patientsError, refetch, isFetching } = useFacilityPatientsByDate(facilityId, startDateStr, endDateStr);

  // Fetch patient details when a patient is selected
  const { data: woundEncounters = [], isLoading: detailLoading } = usePatientDetail(facilityId, selectedPatientId);

  // Memoize filtered patients to avoid recalculating on every render
  const filteredPatients = useMemo(() => {
    return facilityPatients.filter((patient: PatientByDate) => {
      const patientName = patient?.patient_name || "";
      const woundLocations = patient?.wound_locations || "";
      
      // Filter by active status
      if (patientFilter === 'active' && (patient?.active_wounds ?? 0) === 0) {
        return false;
      }
      
      // Filter by search term
      let matchesSearch: boolean;
      if (caseSensitive) {
        matchesSearch =
          patientName.includes(searchTerm) ||
          woundLocations.includes(searchTerm);
      } else {
        const searchLower = searchTerm.toLowerCase();
        matchesSearch =
          patientName.toLowerCase().includes(searchLower) ||
          woundLocations.toLowerCase().includes(searchLower);
      }

      return matchesSearch;
    });
  }, [facilityPatients, patientFilter, searchTerm, caseSensitive]);

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    setDetailModalOpen(true);
  };

  const renderPatientDetailModal = () => {
    if (!selectedPatientId || !detailModalOpen) {
      return null;
    }

    const patient = facilityPatients.find(p => p.patient_id === selectedPatientId);
    if (!patient) {
      return null;
    }

    return (
      <PatientDetailModal
        patientId={selectedPatientId}
        patientName={patient.patient_name}
        woundEncounters={woundEncounters}
        isLoading={detailLoading}
        open={detailModalOpen}
        onOpenChange={(open) => {
          setDetailModalOpen(open);
        }}
        facilityId={facilityId || ''}
        startDate={startDateStr}
        endDate={endDateStr}
      />
    );
  };

  // Show NoFacilityData if the selected facility has no wound encounters
  if (!facilityHasData) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Patients
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Patients seen in the selected date range</p>
        </div>
        <NoFacilityData facilityName={facilityName} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Patients
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSingleDate 
              ? "Patients seen on the selected date" 
              : "Patients seen in the selected date range"}
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
              defaultMonth={startDate || lastEncounterDate}
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
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={patientsLoading || isFetching}>
              <RefreshCcw className={cn("h-4 w-4", (patientsLoading || isFetching) && "animate-spin")} />
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

      {/* Facility Info Banner - Hidden */}
      {/* <FacilityInfoBanner /> */}

      {/* Filters and Search */}
      {isComponentEnabled('patients', 'patient-search') && (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or wound location..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              
              <div className="flex items-center gap-2">
                <Switch
                  id="patient-filter"
                  checked={patientFilter === 'active'}
                  onCheckedChange={(checked) => setPatientFilter(checked ? 'active' : 'all')}
                />
                <Label htmlFor="patient-filter" className="text-sm text-muted-foreground cursor-pointer whitespace-nowrap">
                  Active Patients
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="case-sensitive"
                  checked={caseSensitive}
                  onCheckedChange={setCaseSensitive}
                />
                <Label htmlFor="case-sensitive" className="text-sm text-muted-foreground cursor-pointer whitespace-nowrap">
                  Case sensitive
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
      )}

      {/* Stats Summary */}
      {isComponentEnabled('patients', 'patient-kpi-cards') && (
      <>
      {facilityPatients.length > 0 && (
        <div className={cn("grid gap-4 grid-cols-1 md:grid-cols-3 transition-opacity duration-300", isFetching && "opacity-60")}>
          {isComponentEnabled('patients', 'card-total-patients') && (
          <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow min-h-[140px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{facilityPatients.length}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">patients seen</p>
                <DataSourceBadge source="backend" showLabel={false} />
              </div>
            </CardContent>
          </Card>
          )}
          {isComponentEnabled('patients', 'card-active-wounds') && (
          <Card className="border-l-4 border-l-chart-2 shadow-sm hover:shadow-md transition-shadow min-h-[140px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Wounds</CardTitle>
              <ClipboardList className="h-4 w-4 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {facilityPatients.reduce((sum: number, p: PatientByDate) => sum + (p.active_wounds || 0), 0)}
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">total active wounds</p>
                <DataSourceBadge source="backend" showLabel={false} />
              </div>
            </CardContent>
          </Card>
          )}
          {isComponentEnabled('patients', 'card-resolved-wounds') && (
          <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow min-h-[140px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved Wounds</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">
                {facilityPatients.reduce((sum: number, p: PatientByDate) => sum + (p.resolved_wounds || 0), 0)}
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">total resolved wounds</p>
                <DataSourceBadge source="backend" showLabel={false} />
              </div>
            </CardContent>
          </Card>
          )}
        </div>
      )}

      {/* Patients Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Patients Seen ({filteredPatients.length})
              </CardTitle>
              <CardDescription>
                {patientsLoading ? "Loading patients..." : 
                 !startDate ? "Select a date range to view patients" :
                 filteredPatients.length === 0 ? "No patients found for this date range" :
                 isSingleDate 
                   ? `Showing ${filteredPatients.length} patients seen on ${safeFormat(startDate, "PPP")}`
                   : `Showing ${filteredPatients.length} patients seen from ${safeFormat(startDate, "PPP")} to ${safeFormat(endDate, "PPP")}`}
              </CardDescription>
            </div>
            {isFetching && <RefreshCcw className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </CardHeader>
        <CardContent>
          {patientsError && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Error loading patients</p>
                <p className="text-sm text-destructive/80">
                  There was a problem fetching the patient list
                </p>
              </div>
            </div>
          )}

          {patientsLoading && !facilityPatients.length ? (
            <EcgLoader title="Loading patients..." minHeight="min-h-[300px]" />
          ) : !startDate ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Select a date range to view patients</p>
              </div>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {isSingleDate ? "No patients seen on this date" : "No patients seen in this date range"}
                </p>
              </div>
            </div>
          ) : (
            <div className={cn("overflow-x-auto transition-opacity duration-300", isFetching && "opacity-60")}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Wounds</TableHead>
                    <TableHead>Wound Locations</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient: PatientByDate) => (
                    <TableRow
                      key={patient.patient_id}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handlePatientSelect(patient.patient_id)}
                    >
                      <TableCell className="font-medium">
                        {patient.patient_name || "Unknown Patient"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary">
                          {patient.wound_encounter_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                        {patient.wound_locations || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}

      {/* Patient Detail Modal */}
      {renderPatientDetailModal()}
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
            date && isValid(date) ? format(date, "PPP") : <span>{label}</span>
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