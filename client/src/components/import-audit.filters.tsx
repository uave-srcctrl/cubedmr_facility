/**
 * Import Audit — status/source filters + refresh.
 * Extracted from import-audit.tsx (LIMP-4 decomposition) without behavior change.
 */
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function ImportFilters({
  statusFilter,
  onStatusChange,
  sourceFilter,
  onSourceChange,
  onRefresh,
}: {
  statusFilter: string;
  onStatusChange: (v: string) => void;
  sourceFilter: string;
  onSourceChange: (v: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="reverted">Reverted</SelectItem>
            <SelectItem value="duplicated">Duplicated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Source:</span>
        <Select value={sourceFilter} onValueChange={onSourceChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="PDF">PDF</SelectItem>
            <SelectItem value="Excel">Excel</SelectItem>
            <SelectItem value="CSV">CSV</SelectItem>
            <SelectItem value="Word">Word</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        className="ml-auto"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
    </div>
  );
}
