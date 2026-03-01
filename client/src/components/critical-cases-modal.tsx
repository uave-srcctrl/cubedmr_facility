import { useState } from "react";
import { useWoundChartState } from "@/hooks/use-wound-chart-state";
import {
  AlertCircle,
  AlertTriangle,
  Activity,
  Calendar as CalendarIcon,
  MapPin,
  Ruler,
  Droplet,
  Layers,
  Pill,
  Zap,
  Pencil,
  Scissors,
  Clock,
  User,
  TrendingDown,
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
import { PushScoreChart } from "@/components/charts/push-score-chart";
import { SurfaceAreaChart } from "@/components/charts/surface-area-chart";
import { cn, getEtiologyColor, normalizeEtiology } from "@/lib/utils";
import { toNum, getHealingColor, getHealingBackground, getProgressBackground, getWoundCardBackground, formatDateDisplay } from "@/lib/wound-utils";
import { ProgressIcon, PatientHeaderCard } from "@/components/wound-display";
import { CriticalPatient, CriticalWound } from "@/hooks/use-patients";

interface CriticalCasesModalProps {
  criticalPatients: CriticalPatient[];
  totalWounds: number;
  totalPatients: number;
  facilityId: string;
  isLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientClick?: (patientId: string, patientName: string) => void;
  onRefetch?: () => void;
  startDate?: string; // YYYY-MM-DD format - start of date range
  endDate?: string; // YYYY-MM-DD format - end of date range
}

export function CriticalCasesModal({
  criticalPatients,
  totalWounds,
  totalPatients,
  facilityId,
  isLoading,
  open,
  onOpenChange,
  onPatientClick,
  onRefetch,
  startDate,
  endDate,
}: CriticalCasesModalProps) {
  // Use shared hook for chart state management
  const { getVisibility, toggleLine, getSelectedDate, handleEncounterDateClick } = useWoundChartState();

  // Check admin role for edit permissions
  const { isAdmin } = useAuth();

  // Edit mode state - track which wound is being edited
  const [editingWound, setEditingWound] = useState<CriticalWound | null>(null);

  // Check if there's a date range selected (startDate != endDate)
  const hasDateRange = startDate && endDate && startDate !== endDate;

  const getCriticalReasonColor = (reason: string) => {
    switch (reason) {
      case 'Deteriorating':
        return 'bg-red-600 text-white border-red-700';
      case 'High PUSH Score':
        return 'bg-red-500 text-white border-red-600';
      case 'Slow Healing':
        return 'bg-red-500 text-white border-red-600';
      case 'Size Increased':
        return 'bg-red-500 text-white border-red-600';
      default:
        return 'bg-red-500 text-white border-red-600';
    }
  };

  const getCriticalReasonIcon = (reason: string) => {
    switch (reason) {
      case 'Deteriorating':
        return <TrendingDown className="h-4 w-4" />;
      case 'High PUSH Score':
        return <Activity className="h-4 w-4" />;
      case 'Slow Healing':
        return <AlertCircle className="h-4 w-4" />;
      case 'Size Increased':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  // getEtiologyColor imported from @/lib/utils

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">
                Critical Cases
              </DialogTitle>
              <DialogDescription className="mt-1">
                Wounds requiring immediate attention
              </DialogDescription>
            </div>
          </div>
          {!isLoading && (
            <div className="flex gap-4 mt-4">
              <Badge variant="outline" className="text-sm px-3 py-1">
                <User className="h-3 w-3 mr-1" />
                {totalPatients} Patient{totalPatients !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="destructive" className="text-sm px-3 py-1">
                <AlertCircle className="h-3 w-3 mr-1" />
                {totalWounds} Critical Wound{totalWounds !== 1 ? "s" : ""}
              </Badge>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {isLoading ? (
            <EcgLoader title="Loading critical cases..." minHeight="min-h-[200px]" />
          ) : criticalPatients.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-3 bg-green-100 rounded-full mb-4">
                    <Activity className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-lg font-medium text-green-700">
                    No Critical Cases
                  </p>
                  <p className="text-muted-foreground mt-1">
                    All wounds are progressing well
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {criticalPatients.map((patient) => (
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
                          className={cn("overflow-hidden", getWoundCardBackground(displayData.progress))}
                        >
                          <CardHeader className="bg-muted/30 pb-3">
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
                                    <Badge className={cn("text-xs", getCriticalReasonColor(wound.critical_reason))}>
                                      {getCriticalReasonIcon(wound.critical_reason)}
                                      <span className="ml-1">{wound.critical_reason}</span>
                                    </Badge>
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
                                  <p className="text-muted-foreground">{history.length} encounter{history.length !== 1 ? "s" : ""}</p>
                                  <p className="text-xs text-muted-foreground">Since {formatDateDisplay(wound.start_date || wound.dos)}</p>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-4">
                            {/* Selected Encounter Details */}
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
                                  <div className="mt-4 grid grid-cols-3 gap-3">
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
                            </div>

                          {/* PUSH Score Bar - Only shows when there's exactly 1 push_score value */}
                          {wound.etiology?.toLowerCase().includes('pressure') && displayData.push_score != null && (() => {
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
                          {wound.encounter_history && wound.encounter_history.length > 1 && wound.etiology?.toLowerCase().includes('pressure') && (
                            <PushScoreChart
                              encounters={history}
                              selectedDate={currentSelectedDate}
                              startDate={startDate}
                              endDate={endDate}
                              onDateClick={(date) => handleEncounterDateClick(woundKey, date)}
                            />
                          )}

                          {/* Change in Surface Area Over Time */}
                          {wound.encounter_history && wound.encounter_history.length > 1 && (
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
        onRefetch?.();
        setEditingWound(null);
      }}
    />
    </>
  );
}
