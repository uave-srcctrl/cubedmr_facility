import { useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  TrendingDown,
  MapPin,
  User,
  Ruler,
  Droplet,
  Layers,
  Pill,
  Activity,
  Pencil,
  Scissors,
  Zap,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { WoundEditModal, EditableWound } from "@/components/wound-edit-modal";
import { useAuth } from "@/hooks/use-auth";
import { cn, getEtiologyColor, normalizeEtiology } from "@/lib/utils";
import { toNum, getProgressBackground, getWoundCardBackground, formatDateDisplay } from "@/lib/wound-utils";
import { ProgressIcon, PatientHeaderCard } from "@/components/wound-display";
import { useWoundChartState } from "@/hooks/use-wound-chart-state";
import { PushScoreChart } from "@/components/charts/push-score-chart";
import { SurfaceAreaChart } from "@/components/charts/surface-area-chart";

// Type for encounter history entry
export interface EncounterHistoryEntry {
  id: number;
  dos: string;
  width: number;
  height: number;
  depth: number;
  surface: number;
  exudate: string;
  tissue: string;
  treatment: string;
  progress: string;
  debridement: string;
  days: number;
  healing_percentage: number;
  push_score: number;
}

// Type for round summary wound data - includes wound identifiers for editing
export interface RoundSummaryWound {
  'Patient Name': string;
  'Location': string;
  'Etiology': string;
  'Size (cm)': string;
  'Exudate': string;
  'Tissue': string;
  'Tx Plan': string;
  'Frequency': string;
  'Progress': string;
  'Disposition': string;
  'Wound Start Date': string;
  'Duration (days)': number;
  'Facility Acquired': string;
  // Additional fields for editing
  patient_id: string;
  dosid: number;
  width: number;
  height: number;
  depth: number;
  debridement: string;
  push_score: number;
  POA: number;
  Palliative: number;
  start_date: string;
  dos: string;
  // Encounter history for charting
  encounter_history: EncounterHistoryEntry[];
}

interface RoundSummaryWoundsModalProps {
  wounds: RoundSummaryWound[];
  type: 'chronic' | 'deteriorating';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  startDate?: string; // YYYY-MM-DD format for date range shading
  endDate?: string;   // YYYY-MM-DD format for date range shading
  facilityId: string;
  onRefresh?: () => void;
}

export function RoundSummaryWoundsModal({
  wounds,
  type,
  open,
  onOpenChange,
  selectedDate,
  startDate,
  endDate,
  facilityId,
  onRefresh,
}: RoundSummaryWoundsModalProps) {
  const [editingWound, setEditingWound] = useState<RoundSummaryWound | null>(null);

  // Check admin role for edit permissions
  const { isAdmin } = useAuth();
  
  // State to track which chart lines are visible per wound
  const [chartVisibility, setChartVisibility] = useState<Record<string, { surface: boolean; prev: boolean; change: boolean }>>({});
  
  // State to track selected encounter date per wound
  const [selectedEncounterDate, setSelectedEncounterDate] = useState<Record<string, string>>({});
  
  const isChronicType = type === 'chronic';
  
  // Determine if we have a date range to highlight
  const hasDateRange = startDate && endDate && startDate !== endDate;

  // Chart visibility helpers
  const getVisibility = (woundId: string) => chartVisibility[woundId] || { surface: true, prev: true, change: true };
  
  const toggleLine = (woundId: string, line: 'surface' | 'prev' | 'change') => {
    setChartVisibility(prev => ({
      ...prev,
      [woundId]: {
        ...getVisibility(woundId),
        [line]: !getVisibility(woundId)[line]
      }
    }));
  };
  
  // Get selected encounter date for a wound, defaulting to most recent
  const getSelectedDate = (woundKey: string, history: EncounterHistoryEntry[]) => {
    if (selectedEncounterDate[woundKey]) {
      return selectedEncounterDate[woundKey];
    }
    // Default to most recent encounter (last in array)
    return history[history.length - 1]?.dos || '';
  };
  
  // Handle click on encounter date row
  const handleEncounterDateClick = (woundKey: string, date: string) => {
    setSelectedEncounterDate(prev => ({
      ...prev,
      [woundKey]: date
    }));
  };

  // Format date for display
  const formatDateDisplay = (dateString: string) => {
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts.map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Convert RoundSummaryWound to EditableWound for the edit modal
  const toEditableWound = (wound: RoundSummaryWound): EditableWound => ({
    id: String(wound.dosid),
    dos: wound.dos,
    patient_id: wound.patient_id,
    location: wound['Location'],
    etiology: wound['Etiology'],
    width: toNum(wound.width),
    height: toNum(wound.height),
    depth: toNum(wound.depth),
    exudate: wound['Exudate'],
    tissue: wound['Tissue'],
    treatment: wound['Tx Plan'],
    frequency: wound['Frequency'],
    progress: wound['Progress'],
    disposition: wound['Disposition'],
    debridement: wound.debridement,
    start_date: wound.start_date,
    push_score: toNum(wound.push_score),
    POA: wound.POA === 1,
    Palliative: wound.Palliative === 1,
    facility_acquired: wound['Facility Acquired'] === 'YES',
  });

  const handleEditClick = (wound: RoundSummaryWound) => {
    setEditingWound(wound);
  };

  const handleSaveSuccess = () => {
    setEditingWound(null);
    if (onRefresh) {
      onRefresh();
    }
  };
  
  // getEtiologyColor imported from @/lib/utils

  // Group wounds by patient
  const groupedByPatient = wounds.reduce((acc, wound) => {
    const patientId = wound.patient_id || 'Unknown';
    const patientName = wound['Patient Name'] || 'Unknown';
    const key = patientId;
    if (!acc[key]) {
      acc[key] = { patientName, patientId, wounds: [] };
    }
    acc[key].wounds.push(wound);
    return acc;
  }, {} as Record<string, { patientName: string; patientId: string; wounds: RoundSummaryWound[] }>);

  const totalPatients = Object.keys(groupedByPatient).length;
  const totalWounds = wounds.length;

  const modalTitle = isChronicType ? "Chronic Wounds" : "Deteriorating Wounds";
  const modalDescription = isChronicType 
    ? `Wounds older than 100 days${selectedDate ? ` as of ${format(selectedDate, 'MMM dd, yyyy')}` : ''}`
    : `Wounds with deteriorating/deteriorated progress${selectedDate ? ` as of ${format(selectedDate, 'MMM dd, yyyy')}` : ''}`;
  const ModalIcon = isChronicType ? Clock : TrendingDown;
  const iconColor = isChronicType ? "text-orange-500" : "text-red-500";

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              isChronicType ? "bg-orange-100" : "bg-red-100"
            )}>
              <ModalIcon className={cn("h-6 w-6", isChronicType ? "text-orange-600" : "text-red-600")} />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">
                {modalTitle}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {modalDescription}
              </DialogDescription>
            </div>
          </div>
          {wounds.length > 0 && (
            <div className="flex gap-4 mt-4">
              <Badge variant="outline" className="text-sm px-3 py-1">
                <User className="h-3 w-3 mr-1" />
                {totalPatients} Patient{totalPatients !== 1 ? "s" : ""}
              </Badge>
              <Badge variant={isChronicType ? "secondary" : "destructive"} className="text-sm px-3 py-1">
                {isChronicType ? <Clock className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                {totalWounds} Wound{totalWounds !== 1 ? "s" : ""}
              </Badge>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4 pt-4">
        {wounds.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className={cn(
                  "p-3 rounded-full mb-4",
                  isChronicType ? "bg-green-100" : "bg-green-100"
                )}>
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-lg font-medium text-green-700">
                  No {isChronicType ? 'Chronic' : 'Deteriorating'} Wounds
                </p>
                <p className="text-muted-foreground mt-1">
                  {isChronicType ? 'All wounds are within acceptable duration' : 'All wounds are progressing well'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.values(groupedByPatient).map((patient) => (
              <Card key={patient.patientId} className="overflow-hidden transition-all">
                <CardContent className="p-4">
                  {/* Patient Header */}
                  <PatientHeaderCard
                    patientName={patient.patientName}
                    patientId={patient.patientId}
                    woundCount={patient.wounds.length}
                    badgeVariant={isChronicType ? "secondary" : "destructive"}
                    showChevron={false}
                  />

                  {/* Wounds List */}
                  <div className="space-y-3">
                    {patient.wounds.map((wound, idx) => {
                      // Wound key for state tracking
                      const woundKey = wound.dosid ? String(wound.dosid) : `${wound.patient_id}-${wound['Location']}`;
                      const history = wound.encounter_history || [];
                      const currentSelectedDate = getSelectedDate(woundKey, history);
                      
                      // Find the encounter data for the selected date, or use wound data as fallback
                      const selectedEncounter = history.find(h => h.dos === currentSelectedDate);
                      const displayData = {
                        width: selectedEncounter?.width ?? toNum(wound.width),
                        height: selectedEncounter?.height ?? toNum(wound.height),
                        depth: selectedEncounter?.depth ?? toNum(wound.depth),
                        surface: selectedEncounter?.surface ?? (toNum(wound.width) * toNum(wound.height)),
                        exudate: selectedEncounter?.exudate ?? wound['Exudate'],
                        tissue: selectedEncounter?.tissue ?? wound['Tissue'],
                        treatment: selectedEncounter?.treatment ?? wound['Tx Plan'],
                        progress: selectedEncounter?.progress ?? wound['Progress'],
                        debridement: selectedEncounter?.debridement ?? wound.debridement,
                        days: selectedEncounter?.days ?? wound['Duration (days)'],
                        healing_percentage: selectedEncounter?.healing_percentage ?? 0,
                        push_score: selectedEncounter?.push_score ?? toNum(wound.push_score),
                      };
                      const isLatest = !currentSelectedDate || currentSelectedDate === history[history.length - 1]?.dos;
                      
                      const isChronic = toNum(displayData.days) > 100;
                      const isDeterioration = displayData.progress === 'Deteriorating' || displayData.progress === 'Deteriorated';
                      const progressStyle = getProgressBackground(displayData.progress);
                      const isPressureUlcer = wound['Etiology']?.toLowerCase().includes('pressure');
                      const hasDebridement = displayData.debridement === 'YES' || displayData.debridement === 'Yes';
                      
                      return (
                        <Card 
                          key={idx}
                          className={cn("overflow-hidden", progressStyle.bg)}
                        >
                          <CardHeader className="bg-muted/30 pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <CardTitle className="text-base font-semibold">
                                    {wound['Location'] || "Unknown Location"}
                                  </CardTitle>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <Badge className={cn("text-xs", getEtiologyColor(wound['Etiology']))}>
                                      {normalizeEtiology(wound['Etiology'])}
                                    </Badge>
                                    {wound.POA === 1 && (
                                      <Badge variant="secondary" className="text-xs">POA</Badge>
                                    )}
                                    {wound['Facility Acquired'] === 'YES' ? (
                                      <Badge variant="destructive" className="text-xs">Facility Acquired</Badge>
                                    ) : (
                                      <Badge className="text-xs bg-slate-600 text-white">Community Acquired</Badge>
                                    )}
                                    {wound.Palliative === 1 && (
                                      <Badge variant="outline" className="text-xs">Palliative</Badge>
                                    )}
                                    {isChronic && (
                                      <Badge className="text-xs bg-orange-500 text-white border-orange-600">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Chronic ({toNum(displayData.days)} days)
                                      </Badge>
                                    )}
                                    {isDeterioration && (
                                      <Badge className="text-xs bg-red-500 text-white border-red-600">
                                        <TrendingDown className="h-3 w-3 mr-1" />
                                        {displayData.progress}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Edit button - only for Admin users */}
                                {isAdmin() && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => {
                                      // Create editable wound with selected encounter's data
                                      const encounterId = selectedEncounter?.id || wound.dosid;
                                      const editableData: RoundSummaryWound = {
                                        ...wound,
                                        dosid: Number(encounterId),
                                        dos: currentSelectedDate || wound.dos,
                                        width: selectedEncounter?.width ?? toNum(wound.width),
                                        height: selectedEncounter?.height ?? toNum(wound.height),
                                        depth: selectedEncounter?.depth ?? toNum(wound.depth),
                                        'Exudate': selectedEncounter?.exudate ?? wound['Exudate'],
                                        'Tissue': selectedEncounter?.tissue ?? wound['Tissue'],
                                        'Tx Plan': selectedEncounter?.treatment ?? wound['Tx Plan'],
                                        'Progress': selectedEncounter?.progress ?? wound['Progress'],
                                        debridement: selectedEncounter?.debridement ?? wound.debridement,
                                        push_score: selectedEncounter?.push_score ?? toNum(wound.push_score),
                                      };
                                      handleEditClick(editableData);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                )}
                                <div className="text-right text-sm">
                                  <p className="text-xs text-muted-foreground">Since {wound['Wound Start Date'] || 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-4">
                            {/* Viewing date info */}
                            <div className="mb-4 pb-4 border-b">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  Viewing: {formatDateDisplay(currentSelectedDate || wound.dos)}
                                  {isLatest && (
                                    <Badge variant="secondary" className="text-xs ml-1">Latest</Badge>
                                  )}
                                </div>
                              </div>
                              
                              {/* Wound Metrics Grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {/* Dimensions */}
                                <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800">
                                  <Ruler className="h-4 w-4 text-blue-600 mt-0.5" />
                                  <div>
                                    <p className="text-xs text-blue-600 dark:text-blue-400">Dimensions</p>
                                    <p className="font-medium text-sm">
                                      {toNum(displayData.width).toFixed(2)} × {toNum(displayData.height).toFixed(2)} × {toNum(displayData.depth).toFixed(2)} cm
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Surface: {toNum(displayData.surface).toFixed(2)} cm²
                                    </p>
                                  </div>
                                </div>

                                {/* Duration */}
                                <div className={cn(
                                  "flex items-start gap-2 p-2.5 rounded-lg border",
                                  isChronic 
                                    ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800"
                                    : "bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800"
                                )}>
                                  <Activity className={cn("h-4 w-4 mt-0.5", isChronic ? "text-orange-600" : "text-gray-500")} />
                                  <div>
                                    <p className={cn("text-xs", isChronic ? "text-orange-600 dark:text-orange-400" : "text-gray-500")}>Duration</p>
                                    <p className={cn("font-medium text-sm", isChronic && "text-orange-600")}>{toNum(displayData.days)} days</p>
                                  </div>
                                </div>

                                {/* Exudate */}
                                <div className="flex items-start gap-2 bg-violet-50 dark:bg-violet-950/30 p-2.5 rounded-lg border border-violet-200 dark:border-violet-800">
                                  <Droplet className="h-4 w-4 text-violet-600 mt-0.5" />
                                  <div>
                                    <p className="text-xs text-violet-600 dark:text-violet-400">Exudate</p>
                                    <p className="font-medium text-sm">{(!displayData.exudate || displayData.exudate === 'None') ? "--" : displayData.exudate}</p>
                                  </div>
                                </div>

                                {/* Tissue */}
                                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                                  <Layers className="h-4 w-4 text-amber-600 mt-0.5" />
                                  <div>
                                    <p className="text-xs text-amber-600 dark:text-amber-400">Tissue</p>
                                    <p className="font-medium text-sm">{displayData.tissue || "--"}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Progress, Treatment & Debridement */}
                              <div className="mt-4 grid grid-cols-3 gap-3">
                                <div className={cn("flex items-start gap-2 p-2.5 rounded-lg border", progressStyle.bg, progressStyle.border)}>
                                  <ProgressIcon progress={displayData.progress} />
                                  <div>
                                    <p className={cn("text-xs", progressStyle.label)}>Progress</p>
                                    <p className="font-medium text-sm">{displayData.progress || "N/A"}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2 bg-green-50 dark:bg-green-950/30 p-2.5 rounded-lg border border-green-200 dark:border-green-800">
                                  <Pill className="h-4 w-4 text-green-600 mt-0.5" />
                                  <div>
                                    <p className="text-xs text-green-600 dark:text-green-400">Treatment</p>
                                    <p className="font-medium text-sm">{displayData.treatment || "--"}</p>
                                  </div>
                                </div>
                                <div className={cn(
                                  "flex items-start gap-2 p-2.5 rounded-lg border",
                                  hasDebridement 
                                    ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800"
                                    : "bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800"
                                )}>
                                  <Scissors className={cn("h-4 w-4 mt-0.5", hasDebridement ? "text-rose-600" : "text-gray-400")} />
                                  <div>
                                    <p className={cn("text-xs", hasDebridement ? "text-rose-600 dark:text-rose-400" : "text-gray-500")}>Debridement</p>
                                    <p className="font-medium text-sm">{hasDebridement ? "Yes" : "No"}</p>
                                  </div>
                                </div>
                              </div>

                              {/* PUSH Score Bar - Only shows when there's exactly 1 push_score value */}
                              {isPressureUlcer && displayData.push_score != null && (() => {
                                const encountersWithPush = history.filter(e => e.push_score != null);
                                if (encountersWithPush.length >= 2) return null; // Chart will show instead
                                
                                return (
                                  <div className="mt-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 p-3 rounded-md">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-orange-600" />
                                        <span className="font-medium text-sm">PUSH Score</span>
                                      </div>
                                      <span className="text-lg font-bold text-orange-700 dark:text-orange-400">
                                        {toNum(displayData.push_score)}/17
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                      <div
                                        className="bg-orange-600 h-2 rounded-full transition-all"
                                        style={{ width: `${(toNum(displayData.push_score) / 17) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* PUSH Score Over Time Chart - Only for Pressure Ulcers */}
                              {isPressureUlcer && history.length > 1 && (
                                <PushScoreChart
                                  encounters={history}
                                  selectedDate={currentSelectedDate}
                                  startDate={startDate}
                                  endDate={endDate}
                                  onDateClick={(date) => handleEncounterDateClick(woundKey, date)}
                                />
                              )}

                              {/* Change in Surface Area Over Time Chart */}
                              {history.length > 1 && (
                                <SurfaceAreaChart
                                  encounters={history}
                                  selectedDate={currentSelectedDate}
                                  startDate={startDate}
                                  endDate={endDate}
                                  onDateClick={(date) => handleEncounterDateClick(woundKey, date)}
                                  visibility={getVisibility(woundKey)}
                                  onToggleLine={(line) => toggleLine(woundKey, line)}
                                />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Edit Modal */}
    <WoundEditModal
      wound={editingWound ? toEditableWound(editingWound) : null}
      facilityId={facilityId}
      open={!!editingWound}
      onOpenChange={(isOpen) => {
        if (!isOpen) setEditingWound(null);
      }}
      onSaveSuccess={handleSaveSuccess}
      maxStartDate={selectedDate}
    />
    </>
  );
}
