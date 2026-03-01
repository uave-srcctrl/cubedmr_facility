/**
 * Shared components for wound display
 * Used across modal components to ensure consistency and reduce duplication
 */
import { TrendingUp, TrendingDown, Minus, Ruler, Activity, Droplet, Layers, Pill, Scissors, Zap, User, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  toNum,
  getHealingColor,
  getHealingBackground,
  getProgressBackground,
  getProgressIconType,
  type ProgressIconType,
} from "@/lib/wound-utils";

// ============================================================================
// Progress Icon Component
// ============================================================================

interface ProgressIconProps {
  progress: string;
  className?: string;
}

/**
 * Displays appropriate trending icon based on wound progress status
 */
export function ProgressIcon({ progress, className }: ProgressIconProps) {
  const iconType = getProgressIconType(progress);
  
  switch (iconType) {
    case 'improving':
      return <TrendingUp className={cn("h-4 w-4 text-green-600 mt-0.5", className)} />;
    case 'deteriorating':
      return <TrendingDown className={cn("h-4 w-4 text-red-600 mt-0.5", className)} />;
    default:
      return <Minus className={cn("h-4 w-4 text-gray-500 mt-0.5", className)} />;
  }
}

// ============================================================================
// PUSH Score Bar Component
// ============================================================================

interface PushScoreBarProps {
  pushScore: number | string | null;
  className?: string;
}

/**
 * Displays a PUSH score with progress bar (for single-encounter display)
 * Use PushScoreChart component when there are multiple encounters
 */
export function PushScoreBar({ pushScore, className }: PushScoreBarProps) {
  const score = toNum(pushScore);
  
  return (
    <div className={cn("mt-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 p-3 rounded-md", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-600" />
          <span className="font-medium text-sm">PUSH Score</span>
        </div>
        <span className="text-lg font-bold text-orange-700 dark:text-orange-400">
          {score}/17
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
        <div
          className="bg-orange-600 h-2 rounded-full transition-all"
          style={{ width: `${(score / 17) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Wound Metrics Grid Component
// ============================================================================

interface WoundMetrics {
  width: number | string | null;
  height: number | string | null;
  depth: number | string | null;
  surface: number | string | null;
  exudate: string | null;
  tissue: string | null;
  healing_percentage: number | string | null;
  days: number | string | null;
}

interface WoundMetricsGridProps {
  data: WoundMetrics;
  className?: string;
}

/**
 * Displays wound metrics (dimensions, healing, exudate, tissue) in a 2x2 or 4-column grid
 */
export function WoundMetricsGrid({ data, className }: WoundMetricsGridProps) {
  const healingStyle = getHealingBackground(toNum(data.healing_percentage));
  
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)}>
      {/* Dimensions */}
      <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800">
        <Ruler className="h-4 w-4 text-blue-600 mt-0.5" />
        <div>
          <p className="text-xs text-blue-600 dark:text-blue-400">Dimensions</p>
          <p className="font-medium text-sm">
            {toNum(data.width)} × {toNum(data.height)} × {toNum(data.depth)} cm
          </p>
          <p className="text-xs text-muted-foreground">
            Surface: {toNum(data.surface).toFixed(2)} cm²
          </p>
        </div>
      </div>

      {/* Healing */}
      <div className={cn("flex items-start gap-2 p-2.5 rounded-lg border", healingStyle.bg, healingStyle.border)}>
        <Activity className={cn("h-4 w-4 mt-0.5", healingStyle.icon)} />
        <div>
          <p className={cn("text-xs", healingStyle.label)}>Healing</p>
          <p className={cn("font-medium text-sm", getHealingColor(toNum(data.healing_percentage)))}>
            {toNum(data.healing_percentage).toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">
            {toNum(data.days) || 0} days
          </p>
        </div>
      </div>

      {/* Exudate */}
      <div className="flex items-start gap-2 bg-violet-50 dark:bg-violet-950/30 p-2.5 rounded-lg border border-violet-200 dark:border-violet-800">
        <Droplet className="h-4 w-4 text-violet-600 mt-0.5" />
        <div>
          <p className="text-xs text-violet-600 dark:text-violet-400">Exudate</p>
          <p className="font-medium text-sm">{!data.exudate || data.exudate === 'None' ? "--" : data.exudate}</p>
        </div>
      </div>

      {/* Tissue */}
      <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
        <Layers className="h-4 w-4 text-amber-600 mt-0.5" />
        <div>
          <p className="text-xs text-amber-600 dark:text-amber-400">Tissue</p>
          <p className="font-medium text-sm">{data.tissue || "--"}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Wound Status Row Component
// ============================================================================

interface WoundStatus {
  progress: string | null;
  treatment: string | null;
  debridement: string | null;
  healing_percentage: number | string | null;
}

interface WoundStatusRowProps {
  data: WoundStatus;
  className?: string;
}

/**
 * Displays wound status (progress, treatment, debridement) in a 3-column row
 */
export function WoundStatusRow({ data, className }: WoundStatusRowProps) {
  const progressStyle = getProgressBackground(data.progress || "");
  const healingStyle = getHealingBackground(toNum(data.healing_percentage));
  const hasDebridement = data.debridement === 'YES' || data.debridement === 'Yes';
  
  return (
    <div className={cn("mt-4 grid grid-cols-3 gap-3", className)}>
      <div className={cn("flex items-start gap-2 p-2.5 rounded-lg border", progressStyle.bg, progressStyle.border)}>
        <ProgressIcon progress={data.progress || ""} />
        <div>
          <p className={cn("text-xs", progressStyle.label)}>Progress</p>
          <p className="font-medium text-sm">{data.progress || "N/A"}</p>
        </div>
      </div>
      <div className={cn("flex items-start gap-2 p-2.5 rounded-lg border", healingStyle.bg, healingStyle.border)}>
        <Pill className={cn("h-4 w-4 mt-0.5", healingStyle.icon)} />
        <div>
          <p className={cn("text-xs", healingStyle.label)}>Treatment</p>
          <p className="font-medium text-sm">{data.treatment || "--"}</p>
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
}

// ============================================================================
// Combined Wound Info Component
// ============================================================================

interface WoundDisplayData extends WoundMetrics, WoundStatus {}

interface WoundInfoGridProps {
  data: WoundDisplayData;
  className?: string;
}

/**
 * Combined component displaying wound metrics and status
 * Use when you need both WoundMetricsGrid and WoundStatusRow together
 */
export function WoundInfoGrid({ data, className }: WoundInfoGridProps) {
  return (
    <div className={className}>
      <WoundMetricsGrid data={data} />
      <WoundStatusRow data={data} />
    </div>
  );
}

// ============================================================================
// Patient Header Card Component
// ============================================================================

interface PatientHeaderCardProps {
  patientName: string;
  patientId: string;
  woundCount?: number;
  countLabel?: string; // e.g., "wound", "report", "encounter"
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  showChevron?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Displays a patient header with name, ID, count badge, and optional chevron
 */
export function PatientHeaderCard({
  patientName,
  patientId,
  woundCount,
  countLabel = "wound",
  badgeVariant = "destructive",
  showChevron = true,
  onClick,
  className,
}: PatientHeaderCardProps) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">
            {patientName || "Unknown Patient"}
          </h3>
          <p className="text-xs text-muted-foreground font-mono">
            ID: {patientId}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {woundCount !== undefined && (
          <Badge variant={badgeVariant}>
            {woundCount} {countLabel}{woundCount !== 1 ? "s" : ""}
          </Badge>
        )}
        {showChevron && onClick && (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
