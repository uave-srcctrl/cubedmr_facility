import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LOCAL_API } from '@/lib/api-config';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Building,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { dispatchAuthEvent, AUTH_EVENTS } from '@/lib/auth-events';
import { logger } from "@/lib/logger";

import type { ImportLog, ImportStats, SortColumn, SortDirection } from './import-audit.types';
import { statusConfig, sourceTypeIcons } from './import-audit.types';
import { formatFileSize, formatDuration, formatDate } from './import-audit.utils';
import { ImportStatsCards } from './import-audit.stats-cards';
import { ImportFilters } from './import-audit.filters';
import { ImportLogTable } from './import-audit.log-table';

export default function ImportAudit() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selectedImport, setSelectedImport] = useState<ImportLog | null>(null);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [importToRevert, setImportToRevert] = useState<ImportLog | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn>('import_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getFacilities, getSelectedFacility, getAvailableFacilities } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch import logs
  const {
    data: logsResponse,
    isLoading: isLoadingLogs,
    refetch: refetchLogs,
    error: logsError,
  } = useQuery({
    queryKey: ['import-logs', statusFilter, sourceFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (sourceFilter !== 'all') params.append('source_type', sourceFilter);
      params.append('limit', '100');

      const response = await fetch(
        `${LOCAL_API.IMPORT_AUDIT}?${params.toString()}`
      );
      if (!response.ok) throw new Error('Failed to fetch import logs');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch import stats
  const { data: statsResponse, isLoading: isLoadingStats } = useQuery({
    queryKey: ['import-stats'],
    queryFn: async () => {
      const response = await fetch(
        `${LOCAL_API.IMPORT_AUDIT}?action=stats`
      );
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  // Revert import mutation
  const revertMutation = useMutation({
    mutationFn: async (importId: string) => {
      logger.debug('[ImportAudit] Attempting to revert import:', importId);
      const response = await fetch(
        `${LOCAL_API.IMPORT_AUDIT}?import_id=${importId}`,
        { method: 'DELETE' }
      );
      logger.debug('[ImportAudit] Revert response status:', response.status);
      if (!response.ok) {
        const error = await response.json();
        logger.error('[ImportAudit] Revert HTTP error:', error);
        throw new Error(error.error || 'Failed to revert import');
      }
      const data = await response.json();
      logger.debug('[ImportAudit] Revert response data:', data);
      // Also check for success: false in response body
      if (data.success === false) {
        logger.error('[ImportAudit] Revert returned success=false:', data);
        throw new Error(data.error || 'Failed to revert import');
      }
      return data;
    },
    onSuccess: async (data) => {
      toast({
        title: 'Import Reverted',
        description: data.message || 'The import has been successfully reverted.',
      });
      queryClient.invalidateQueries({ queryKey: ['import-logs'] });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
      // Also refresh enabled dates since reverted data affects available dates
      queryClient.invalidateQueries({ queryKey: ['enabledDates'] });
      queryClient.invalidateQueries({ queryKey: ['facilityPatientsByDate'] });
      queryClient.invalidateQueries({ queryKey: ['facilityPatients'] });
      setShowRevertDialog(false);
      setImportToRevert(null);

      // Refresh facilities to update total_wound_encounters count
      try {
        await getFacilities();
        // Dispatch event so all pages refresh their data
        dispatchAuthEvent(AUTH_EVENTS.DATA_IMPORTED);

        // Check if current facility has no more data
        const selectedFacilityId = getSelectedFacility();
        const facilities = getAvailableFacilities();
        const currentFacility = facilities.find(f => String(f.id) === String(selectedFacilityId));
        const totalEncounters = currentFacility?.total_wound_encounters ?? currentFacility?.totalWoundEncounters ?? 0;

        if (totalEncounters === 0) {
          // Navigate to dashboard which will show No Data Available
          setLocation('/facility/');
        }
      } catch (err) {
        logger.error('[ImportAudit] Failed to refresh facilities:', err);
      }
    },
    onError: (error: Error) => {
      logger.error('[ImportAudit] Revert mutation error:', error);
      toast({
        title: 'Revert Failed',
        description: error.message,
        variant: 'destructive',
      });
      // Close dialog on error too
      setShowRevertDialog(false);
      setImportToRevert(null);
    },
  });

  const logs: ImportLog[] = logsResponse?.data || [];
  const stats: ImportStats | null = statsResponse?.data || null;

  // Sort logs based on current sort column and direction
  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;

      switch (sortColumn) {
        case 'import_date':
          return multiplier * (new Date(a.import_date).getTime() - new Date(b.import_date).getTime());
        case 'original_filename':
          return multiplier * ((a.original_filename || '').localeCompare(b.original_filename || ''));
        case 'facility_name':
          return multiplier * ((a.facility_name || '').localeCompare(b.facility_name || ''));
        case 'records_inserted':
          return multiplier * (a.records_inserted - b.records_inserted);
        case 'imported_by':
          return multiplier * ((a.imported_by || '').localeCompare(b.imported_by || ''));
        case 'status':
          return multiplier * a.status.localeCompare(b.status);
        case 'processing_duration_ms':
          return multiplier * ((a.processing_duration_ms || 0) - (b.processing_duration_ms || 0));
        default:
          return 0;
      }
    });
  }, [logs, sortColumn, sortDirection]);

  // Handle column header click for sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending for date, ascending for others
      setSortColumn(column);
      setSortDirection(column === 'import_date' ? 'desc' : 'asc');
    }
  };

  // Get sort icon for column header
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const toggleRowExpanded = (importId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(importId)) {
      newExpanded.delete(importId);
    } else {
      newExpanded.add(importId);
    }
    setExpandedRows(newExpanded);
  };

  const handleRevertClick = (log: ImportLog) => {
    if (log.status === 'reverted') {
      toast({
        title: 'Already Reverted',
        description: 'This import has already been reverted.',
        variant: 'destructive',
      });
      return;
    }
    setImportToRevert(log);
    setShowRevertDialog(true);
  };

  const confirmRevert = () => {
    if (importToRevert) {
      revertMutation.mutate(importToRevert.import_id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <ImportStatsCards stats={stats} isLoading={isLoadingStats} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import History
          </CardTitle>
          <CardDescription>
            View and manage all data import operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportFilters
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            sourceFilter={sourceFilter}
            onSourceChange={setSourceFilter}
            onRefresh={() => refetchLogs()}
          />

          <ImportLogTable
            isLoadingLogs={isLoadingLogs}
            logsError={logsError}
            logs={logs}
            sortedLogs={sortedLogs}
            handleSort={handleSort}
            getSortIcon={getSortIcon}
            expandedRows={expandedRows}
            toggleRowExpanded={toggleRowExpanded}
            handleRevertClick={handleRevertClick}
          />
        </CardContent>
      </Card>

      {/* Revert Confirmation Dialog */}
      <Dialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Revert Import
            </DialogTitle>
            <DialogDescription className="space-y-2" asChild>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  You are about to revert the import of{' '}
                  <strong>{importToRevert?.original_filename}</strong>.
                </p>
                <p>
                  This will permanently delete{' '}
                  <strong className="text-destructive">
                    {importToRevert?.records_inserted} records
                  </strong>{' '}
                  from the database.
                </p>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRevertDialog(false)}
              disabled={revertMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRevert}
              disabled={revertMutation.isPending}
            >
              {revertMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reverting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Revert Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
