import { useState } from "react";
import { useWoundChartState } from "@/hooks/use-wound-chart-state";
import {
  Activity,
  TrendingDown,
  Calendar as CalendarIcon,
  MapPin,
  User,
  Ruler,
  CircleDot,
  Clock,
  Droplet,
  Layers,
  Pill,
  Scissors,
  Zap,
  Pencil,
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
import { EcgLoader } from "@/components/ecg-loader";
import { cn, getEtiologyColor, normalizeEtiology } from "@/lib/utils";
import { toNum, getHealingColor, getHealingBackground, getProgressBackground, getWoundCardBackground, formatDateDisplay } from "@/lib/wound-utils";
import { ProgressIcon, PatientHeaderCard } from "@/components/wound-display";
import { CriticalPatient, CriticalWound } from "@/hooks/use-patients";
import { PushScoreChart } from "@/components/charts/push-score-chart";
import { SurfaceAreaChart } from "@/components/charts/surface-area-chart";

export type StatusType = "healingStatus" | "disposition";

interface WoundsByStatusModalProps {
  patients: CriticalPatient[];
  totalWounds: number;
  totalPatients: number;
  statusValue: string;
  statusType: StatusType;
  facilityId: string;
  isLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientClick?: (patientId: string, patientName: string) => void;
  onRefetch?: () => void;
  startDate?: string;
  endDate?: string;
}

// Get the display title based on status type
function getStatusTitle(statusType: StatusType, statusValue: string): string {
  if (statusType === "healingStatus") {
    return `${statusValue} Wounds`;
  }
  return `${statusValue} Wounds`;
}

// Get the description based on status type
function getStatusDescription(statusType: StatusType, statusValue: string): string {
  if (statusType === "healingStatus") {
    return `Wounds with healing status: ${statusValue}`;
  }
  return `Wounds with disposition: ${statusValue}`;
}

// Get color based on healing status
function getHealingStatusColor(status: string): string {
  const s = status?.toLowerCase() || "";
  if (s.includes("improv") || s.includes("heal")) return "text-green-600";
  if (s.includes("stable")) return "text-blue-600";
  if (s.includes("deterior") || s.includes("worse") || s.includes("declin")) return "text-red-600";
  if (s.includes("new")) return "text-yellow-600";
  return "text-gray-600";
}

// Get color based on disposition
function getDispositionColor(status: string): string {
  const s = status?.toLowerCase() || "";
  if (s.includes("resolved") || s.includes("healed") || s.includes("closed")) return "text-green-600";
  if (s.includes("active")) return "text-orange-600";
  return "text-gray-600";
}

// Get badge colors for disposition (background + text for better legibility)
function getDispositionBadgeColor(status: string): string {
  const s = status?.toLowerCase() || "";
  if (s.includes("resolved") || s.includes("healed") || s.includes("closed")) {
    return "bg-green-600 text-white hover:bg-green-700";
  }
  if (s.includes("active")) {
    return "bg-amber-500 text-white hover:bg-amber-600";
  }
  return "bg-gray-500 text-white hover:bg-gray-600";
}

// Get badge color based on status type
function getBadgeColor(statusType: StatusType, statusValue: string): string {
  if (statusType === "healingStatus") {
    const s = statusValue?.toLowerCase() || "";
    if (s.includes("improv")) return "bg-green-600 text-white hover:bg-green-700";
    if (s.includes("stable")) return "bg-blue-600 text-white hover:bg-blue-700";
    if (s.includes("deterior")) return "bg-red-600 text-white hover:bg-red-700";
    if (s.includes("new")) return "bg-yellow-500 text-white hover:bg-yellow-600";
    return "bg-gray-500 text-white hover:bg-gray-600";
  }
  return getDispositionBadgeColor(statusValue);
}

// Get background based on status
function getStatusBackground(statusType: StatusType, statusValue: string): string {
  if (statusType === "healingStatus") {
    const s = statusValue?.toLowerCase() || "";
    if (s.includes("improv")) return "bg-green-100";
    if (s.includes("stable")) return "bg-blue-100";
    if (s.includes("deterior")) return "bg-red-100";
    if (s.includes("new")) return "bg-yellow-100";
    return "bg-gray-100";
  } else {
    const s = statusValue?.toLowerCase() || "";
    if (s.includes("resolved") || s.includes("healed")) return "bg-green-100";
    if (s.includes("active")) return "bg-orange-100";
    return "bg-gray-100";
  }
}

// Get icon background based on status
function getIconColor(statusType: StatusType, statusValue: string): string {
  if (statusType === "healingStatus") {
    return getHealingStatusColor(statusValue);
  }
  return getDispositionColor(statusValue);
}

export function WoundsByStatusModal({
  patients,
  totalWounds,
  totalPatients,
  statusValue,
  statusType,
  facilityId,
  isLoading,
  open,
  onOpenChange,
  onPatientClick,
  onRefetch,
  startDate,
  endDate,
}: WoundsByStatusModalProps) {
  // Use shared hook for chart state management
  const { getVisibility, toggleLine, getSelectedDate, handleEncounterDateClick, resetSelection } = useWoundChartState();

  // Check admin role for edit permissions
  const { isAdmin } = useAuth();

  // Edit mode state - track which wound is being edited
  const [editingWound, setEditingWound] = useState<CriticalWound | null>(null);

  // Check if there's a date range selected (startDate != endDate)
  const hasDateRange = startDate && endDate && startDate !== endDate;

  // Check if this is Active disposition (shows full card with charts)
  const isActiveDisposition = statusType === "disposition" && statusValue?.toLowerCase() === "active";

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-full", getStatusBackground(statusType, statusValue))}>
              <CircleDot className={cn("h-6 w-6", getIconColor(statusType, statusValue))} />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">
                {getStatusTitle(statusType, statusValue)}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {getStatusDescription(statusType, statusValue)}
              </DialogDescription>
            </div>
          </div>
          {!isLoading && (
            <div className="flex gap-4 mt-4">
              <Badge variant="outline" className="text-sm px-3 py-1">
                <User className="h-3 w-3 mr-1" />
                {totalPatients} Patient{totalPatients !== 1 ? "s" : ""}
              </Badge>
              <Badge className={cn("text-sm px-3 py-1", getBadgeColor(statusType, statusValue))}>
                <CircleDot className="h-3 w-3 mr-1" />
                {totalWounds} Wound{totalWounds !== 1 ? "s" : ""}
              </Badge>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {isLoading ? (
            <EcgLoader title={`Loading ${statusValue} wounds...`} minHeight="min-h-[200px]" />
          ) : patients.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-3 bg-gray-100 rounded-full mb-4">
                    <Activity className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium text-gray-600">
                    No {statusValue} Wounds Found
                  </p>
                  <p className="text-muted-foreground mt-1">
                    No wounds matching this status in the selected date range
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {patients.map((patient) => (
                <Card 
                  key={patient.patient_id} 
                  className={cn(
                    "overflow-hidden transition-all",
                    onPatientClick && "hover:shadow-md cursor-pointer"
                  )}
                  onClick={() => onPatientClick?.(patient.patient_id, patient.patient_name)}
                >
                  <CardContent className="p-4">
                    {/* Patient Header */}
                    <PatientHeaderCard
                      patientName={patient.patient_name}
                      patientId={patient.patient_id}
                      woundCount={patient.wounds.length}
                      showChevron={!!onPatientClick}
                    />

                    {/* Wounds List */}
                    <div className="space-y-2">
                      {patient.wounds.map((wound, idx) => {
                        // Get the wound key for tracking selected date
                        const woundKey = wound.id || `${wound.patient_id}-${wound.location}`;
                        const history = wound.encounter_history || [];
                        const currentSelectedDate = getSelectedDate(woundKey, history);
                        
                        // Find the encounter data for the selected date, or use wound data as fallback
                        const selectedEncounter = history.find(h => h.dos === currentSelectedDate);
                        const displayData = {
                          width: selectedEncounter?.width ?? wound.width,
                          height: selectedEncounter?.height ?? wound.height,
                          depth: selectedEncounter?.depth ?? wound.depth,
                          surface: selectedEncounter?.surface ?? wound.surface,
                          exudate: selectedEncounter?.exudate ?? wound.exudate,
                          tissue: selectedEncounter?.tissue ?? wound.tissue,
                          treatment: selectedEncounter?.treatment ?? wound.treatment,
                          progress: selectedEncounter?.progress ?? wound.progress,
                          debridement: selectedEncounter?.debridement ?? wound.debridement,
                          days: selectedEncounter?.days ?? wound.days,
                          healing_percentage: selectedEncounter?.healing_percentage ?? wound.healing_percentage,
                          push_score: selectedEncounter?.push_score ?? wound.push_score,
                        };
                        const isLatest = !currentSelectedDate || currentSelectedDate === history[history.length - 1]?.dos;
                        
                        return (
                        <Card 
                          key={wound.id || idx}
                          className={cn("overflow-hidden", getWoundCardBackground(displayData.progress || '', wound.disposition || ''))}
                        >
                          <CardHeader className="bg-muted/30 py-3 px-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <CardTitle className="text-base font-semibold">
                                    {wound.location || "Unknown Location"}
                                  </CardTitle>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <Badge className={cn("text-xs", getEtiologyColor(wound.etiology))}>
                                      {normalizeEtiology(wound.etiology)}
                                    </Badge>
                                    {wound.POA && (
                                      <Badge variant="secondary" className="text-xs">POA</Badge>
                                    )}
                                    {wound.facility_acquired ? (
                                      <Badge variant="destructive" className="text-xs">Facility Acquired</Badge>
                                    ) : (
                                      <Badge className="text-xs bg-slate-600 text-white">Community Acquired</Badge>
                                    )}
                                    {wound.Palliative && (
                                      <Badge variant="outline" className="text-xs">Palliative</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Edit button - only for Active disposition and Admin users */}
                                {isActiveDisposition && isAdmin() && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      // Create editable wound with selected encounter's data
                                      const encounterId = selectedEncounter?.id || wound.id;
                                      const editableWound: CriticalWound = {
                                        ...wound,
                                        id: String(encounterId),
                                        dos: currentSelectedDate || wound.dos,
                                        width: toNum(selectedEncounter?.width ?? wound.width),
                                        height: toNum(selectedEncounter?.height ?? wound.height),
                                        depth: toNum(selectedEncounter?.depth ?? wound.depth),
                                        surface: toNum(selectedEncounter?.surface ?? wound.surface),
                                        exudate: selectedEncounter?.exudate ?? wound.exudate,
                                        tissue: selectedEncounter?.tissue ?? wound.tissue,
                                        treatment: selectedEncounter?.treatment ?? wound.treatment,
                                        progress: selectedEncounter?.progress ?? wound.progress,
                                        debridement: selectedEncounter?.debridement ?? wound.debridement,
                                        push_score: toNum(selectedEncounter?.push_score ?? wound.push_score),
                                      };
                                      setEditingWound(editableWound);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                )}
                                <div className="text-right text-sm">
                                  {(isActiveDisposition || statusType === "healingStatus") && history.length > 0 ? (
                                    <>
                                      <p className="text-muted-foreground">{history.length} encounter{history.length !== 1 ? "s" : ""}</p>
                                      <p className="text-xs text-muted-foreground">Since {formatDateDisplay(wound.start_date || wound.dos)}</p>
                                    </>
                                  ) : (
                                    <p className="text-muted-foreground flex items-center gap-1 justify-end">
                                      <CalendarIcon className="h-3 w-3" />
                                      {formatDateDisplay(wound.dos)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          {/* Show wound metrics for healingStatus OR Active disposition */}
                          {(statusType === "healingStatus" || isActiveDisposition) && (
                            <CardContent className="pt-3 pb-3">
                              {/* Selected Encounter Details - only when there's history to navigate */}
                              {(isActiveDisposition || statusType === "healingStatus") && history.length > 0 && (
                                <div className="mb-4 pb-4 border-b">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      <CalendarIcon className="h-3 w-3" />
                                      Viewing: {formatDateDisplay(currentSelectedDate)}
                                      {isLatest && (
                                        <Badge variant="secondary" className="text-xs ml-1">Latest</Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {/* Wound Metrics - Full card like critical cases for Active */}
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

                                {/* Healing */}
                                {(() => {
                                  const healingStyle = getHealingBackground(toNum(displayData.healing_percentage));
                                  return (
                                    <div className={cn("flex items-start gap-2 p-2.5 rounded-lg border", healingStyle.bg, healingStyle.border)}>
                                      <Activity className={cn("h-4 w-4 mt-0.5", healingStyle.icon)} />
                                      <div>
                                        <p className={cn("text-xs", healingStyle.label)}>Healing</p>
                                        <p className={cn("font-medium text-sm", getHealingColor(toNum(displayData.healing_percentage)))}>
                                          {toNum(displayData.healing_percentage).toFixed(1)}%
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {toNum(displayData.days) || 0} days
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Exudate */}
                                <div className="flex items-start gap-2 bg-violet-50 dark:bg-violet-950/30 p-2.5 rounded-lg border border-violet-200 dark:border-violet-800">
                                  <Droplet className="h-4 w-4 text-violet-600 mt-0.5" />
                                  <div>
                                    <p className="text-xs text-violet-600 dark:text-violet-400">Exudate</p>
                                    <p className="font-medium text-sm">{!displayData.exudate || displayData.exudate === 'None' ? "--" : displayData.exudate}</p>
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
                              {(() => {
                                const progressStyle = getProgressBackground(displayData.progress);
                                const healingStyle = getHealingBackground(toNum(displayData.healing_percentage));
                                const hasDebridement = displayData.debridement === 'YES' || displayData.debridement === 'Yes';
                                return (
                                  <div className="mt-3 grid grid-cols-3 gap-3">
                                    <div className={cn("flex items-start gap-2 p-2.5 rounded-lg border", progressStyle.bg, progressStyle.border)}>
                                      <ProgressIcon progress={displayData.progress} />
                                      <div>
                                        <p className={cn("text-xs", progressStyle.label)}>Progress</p>
                                        <p className="font-medium text-sm">{displayData.progress || "N/A"}</p>
                                      </div>
                                    </div>
                                    <div className={cn("flex items-start gap-2 p-2.5 rounded-lg border", healingStyle.bg, healingStyle.border)}>
                                      <Pill className={cn("h-4 w-4 mt-0.5", healingStyle.icon)} />
                                      <div>
                                        <p className={cn("text-xs", healingStyle.label)}>Treatment</p>
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
                                );
                              })()}

                              {/* PUSH Score Bar - Only shows when there's exactly 1 push_score value */}
                              {(isActiveDisposition || statusType === "healingStatus") && wound.etiology?.toLowerCase().includes('pressure') && displayData.push_score != null && (() => {
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

                              {/* PUSH Score Over Time Chart - For Pressure Ulcers */}
                              {(isActiveDisposition || statusType === "healingStatus") && history.length > 1 && wound.etiology?.toLowerCase().includes('pressure') && (
                                <PushScoreChart
                                  encounters={history}
                                  selectedDate={currentSelectedDate}
                                  startDate={startDate}
                                  endDate={endDate}
                                  onDateClick={(date) => handleEncounterDateClick(woundKey, date)}
                                />
                              )}

                              {/* Change in Surface Area Over Time */}
                              {(isActiveDisposition || statusType === "healingStatus") && history.length > 1 && (
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
                            </CardContent>
                          )}
                        </Card>
                      );})}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    
    {/* Edit Wound Modal - Using shared WoundEditModal component */}
    <WoundEditModal
      wound={editingWound as EditableWound | null}
      facilityId={facilityId}
      open={!!editingWound}
      onOpenChange={(isOpen) => !isOpen && setEditingWound(null)}
      onSaveSuccess={() => {
        // Reset selected encounter date for the edited wound so it shows latest data
        if (editingWound) {
          const woundKey = editingWound.id || `${editingWound.patient_id}-${editingWound.location}`;
          resetSelection(woundKey);
        }
        onRefetch?.();
        setEditingWound(null);
      }}
    />
    </>
  );
}
