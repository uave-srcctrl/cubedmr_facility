import { Database, Cloud, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type DataSource = "backend" | "mock" | "unknown" | "backend-partial" | "no-data";

interface DataSourceBadgeProps {
  source: DataSource;
  className?: string;
  showLabel?: boolean;
}

const sourceConfig: Record<DataSource, { label: string; color: string; icon: React.ReactNode }> = {
  backend: {
    label: "Backend",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <Cloud className="w-3 h-3" />,
  },
  "backend-partial": {
    label: "Backend (Partial)",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <Cloud className="w-3 h-3" />,
  },
  mock: {
    label: "Mock Data",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <Database className="w-3 h-3" />,
  },
  "no-data": {
    label: "No Data",
    color: "bg-gray-50 text-gray-700 border-gray-200",
    icon: <AlertCircle className="w-3 h-3" />,
  },
  unknown: {
    label: "Unknown",
    color: "bg-gray-50 text-gray-700 border-gray-200",
    icon: <AlertCircle className="w-3 h-3" />,
  },
};

export function DataSourceBadge({ 
  source, 
  className,
  showLabel = true 
}: DataSourceBadgeProps) {
  const config = sourceConfig[source] || sourceConfig.unknown;
  
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium",
        config.color,
        className
      )}
      title={`Data source: ${config.label}`}
    >
      {config.icon}
      {showLabel && config.label}
    </div>
  );
}
