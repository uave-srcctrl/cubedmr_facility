import { useState } from "react";
import { format } from "date-fns";
import {
  Activity,
  TrendingDown,
  TrendingUp,
  Minus,
  Calendar as CalendarIcon,
  MapPin,
  User,
  ChevronRight,
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
import { EcgLoader } from "@/components/ecg-loader";
import { cn, getEtiologyColor, normalizeEtiology } from "@/lib/utils";
import { CriticalPatient, CriticalWound } from "@/hooks/use-patients";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from "recharts";

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

// Helper to parse string values to numbers
const toNum = (val: unknown): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  return 0;
};

// Get healing color based on percentage
function getHealingColor(percentage: number): string {
  if (percentage >= 75) return "text-green-600";
  if (percentage >= 50) return "text-emerald-600";
  if (percentage >= 25) return "text-yellow-600";
  return "text-orange-600";
}

// Get healing background style
function getHealingBackground(healingPercentage: number) {
  if (healingPercentage > 0) {
    return {
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800",
      icon: "text-green-600",
      label: "text-green-600 dark:text-green-400"
    };
  }
  return {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    icon: "text-red-600",
    label: "text-red-600 dark:text-red-400"
  };
}

// Get progress background style
function getProgressBackground(progress: string) {
  const p = progress?.toLowerCase() || "";
  if (p.includes("improv") || p.includes("heal") || p.includes("resolved") || p.includes("closed")) {
    return {
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800",
      icon: "text-green-600",
      label: "text-green-600 dark:text-green-400"
    };
  }
  if (p.includes("worse") || p.includes("declin") || p.includes("deterior")) {
    return {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800",
      icon: "text-red-600",
      label: "text-red-600 dark:text-red-400"
    };
  }
  return {
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    border: "border-cyan-200 dark:border-cyan-800",
    icon: "text-cyan-600",
    label: "text-cyan-600 dark:text-cyan-400"
  };
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
  // State to track which chart lines are visible per wound
  const [chartVisibility, setChartVisibility] = useState<Record<string, { surface: boolean; prev: boolean; change: boolean }>>({});
  
  // State to track selected encounter date per wound
  const [selectedEncounterDate, setSelectedEncounterDate] = useState<Record<string, string>>({});

  // Edit mode state - track which wound is being edited
  const [editingWound, setEditingWound] = useState<CriticalWound | null>(null);

  // Check if there's a date range selected (startDate != endDate)
  const hasDateRange = startDate && endDate && startDate !== endDate;

  // Check if this is Active disposition (shows full card with charts)
  const isActiveDisposition = statusType === "disposition" && statusValue?.toLowerCase() === "active";

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
  const getSelectedDate = (woundKey: string, history: Array<{ dos: string }>) => {
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

  const getProgressIcon = (progress: string) => {
    const p = progress?.toLowerCase() || "";
    if (p.includes("improv") || p.includes("heal")) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    }
    if (p.includes("deterior") || p.includes("worse") || p.includes("declin")) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const formatDate = (dateString: string) => {
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

  const getWoundCardBackground = (progress: string, disposition: string) => {
    const p = progress?.toLowerCase() || "";
    const d = disposition?.toLowerCase() || "";
    
    // Check disposition first for resolved/healed
    if (d.includes("resolved") || d.includes("healed") || d.includes("closed")) {
      return "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800";
    }
    
    // Then check progress
    if (p.includes("improv")) {
      return "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800";
    }
    if (p.includes("deterior") || p.includes("worse") || p.includes("declin")) {
      return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
    }
    
    return "bg-muted/30";
  };

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
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {patient.patient_name || "Unknown Patient"}
                          </h3>
                          <p className="text-xs text-muted-foreground font-mono">
                            ID: {patient.patient_id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn(getBadgeColor(statusType, statusValue))}>
                          {patient.wounds.length} wound{patient.wounds.length !== 1 ? "s" : ""}
                        </Badge>
                        {onPatientClick && (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

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
                          className={cn("overflow-hidden", getWoundCardBackground(displayData.progress, wound.disposition))}
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
                                {/* Edit button - only for Active disposition */}
                                {isActiveDisposition && (
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
                                  {isActiveDisposition && history.length > 0 ? (
                                    <>
                                      <p className="text-muted-foreground">{history.length} encounter{history.length !== 1 ? "s" : ""}</p>
                                      <p className="text-xs text-muted-foreground">Since {formatDate(wound.start_date || wound.dos)}</p>
                                    </>
                                  ) : (
                                    <p className="text-muted-foreground flex items-center gap-1 justify-end">
                                      <CalendarIcon className="h-3 w-3" />
                                      {formatDate(wound.dos)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          {/* Show wound metrics for healingStatus OR Active disposition */}
                          {(statusType === "healingStatus" || isActiveDisposition) && (
                            <CardContent className="pt-3 pb-3">
                              {/* Selected Encounter Details - only for Active disposition with history */}
                              {isActiveDisposition && history.length > 0 && (
                                <div className="mb-4 pb-4 border-b">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      <CalendarIcon className="h-3 w-3" />
                                      Viewing: {formatDate(currentSelectedDate)}
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
                                      {toNum(displayData.width)} × {toNum(displayData.height)} × {toNum(displayData.depth)} cm
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
                                      {getProgressIcon(displayData.progress)}
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

                              {/* PUSH Score Bar - Only shows when there's exactly 1 push_score value (Active disposition only) */}
                              {isActiveDisposition && wound.etiology?.toLowerCase().includes('pressure') && displayData.push_score != null && (() => {
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

                              {/* PUSH Score Over Time Chart - Only for Pressure Ulcers with Active disposition */}
                              {isActiveDisposition && history.length > 1 && wound.etiology?.toLowerCase().includes('pressure') && (() => {
                                // Filter encounters that have push_score
                                const encountersWithPush = history.filter(e => e.push_score != null);
                                if (encountersWithPush.length < 2) return null;
                                
                                const initialPush = toNum(encountersWithPush[0]?.push_score);
                                
                                // Calculate chart data
                                const pushChartData = encountersWithPush.map((e, i) => {
                                  const currentPush = toNum(e.push_score);
                                  const prevPush = i > 0 ? toNum(encountersWithPush[i - 1].push_score) : currentPush;
                                  const changeFromPrev = i > 0 ? currentPush - prevPush : 0;
                                  const changeFromInitial = currentPush - initialPush;
                                  
                                  return {
                                    date: formatDate(e.dos),
                                    rawDate: e.dos,
                                    pushScore: currentPush,
                                    changeFromPrev,
                                    changeFromInitial,
                                    id: e.id
                                  };
                                });
                                
                                const selectedDateFormatted = formatDate(currentSelectedDate);
                                const startDateFormatted = startDate ? formatDate(startDate) : null;
                                const endDateFormatted = endDate ? formatDate(endDate) : null;
                                const pushDisplayData = [...pushChartData].reverse();
                                
                                return (
                                <div className="mt-4 pt-4 border-t bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 p-3 rounded-md -mx-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Zap className="h-4 w-4 text-orange-600" />
                                      <p className="text-xs font-medium text-orange-700 dark:text-orange-400">
                                        PUSH Score Over Time
                                      </p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-4">
                                    {/* Left column - Data list */}
                                    <div className="space-y-1 max-h-[180px] overflow-y-auto">
                                      {pushDisplayData.map((enc, encIdx) => {
                                        const isFirst = encIdx === pushDisplayData.length - 1;
                                        const isSelected = enc.date === selectedDateFormatted;
                                        const isInRange = hasDateRange && startDate && endDate && 
                                          enc.rawDate >= startDate && enc.rawDate <= endDate;
                                        return (
                                        <div 
                                          key={enc.id || encIdx}
                                          onClick={(e) => { e.stopPropagation(); handleEncounterDateClick(woundKey, enc.rawDate); }}
                                          className={cn(
                                            "flex items-center justify-between p-2 rounded text-sm cursor-pointer transition-colors",
                                            isSelected 
                                              ? "bg-orange-100 dark:bg-orange-900/30 ring-2 ring-orange-500" 
                                              : isInRange
                                                ? "bg-orange-50 dark:bg-orange-900/10 border-l-2 border-orange-300"
                                                : "bg-muted/30 hover:bg-muted/50"
                                          )}
                                        >
                                          <div className="flex items-center gap-2">
                                            <CalendarIcon className={cn("h-3 w-3", isSelected ? "text-orange-600" : isInRange ? "text-orange-400" : "text-muted-foreground")} />
                                            <span className={isSelected ? "font-semibold text-orange-700 dark:text-orange-300" : isInRange ? "text-orange-600 dark:text-orange-400" : ""}>{enc.date}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-xs">
                                            <span className="font-medium text-orange-700 dark:text-orange-400">{enc.pushScore}/17</span>
                                            {!isFirst && (
                                              <span className={enc.changeFromPrev < 0 ? "text-green-600" : enc.changeFromPrev > 0 ? "text-red-600" : "text-muted-foreground"}>
                                                {enc.changeFromPrev > 0 ? "+" : ""}{enc.changeFromPrev}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );})}
                                    </div>
                                    {/* Right column - Line Chart */}
                                    <div className="h-[180px] w-full">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={pushChartData}>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                          <XAxis 
                                            dataKey="date" 
                                            stroke="hsl(var(--muted-foreground))" 
                                            fontSize={10} 
                                            tickLine={false} 
                                            axisLine={false}
                                            angle={-45}
                                            textAnchor="end"
                                            height={50}
                                          />
                                          <YAxis 
                                            domain={[0, 17]}
                                            stroke="hsl(var(--muted-foreground))" 
                                            fontSize={10} 
                                            tickLine={false} 
                                            axisLine={false}
                                            ticks={[0, 5, 10, 15, 17]}
                                            label={{ value: 'Score', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                          />
                                          <Tooltip 
                                            contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '11px' }}
                                            formatter={(value: number) => [`${value}/17`, 'PUSH Score']}
                                          />
                                          {/* Shaded area for selected date range */}
                                          {hasDateRange && startDateFormatted && endDateFormatted && (
                                            <ReferenceArea
                                              x1={startDateFormatted}
                                              x2={endDateFormatted}
                                              fill="#f97316"
                                              fillOpacity={0.15}
                                              stroke="#f97316"
                                              strokeOpacity={0.3}
                                            />
                                          )}
                                          <Line 
                                            type="monotone" 
                                            dataKey="pushScore" 
                                            stroke="#f97316" 
                                            strokeWidth={2} 
                                            dot={{ r: 3, fill: "#f97316", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                                            activeDot={{ r: 5 }}
                                          />
                                          {/* Vertical reference line for selected date */}
                                          <ReferenceLine 
                                            x={selectedDateFormatted} 
                                            stroke="#8b5cf6" 
                                            strokeWidth={2}
                                            strokeDasharray="5 3"
                                          />
                                        </LineChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </div>
                                </div>
                              );})()}

                              {/* Change in Surface Area Over Time - Active disposition only */}
                              {isActiveDisposition && history.length > 1 && (() => {
                                const initialSurface = toNum(history[0]?.surface) || 1;
                                const visibility = getVisibility(woundKey);
                                
                                // Calculate chart data with change percentages
                                const chartData = history.map((e, i) => {
                                  const currentSurface = toNum(e.surface);
                                  const prevSurface = i > 0 ? (toNum(history[i - 1].surface) || 1) : currentSurface;
                                  const changeFromPrev = i > 0 ? ((currentSurface - prevSurface) / prevSurface) * 100 : 0;
                                  const changeFromInitial = ((currentSurface - initialSurface) / initialSurface) * 100;
                                  
                                  return {
                                    date: formatDate(e.dos),
                                    rawDate: e.dos,
                                    surface: currentSurface,
                                    changeFromPrev: changeFromPrev,
                                    changeFromInitial: changeFromInitial,
                                    healing: toNum(e.healing_percentage)
                                  };
                                });
                                
                                // Find selected date formatted for reference line
                                const selectedDateFormatted = formatDate(currentSelectedDate);
                                
                                // Format date range for shading (if range is selected)
                                const startDateFormatted = startDate ? formatDate(startDate) : null;
                                const endDateFormatted = endDate ? formatDate(endDate) : null;
                                
                                // Reverse for display (most recent first)
                                const chartDisplayData = [...chartData].reverse();
                                
                                return (
                                <div className="mt-4 pt-4 border-t">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-medium text-muted-foreground">
                                      Change in Surface Area Over Time
                                    </p>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant={visibility.surface ? "default" : "outline"}
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={(e) => { e.stopPropagation(); toggleLine(woundKey, 'surface'); }}
                                      >
                                        <span className={cn("w-2 h-2 rounded-full bg-primary mr-1", visibility.surface && "ring-1 ring-white")} />
                                        Surface
                                      </Button>
                                      <Button
                                        variant={visibility.prev ? "default" : "outline"}
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={(e) => { e.stopPropagation(); toggleLine(woundKey, 'prev'); }}
                                      >
                                        <span className={cn("w-2 h-2 rounded-full bg-orange-500 mr-1", visibility.prev && "ring-1 ring-white")} />
                                        Δ Prev
                                      </Button>
                                      <Button
                                        variant={visibility.change ? "default" : "outline"}
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={(e) => { e.stopPropagation(); toggleLine(woundKey, 'change'); }}
                                      >
                                        <span className={cn("w-2 h-2 rounded-full bg-red-500 mr-1", visibility.change && "ring-1 ring-white")} />
                                        Δ Initial
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-4">
                                    {/* Left column - Data list (clickable dates) */}
                                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                                      {chartDisplayData.map((enc, encIdx) => {
                                        const isFirst = encIdx === chartDisplayData.length - 1;
                                        const isSelected = enc.date === selectedDateFormatted;
                                        // Check if this date is within the selected date range
                                        const isInRange = hasDateRange && startDate && endDate && 
                                          enc.rawDate >= startDate && enc.rawDate <= endDate;
                                        return (
                                        <div 
                                          key={encIdx}
                                          onClick={(e) => { e.stopPropagation(); handleEncounterDateClick(woundKey, enc.rawDate); }}
                                          className={cn(
                                            "flex items-center justify-between p-2 rounded text-sm cursor-pointer transition-colors",
                                            isSelected 
                                              ? "bg-violet-100 dark:bg-violet-900/30 ring-2 ring-violet-500" 
                                              : isInRange
                                                ? "bg-violet-50 dark:bg-violet-900/10 border-l-2 border-violet-300"
                                                : "bg-muted/30 hover:bg-muted/50"
                                          )}
                                        >
                                          <div className="flex items-center gap-2">
                                            <CalendarIcon className={cn("h-3 w-3", isSelected ? "text-violet-600" : isInRange ? "text-violet-400" : "text-muted-foreground")} />
                                            <span className={cn("text-xs", isSelected ? "font-semibold text-violet-700 dark:text-violet-300" : isInRange ? "text-violet-600 dark:text-violet-400" : "")}>{enc.date}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-xs">
                                            <span className="text-muted-foreground">{enc.surface.toFixed(2)} cm²</span>
                                            {!isFirst && (
                                              <span className={enc.changeFromPrev < 0 ? "text-green-600" : enc.changeFromPrev > 0 ? "text-red-600" : "text-muted-foreground"}>
                                                {enc.changeFromPrev > 0 ? "+" : ""}{enc.changeFromPrev.toFixed(0)}%
                                              </span>
                                            )}
                                            <span className={enc.changeFromInitial < 0 ? "text-green-600" : enc.changeFromInitial > 0 ? "text-red-600" : "text-muted-foreground"}>
                                              ({enc.changeFromInitial > 0 ? "+" : ""}{enc.changeFromInitial.toFixed(0)}%)
                                            </span>
                                          </div>
                                        </div>
                                      );})}
                                    </div>
                                    {/* Right column - Line Chart */}
                                    <div className="h-[150px] w-full">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                          <XAxis 
                                            dataKey="date" 
                                            stroke="hsl(var(--muted-foreground))" 
                                            fontSize={9} 
                                            tickLine={false} 
                                            axisLine={false}
                                            angle={-45}
                                            textAnchor="end"
                                            height={45}
                                          />
                                          {visibility.surface && (
                                            <YAxis 
                                              yAxisId="left"
                                              domain={['auto', 'auto']}
                                              stroke="hsl(var(--muted-foreground))" 
                                              fontSize={9} 
                                              tickLine={false} 
                                              axisLine={false}
                                              tickFormatter={(value) => `${value}`}
                                              width={35}
                                              label={{ value: 'cm²', angle: -90, position: 'insideLeft', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                                            />
                                          )}
                                          {(visibility.prev || visibility.change) && (
                                            <YAxis 
                                              yAxisId="right"
                                              orientation="right"
                                              domain={['auto', 'auto']}
                                              stroke="hsl(var(--muted-foreground))" 
                                              fontSize={9} 
                                              tickLine={false} 
                                              axisLine={false}
                                              tickFormatter={(value) => `${value}%`}
                                              width={40}
                                            />
                                          )}
                                          <Tooltip 
                                            contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '11px' }}
                                            formatter={(value: number, name: string) => {
                                              if (name === 'surface') return [`${value.toFixed(2)} cm²`, 'Surface'];
                                              if (name === 'changeFromPrev') return [`${value > 0 ? '+' : ''}${value.toFixed(1)}%`, 'Δ Prev'];
                                              if (name === 'changeFromInitial') return [`${value > 0 ? '+' : ''}${value.toFixed(1)}%`, 'Δ Initial'];
                                              return [value, name];
                                            }}
                                          />
                                          {/* Shaded area for selected date range */}
                                          {hasDateRange && startDateFormatted && endDateFormatted && visibility.surface && (
                                            <ReferenceArea
                                              x1={startDateFormatted}
                                              x2={endDateFormatted}
                                              yAxisId="left"
                                              fill="#8b5cf6"
                                              fillOpacity={0.15}
                                              stroke="#8b5cf6"
                                              strokeOpacity={0.3}
                                            />
                                          )}
                                          {hasDateRange && startDateFormatted && endDateFormatted && !visibility.surface && (visibility.prev || visibility.change) && (
                                            <ReferenceArea
                                              x1={startDateFormatted}
                                              x2={endDateFormatted}
                                              yAxisId="right"
                                              fill="#8b5cf6"
                                              fillOpacity={0.15}
                                              stroke="#8b5cf6"
                                              strokeOpacity={0.3}
                                            />
                                          )}
                                          {visibility.surface && (
                                            <Line 
                                              yAxisId="left"
                                              type="monotone" 
                                              dataKey="surface" 
                                              stroke="hsl(var(--primary))" 
                                              strokeWidth={2} 
                                              dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                                              activeDot={{ r: 5 }}
                                            />
                                          )}
                                          {visibility.prev && (
                                            <Line 
                                              yAxisId="right"
                                              type="monotone" 
                                              dataKey="changeFromPrev" 
                                              stroke="#f97316" 
                                              strokeWidth={1.5} 
                                              strokeDasharray="2 2"
                                              dot={{ r: 2, fill: "#f97316" }}
                                            />
                                          )}
                                          {visibility.change && (
                                            <Line 
                                              yAxisId="right"
                                              type="monotone" 
                                              dataKey="changeFromInitial" 
                                              stroke="#ef4444" 
                                              strokeWidth={1.5} 
                                              strokeDasharray="4 2"
                                              dot={{ r: 2, fill: "#ef4444" }}
                                            />
                                          )}
                                          {/* Vertical reference line for selected date */}
                                          {visibility.surface && (
                                            <ReferenceLine 
                                              x={selectedDateFormatted} 
                                              yAxisId="left"
                                              stroke="#8b5cf6" 
                                              strokeWidth={2}
                                              strokeDasharray="5 3"
                                            />
                                          )}
                                          {!visibility.surface && (visibility.prev || visibility.change) && (
                                            <ReferenceLine 
                                              x={selectedDateFormatted} 
                                              yAxisId="right"
                                              stroke="#8b5cf6" 
                                              strokeWidth={2}
                                              strokeDasharray="5 3"
                                            />
                                          )}
                                        </LineChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </div>
                                </div>
                              );})()}
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
          setSelectedEncounterDate(prev => {
            const newState = { ...prev };
            delete newState[woundKey];
            return newState;
          });
        }
        onRefetch?.();
        setEditingWound(null);
      }}
    />
    </>
  );
}
