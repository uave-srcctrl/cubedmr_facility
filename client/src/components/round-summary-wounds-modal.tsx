import { useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  TrendingDown,
  TrendingUp,
  Minus,
  MapPin,
  User,
  Ruler,
  Droplet,
  Layers,
  Pill,
  Activity,
  Pencil,
  Scissors,
  ChevronRight,
  Zap,
  Calendar as CalendarIcon,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from "recharts";
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
import { cn, getEtiologyColor, normalizeEtiology } from "@/lib/utils";

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

  // Helper to convert numbers safely
  const toNum = (val: unknown): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || 0;
    return 0;
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

  const getProgressBackground = (progress: string) => {
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
  };

  const getProgressIcon = (progress: string) => {
    if (progress?.toLowerCase().includes("improv") || progress?.toLowerCase().includes("heal")) {
      return <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />;
    }
    if (progress?.toLowerCase().includes("worse") || progress?.toLowerCase().includes("declin") || progress?.toLowerCase().includes("deterior")) {
      return <TrendingDown className="h-4 w-4 text-red-600 mt-0.5" />;
    }
    return <Minus className="h-4 w-4 text-gray-500 mt-0.5" />;
  };

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
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {patient.patientName || "Unknown Patient"}
                        </h3>
                        <p className="text-xs text-muted-foreground font-mono">
                          ID: {patient.patientId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isChronicType ? "secondary" : "destructive"}>
                        {patient.wounds.length} wound{patient.wounds.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </div>

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
                                  {getProgressIcon(displayData.progress)}
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
                              {isPressureUlcer && history.length > 1 && (() => {
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
                                    date: formatDateDisplay(e.dos),
                                    rawDate: e.dos,
                                    pushScore: currentPush,
                                    changeFromPrev,
                                    changeFromInitial,
                                    id: e.id
                                  };
                                });
                                
                                const selectedDateFormatted = formatDateDisplay(currentSelectedDate);
                                const startDateFormatted = startDate ? formatDateDisplay(startDate) : null;
                                const endDateFormatted = endDate ? formatDateDisplay(endDate) : null;
                                const displayPushData = [...pushChartData].reverse();
                                
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
                                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                                      {displayPushData.map((enc, encIdx) => {
                                        const isFirst = encIdx === displayPushData.length - 1;
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
                                    <div className="h-[150px] w-full">
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

                              {/* Change in Surface Area Over Time Chart */}
                              {history.length > 1 && (() => {
                                const initialSurface = toNum(history[0]?.surface) || 1;
                                const visibility = getVisibility(woundKey);
                                
                                // Calculate chart data with change percentages
                                const chartData = history.map((e, i) => {
                                  const currentSurface = toNum(e.surface);
                                  const prevSurface = i > 0 ? (toNum(history[i - 1].surface) || 1) : currentSurface;
                                  const changeFromPrev = i > 0 ? ((currentSurface - prevSurface) / prevSurface) * 100 : 0;
                                  const changeFromInitial = ((currentSurface - initialSurface) / initialSurface) * 100;
                                  
                                  return {
                                    date: formatDateDisplay(e.dos),
                                    rawDate: e.dos,
                                    surface: currentSurface,
                                    changeFromPrev: changeFromPrev,
                                    changeFromInitial: changeFromInitial,
                                    healing: toNum(e.healing_percentage)
                                  };
                                });
                                
                                // Find selected date formatted for reference line
                                const selectedDateFormatted = formatDateDisplay(currentSelectedDate);
                                
                                // Format dates for ReferenceArea (date range shading)
                                const startDateFormatted = startDate ? formatDateDisplay(startDate) : null;
                                const endDateFormatted = endDate ? formatDateDisplay(endDate) : null;
                                
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
                                        const isInRange = hasDateRange && startDate && endDate && enc.rawDate >= startDate && enc.rawDate <= endDate;
                                        return (
                                        <div 
                                          key={encIdx}
                                          onClick={(e) => { e.stopPropagation(); handleEncounterDateClick(woundKey, enc.rawDate); }}
                                          className={cn(
                                            "flex items-center justify-between p-2 rounded text-sm cursor-pointer transition-colors",
                                            isSelected 
                                              ? "bg-violet-100 dark:bg-violet-900/30 ring-2 ring-violet-500" 
                                              : isInRange
                                                ? "bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800"
                                                : "bg-muted/30 hover:bg-muted/50"
                                          )}
                                        >
                                          <div className="flex items-center gap-2">
                                            <CalendarIcon className={cn("h-3 w-3", isSelected ? "text-violet-600" : isInRange ? "text-violet-500" : "text-muted-foreground")} />
                                            <span className={cn("text-xs", isSelected && "font-semibold text-violet-700 dark:text-violet-300", isInRange && !isSelected && "text-violet-600 dark:text-violet-400")}>{enc.date}</span>
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
                                          {/* Date range shading */}
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
                                        </LineChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </div>
                                </div>
                              );})()}
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
