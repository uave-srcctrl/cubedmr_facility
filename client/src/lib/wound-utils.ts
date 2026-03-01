/**
 * Shared utility functions for wound-related components
 * Extracted to avoid code duplication across modal components
 */

/**
 * Safely parse unknown values to numbers
 */
export const toNum = (val: unknown): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  return 0;
};

/**
 * Get text color class based on healing percentage
 */
export const getHealingColor = (percentage: number): string => {
  if (percentage >= 75) return "text-green-600";
  if (percentage >= 50) return "text-emerald-600";
  if (percentage >= 25) return "text-yellow-600";
  return "text-orange-600";
};

export interface StatusStyle {
  bg: string;
  border: string;
  icon: string;
  label: string;
}

/**
 * Get background/border styles based on healing percentage
 */
export const getHealingBackground = (healingPercentage: number): StatusStyle => {
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
};

/**
 * Get background/border styles based on progress status text
 */
export const getProgressBackground = (progress: string): StatusStyle => {
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

/**
 * Get wound card background and border classes based on progress status
 * Returns a combined class string for direct use in className
 * @param progress - The progress status text (e.g., "Improving", "Deteriorating")
 * @param disposition - Optional disposition status to check first (for resolved/healed wounds)
 */
export const getWoundCardBackground = (progress: string, disposition?: string): string => {
  const p = progress?.toLowerCase() || "";
  const d = disposition?.toLowerCase() || "";
  
  // Check disposition first for resolved/healed (if provided)
  if (d.includes("resolved") || d.includes("healed") || d.includes("closed")) {
    return "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800";
  }
  
  // Resolved/Healed/Closed in progress
  if (p.includes("resolved") || p.includes("healed") || p.includes("closed")) {
    return "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800";
  }
  // Improving - light blue/teal background
  if (p.includes("improv")) {
    return "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800";
  }
  // Deteriorating/Worsening - light red background
  if (p.includes("worse") || p.includes("declin") || p.includes("deterior")) {
    return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
  }
  // Default - neutral
  return "bg-muted/30";
};

/**
 * Check if progress indicates improving/healing
 */
export const isProgressPositive = (progress: string): boolean => {
  const p = progress?.toLowerCase() || "";
  return p.includes("improv") || p.includes("heal") || p.includes("resolved") || p.includes("closed");
};

/**
 * Check if progress indicates worsening/deteriorating
 */
export const isProgressNegative = (progress: string): boolean => {
  const p = progress?.toLowerCase() || "";
  return p.includes("worse") || p.includes("declin") || p.includes("deterior");
};

/**
 * Chart line visibility state type
 */
export interface ChartLineVisibility {
  surface: boolean;
  prev: boolean;
  change: boolean;
}

/**
 * Default chart visibility settings
 */
export const defaultChartVisibility: ChartLineVisibility = {
  surface: true,
  prev: true,
  change: true
};

/**
 * Format date string (YYYY-MM-DD) to display format (e.g., "Jan 15, 2024")
 */
export const formatDateDisplay = (dateString: string): string => {
  try {
    // Parse YYYY-MM-DD format correctly in local timezone
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

/**
 * Progress icon types based on wound progress status
 */
export type ProgressIconType = 'improving' | 'deteriorating' | 'stable';

/**
 * Get the icon type based on progress status
 */
export const getProgressIconType = (progress: string): ProgressIconType => {
  const p = progress?.toLowerCase() || "";
  if (p.includes("improv") || p.includes("heal")) {
    return 'improving';
  }
  if (p.includes("worse") || p.includes("declin") || p.includes("deterior")) {
    return 'deteriorating';
  }
  return 'stable';
};
