import { useState, useMemo } from "react";
import { parse } from "date-fns";
import {
  Zap,
  Calendar as CalendarIcon,
  AlertCircle,
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Ruler,
  Droplet,
  Layers,
  Pill,
  Pencil,
  Scissors,
  Clock,
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
import { EcgLoader } from "@/components/ecg-loader";
import { cn, getEtiologyColor, normalizeEtiology } from "@/lib/utils";
import { toNum, getHealingColor, getHealingBackground, getProgressBackground, getWoundCardBackground, formatDateDisplay } from "@/lib/wound-utils";
import { ProgressIcon } from "@/components/wound-display";
import { useWoundChartState } from "@/hooks/use-wound-chart-state";
import { PushScoreChart } from "@/components/charts/push-score-chart";
import { SurfaceAreaChart } from "@/components/charts/surface-area-chart";
import { WoundEditModal, EditableWound } from "@/components/wound-edit-modal";
import { useAuth } from "@/hooks/use-auth";

interface WoundEncounter {
  id: string;
  dos: string;
  patient_id: string;
  facility_id: number;
  provider_id: string;
  patient_name: string;
  location: string;
  etiology: string;
  width: number;
  height: number;
  depth: number;
  surface: number;
  exudate: string;
  tissue: string;
  treatment: string;
  frequency: string;
  progress: string;
  disposition: string;
  debridement: string;
  initial_surface: number;
  start_date: string;
  days: number;
  healing_percentage: number;
  healing_rate: number;
  healing_days: number;
  push_score: number;
  POA: boolean;
  Palliative: boolean;
  Objective: boolean;
  facility_acquired: boolean;
}

interface PatientDetailModalProps {
  patientId: string;
  patientName: string;
  facilityId: string;
  woundEncounters: WoundEncounter[];
  isLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startDate?: string; // YYYY-MM-DD format - start of date range
  endDate?: string; // YYYY-MM-DD format - end of date range
}

export function PatientDetailModal({
  patientId,
  patientName,
  facilityId,
  woundEncounters,
  isLoading,
  open,
  onOpenChange,
  startDate,
  endDate,
}: PatientDetailModalProps) {
  // Check admin role for edit permissions
  const { isAdmin } = useAuth();

  // State to track which chart lines are visible per wound location
  const [chartVisibility, setChartVisibility] = useState<Record<string, { surface: boolean; prev: boolean; change: boolean }>>({}); 
  
  // State to track selected encounter date per wound (location-etiology key)
  const [selectedEncounterDate, setSelectedEncounterDate] = useState<Record<string, string>>({});
  
  // Edit mode state - simplified to just track which encounter is being edited
  const [editingEncounter, setEditingEncounter] = useState<WoundEncounter | null>(null);

  const getVisibility = (woundKey: string) => chartVisibility[woundKey] || { surface: true, prev: true, change: true };
  
  const toggleLine = (woundKey: string, line: 'surface' | 'prev' | 'change') => {
    setChartVisibility(prev => ({
      ...prev,
      [woundKey]: {
        ...getVisibility(woundKey),
        [line]: !getVisibility(woundKey)[line]
      }
    }));
  };
  
  // Get selected encounter date for a wound - default to most recent encounter (first in sorted array)
  const getSelectedDate = (woundKey: string, encounters: WoundEncounter[]) => {
    if (selectedEncounterDate[woundKey]) {
      return selectedEncounterDate[woundKey];
    }
    // Default to most recent encounter (encounters array is sorted by date descending)
    return encounters[0]?.dos || '';
  };
  
  // Check if there's a date range selected (startDate != endDate)
  const hasDateRange = startDate && endDate && startDate !== endDate;
  
  // Get the encounter for the selected date
  const getSelectedEncounter = (woundKey: string, encounters: WoundEncounter[]) => {
    const date = getSelectedDate(woundKey, encounters);
    return encounters.find(e => e.dos === date) || encounters[0];
  };
  
  // Handle clicking on an encounter date
  const handleEncounterDateClick = (woundKey: string, date: string) => {
    setSelectedEncounterDate(prev => ({
      ...prev,
      [woundKey]: date
    }));
  };
  
  // Get max start date for edit modal (based on oldest encounter for this wound)
  const getMaxStartDate = (encounter: WoundEncounter): Date | undefined => {
    const woundKey = `${encounter.location}-${encounter.etiology}`;
    const woundEncountersForEdit = woundEncounters.filter(e => 
      `${e.location}-${e.etiology}` === woundKey
    );
    const sortedEncounters = [...woundEncountersForEdit].sort((a, b) => 
      new Date(a.dos).getTime() - new Date(b.dos).getTime()
    );
    if (sortedEncounters.length > 0) {
      return parse(sortedEncounters[0].dos.split('T')[0], 'yyyy-MM-dd', new Date());
    }
    return undefined;
  };

  // getEtiologyColor imported from @/lib/utils

  // Determine if a wound meets critical case criteria
  const getCriticalReason = (encounter: WoundEncounter): string | null => {
    // Skip palliative wounds
    if (encounter.Palliative) return null;
    
    const progress = encounter.progress?.toLowerCase() || "";
    
    // Check deteriorating progress
    if (progress.includes("deterior") || progress.includes("worse") || progress.includes("declin")) {
      return "Deteriorating";
    }
    
    // Check high PUSH score (>= 12)
    if (toNum(encounter.push_score) >= 12) {
      return "High PUSH Score";
    }
    
    // Check slow healing (days >= 60 AND healing < 25%)
    if (toNum(encounter.days) >= 60 && toNum(encounter.healing_percentage) < 25) {
      return "Slow Healing";
    }
    
    // Check size increased (current surface > initial surface)
    if (toNum(encounter.surface) > toNum(encounter.initial_surface) && toNum(encounter.initial_surface) > 0) {
      return "Size Increased";
    }
    
    return null;
  };

  const getCriticalReasonColor = () => {
    return 'bg-red-500 text-white border-red-600';
  };

  const getCriticalReasonIcon = (reason: string) => {
    switch (reason) {
      case 'Deteriorating':
        return <TrendingDown className="h-3 w-3" />;
      case 'High PUSH Score':
        return <Zap className="h-3 w-3" />;
      case 'Slow Healing':
        return <Activity className="h-3 w-3" />;
      case 'Size Increased':
        return <TrendingUp className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  // Group encounters by wound location to show wound history
  const groupedByLocation = woundEncounters.reduce((acc, encounter) => {
    const key = `${encounter.location}-${encounter.etiology}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(encounter);
    return acc;
  }, {} as Record<string, WoundEncounter[]>);

  // Sort encounters within each group by date (most recent first)
  Object.keys(groupedByLocation).forEach(key => {
    groupedByLocation[key].sort((a, b) => new Date(b.dos).getTime() - new Date(a.dos).getTime());
  });

  // Calculate unique visits (unique DOS dates)
  const uniqueVisits = new Set(woundEncounters.map(e => e.dos)).size;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">
                {patientName || "Unknown Patient"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1 font-mono">
                ID: {patientId}
              </p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-sm">
                {uniqueVisits} Visit{uniqueVisits !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {isLoading ? (
            <EcgLoader title="Loading patient details..." minHeight="min-h-[200px]" />
          ) : woundEncounters.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    No wound encounters found for this patient
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Wounds by Location */}
              {Object.entries(groupedByLocation).map(([key, encounters]) => {
                const latestEncounter = encounters[0]; // Most recent
                const oldestEncounter = encounters[encounters.length - 1];
                const displayEncounter = getSelectedEncounter(key, encounters);
                const currentSelectedDate = getSelectedDate(key, encounters);
                
                return (
                  <Card key={key} className={cn("overflow-hidden", getWoundCardBackground(displayEncounter.progress))}>
                    <CardHeader className="bg-muted/30 pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <CardTitle className="text-base font-semibold">
                              {displayEncounter.location || "Unknown Location"}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge className={cn("text-xs", getEtiologyColor(displayEncounter.etiology))}>
                                {normalizeEtiology(displayEncounter.etiology)}
                              </Badge>
                              {displayEncounter.POA && (
                                <Badge variant="secondary" className="text-xs">POA</Badge>
                              )}
                              {displayEncounter.facility_acquired ? (
                                <Badge variant="destructive" className="text-xs">Facility Acquired</Badge>
                              ) : (
                                <Badge className="text-xs bg-slate-600 text-white">Community Acquired</Badge>
                              )}
                              {displayEncounter.Palliative && (
                                <Badge variant="outline" className="text-xs">Palliative</Badge>
                              )}
                              {(() => {
                                const criticalReason = getCriticalReason(displayEncounter);
                                if (criticalReason) {
                                  return (
                                    <Badge className={cn("text-xs", getCriticalReasonColor())}>
                                      {getCriticalReasonIcon(criticalReason)}
                                      <span className="ml-1">{criticalReason}</span>
                                    </Badge>
                                  );
                                }
                                return null;
                              })()}
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
                              onClick={() => setEditingEncounter(displayEncounter)}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          )}
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">
                              {encounters.length} encounter{encounters.length !== 1 ? "s" : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Since {formatDateDisplay(oldestEncounter.start_date || oldestEncounter.dos)}
                            </p>
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
                            Viewing: {formatDateDisplay(displayEncounter.dos)}
                            {displayEncounter.dos === latestEncounter.dos && (
                              <Badge variant="secondary" className="text-xs ml-1">Latest</Badge>
                            )}
                            {hasDateRange && displayEncounter.dos >= (startDate || '') && displayEncounter.dos <= (endDate || '') && (
                              <Badge variant="default" className="text-xs ml-1">In Range</Badge>
                            )}
                          </div>
                        </div>
                        {displayEncounter.disposition !== "Resolved" && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {/* Dimensions */}
                          <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800">
                            <Ruler className="h-4 w-4 text-blue-600 mt-0.5" />
                            <div>
                              <p className="text-xs text-blue-600 dark:text-blue-400">Dimensions</p>
                              <p className="font-medium text-sm">
                                {toNum(displayEncounter.width).toFixed(2)} × {toNum(displayEncounter.height).toFixed(2)} × {toNum(displayEncounter.depth).toFixed(2)} cm
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Surface: {toNum(displayEncounter.surface).toFixed(2)} cm²
                              </p>
                            </div>
                          </div>

                          {/* Healing */}
                          {(() => {
                            const healingStyle = getHealingBackground(toNum(displayEncounter.healing_percentage));
                            return (
                              <div className={cn("flex items-start gap-2 p-2.5 rounded-lg border", healingStyle.bg, healingStyle.border)}>
                                <Activity className={cn("h-4 w-4 mt-0.5", healingStyle.icon)} />
                                <div>
                                  <p className={cn("text-xs", healingStyle.label)}>Healing</p>
                                  <p className={cn("font-medium text-sm", getHealingColor(toNum(displayEncounter.healing_percentage)))}>
                                    {toNum(displayEncounter.healing_percentage).toFixed(1)}%
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {displayEncounter.days || 0} days in treatment
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
                              <p className="font-medium text-sm">{!displayEncounter.exudate || displayEncounter.exudate === 'None' ? "--" : displayEncounter.exudate}</p>
                            </div>
                          </div>

                          {/* Tissue */}
                          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                            <Layers className="h-4 w-4 text-amber-600 mt-0.5" />
                            <div>
                              <p className="text-xs text-amber-600 dark:text-amber-400">Tissue</p>
                              <p className="font-medium text-sm">{displayEncounter.tissue || "--"}</p>
                            </div>
                          </div>
                        </div>
                        )}

                        {/* Progress, Treatment & Debridement */}
                        {(() => {
                          const healingStyle = getHealingBackground(toNum(displayEncounter.healing_percentage));
                          const progressStyle = getProgressBackground(displayEncounter.progress);
                          const hasDebridement = displayEncounter.debridement === 'YES' || displayEncounter.debridement === 'Yes';
                          const isResolved = displayEncounter.disposition === "Resolved";
                          return (
                            <div className={`mt-4 grid ${isResolved ? 'grid-cols-1' : 'grid-cols-3'} gap-3`}>
                              <div className={cn("flex items-start gap-2 p-2.5 rounded-lg border", progressStyle.bg, progressStyle.border)}>
                                <ProgressIcon progress={displayEncounter.progress} />
                                <div>
                                  <p className={cn("text-xs", progressStyle.label)}>Progress</p>
                                  <p className="font-medium text-sm">{displayEncounter.progress || "N/A"}</p>
                                </div>
                              </div>
                              {!isResolved && (
                              <div className={cn("flex items-start gap-2 p-2.5 rounded-lg border", healingStyle.bg, healingStyle.border)}>
                                <Pill className={cn("h-4 w-4 mt-0.5", healingStyle.icon)} />
                                <div>
                                  <p className={cn("text-xs", healingStyle.label)}>Treatment</p>
                                  <p className="font-medium text-sm">{displayEncounter.treatment || "--"}</p>
                                </div>
                              </div>
                              )}
                              {!isResolved && (
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
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* PUSH Score Bar - Only shows when there's exactly 1 push_score value */}
                      {displayEncounter.disposition !== "Resolved" && encounters[0]?.etiology?.toLowerCase().includes('pressure') && displayEncounter.push_score != null && (() => {
                        const chronological = [...encounters].reverse();
                        const deduplicatedChronological = chronological.reduce((acc, enc) => {
                          const existingIdx = acc.findIndex(e => e.dos === enc.dos);
                          if (existingIdx === -1) acc.push(enc);
                          else if (enc.id > acc[existingIdx].id) acc[existingIdx] = enc;
                          return acc;
                        }, [] as typeof chronological);
                        const encountersWithPush = deduplicatedChronological.filter(e => e.push_score != null);
                        if (encountersWithPush.length >= 2) return null; // Chart will show instead
                        
                        return (
                          <div className="mt-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 p-3 rounded-md">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-orange-600" />
                                <span className="font-medium text-sm">PUSH Score</span>
                              </div>
                              <span className="text-lg font-bold text-orange-700 dark:text-orange-400">
                                {toNum(displayEncounter.push_score)}/17
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                              <div
                                className="bg-orange-600 h-2 rounded-full transition-all"
                                style={{ width: `${(toNum(displayEncounter.push_score) / 17) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}

                      {/* PUSH Score Over Time Chart - Only for Pressure Ulcers */}
                      {displayEncounter.disposition !== "Resolved" && encounters.length > 1 && encounters[0]?.etiology?.toLowerCase().includes('pressure') && (
                        <PushScoreChart
                          encounters={[...encounters].reverse()}
                          selectedDate={currentSelectedDate}
                          startDate={startDate}
                          endDate={endDate}
                          onDateClick={(date) => handleEncounterDateClick(key, date)}
                        />
                      )}

                      {/* Change in Surface Area Over Time */}
                      {displayEncounter.disposition !== "Resolved" && encounters.length > 1 && (
                        <SurfaceAreaChart
                          encounters={[...encounters].reverse()}
                          selectedDate={currentSelectedDate}
                          startDate={startDate}
                          endDate={endDate}
                          onDateClick={(date) => handleEncounterDateClick(key, date)}
                          visibility={getVisibility(key)}
                          onToggleLine={(line) => toggleLine(key, line)}
                        />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    
    {/* Edit Wound Encounter Modal - Using shared WoundEditModal component */}
    <WoundEditModal
      wound={editingEncounter as EditableWound | null}
      facilityId={facilityId}
      open={!!editingEncounter}
      onOpenChange={(open) => !open && setEditingEncounter(null)}
      maxStartDate={editingEncounter ? getMaxStartDate(editingEncounter) : undefined}
    />
    </>
  );
}
