import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImportLog {
  id: number;
  import_id: string;
  import_date: string;
  imported_by: string | null;
  facility_id: number | null;
  facility_name: string | null;
  source_type: string;
  original_filename: string | null;
  file_size_bytes: number | null;
  records_found: number;
  records_validated: number;
  records_inserted: number;
  records_failed: number;
  records_duplicated: number;
  ai_provider: string | null;
  ai_processing_time_ms: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial' | 'reverted';
  started_at: string | null;
  completed_at: string | null;
  processing_duration_ms: number | null;
  error_message: string | null;
  patient_names: string[];
  bastion_request: string | null;
  bastion_response: string | null;
}

interface ImportStats {
  total_imports: number;
  total_records_imported: number;
  successful_imports: number;
  failed_imports: number;
  reverted_imports: number;
  avg_processing_time_ms: number | null;
  last_import_date: string | null;
}

const statusConfig = {
  completed: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800',
    label: 'Completed',
  },
  failed: {
    icon: XCircle,
    color: 'bg-red-100 text-red-800',
    label: 'Failed',
  },
  partial: {
    icon: AlertTriangle,
    color: 'bg-yellow-100 text-yellow-800',
    label: 'Partial',
  },
  pending: {
    icon: Clock,
    color: 'bg-gray-100 text-gray-800',
    label: 'Pending',
  },
  processing: {
    icon: RefreshCw,
    color: 'bg-blue-100 text-blue-800',
    label: 'Processing',
  },
  reverted: {
    icon: RotateCcw,
    color: 'bg-purple-100 text-purple-800',
    label: 'Reverted',
  },
};

const sourceTypeIcons: Record<string, React.ElementType> = {
  PDF: FileText,
  Excel: FileSpreadsheet,
  CSV: FileSpreadsheet,
  Word: FileText,
};

export default function ImportAudit() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selectedImport, setSelectedImport] = useState<ImportLog | null>(null);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [importToRevert, setImportToRevert] = useState<ImportLog | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        `/api/import-audit?${params.toString()}`
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
        `/api/import-audit?action=stats`
      );
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  // Revert import mutation
  const revertMutation = useMutation({
    mutationFn: async (importId: string) => {
      const response = await fetch(
        `/api/import-audit?import_id=${importId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revert import');
      }
      return response.json();
    },
    onSuccess: (data) => {
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
    },
    onError: (error: Error) => {
      toast({
        title: 'Revert Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const logs: ImportLog[] = logsResponse?.data || [];
  const stats: ImportStats | null = statsResponse?.data || null;

  const toggleRowExpanded = (importId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(importId)) {
      newExpanded.delete(importId);
    } else {
      newExpanded.add(importId);
    }
    setExpandedRows(newExpanded);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateStr;
    }
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Imports</p>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? '-' : stats?.total_imports || 0}
                </p>
              </div>
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Records Imported</p>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? '-' : stats?.total_records_imported || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed Imports</p>
                <p className="text-2xl font-bold text-red-600">
                  {isLoadingStats ? '-' : stats?.failed_imports || 0}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reverted</p>
                <p className="text-2xl font-bold text-purple-600">
                  {isLoadingStats ? '-' : stats?.reverted_imports || 0}
                </p>
              </div>
              <RotateCcw className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

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
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="reverted">Reverted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Source:</span>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
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
              onClick={() => refetchLogs()}
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Logs Table */}
          {isLoadingLogs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading import history...
            </div>
          ) : logsError ? (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to load import history. Please try again.
              </AlertDescription>
            </Alert>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No imports found</p>
              <p className="text-sm">
                Import data from PDF, Excel, or CSV files to see them here.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead className="text-center">Records</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {logs.map((log) => {
                      const StatusIcon = statusConfig[log.status]?.icon || AlertTriangle;
                      const statusColor = statusConfig[log.status]?.color || 'bg-gray-100';
                      const SourceIcon = sourceTypeIcons[log.source_type] || FileSpreadsheet;
                      const isExpanded = expandedRows.has(log.import_id);

                      return (
                        <React.Fragment key={log.import_id}>
                          <TableRow
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleRowExpanded(log.import_id)}
                          >
                            <TableCell>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {formatDate(log.import_date)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <SourceIcon className="h-4 w-4 text-muted-foreground" />
                                <span
                                  className="max-w-[200px] truncate"
                                  title={log.original_filename || undefined}
                                >
                                  {log.original_filename || '-'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                {log.facility_name || 'Auto-detected'}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-green-600 font-medium">
                                  {log.records_inserted}
                                </span>
                                {log.records_failed > 0 && (
                                  <span className="text-red-600">
                                    / {log.records_failed} failed
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={statusColor}
                              >
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig[log.status]?.label || log.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDuration(log.processing_duration_ms)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRevertClick(log);
                                }}
                                disabled={
                                  log.status === 'reverted' ||
                                  log.records_inserted === 0
                                }
                                className="text-destructive hover:text-destructive"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Expanded Details Row */}
                          {isExpanded && (
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={8}>
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="py-4 px-4"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">
                                        Import ID
                                      </p>
                                      <p className="font-mono text-xs">
                                        {log.import_id}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">
                                        Imported By
                                      </p>
                                      <p className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {log.imported_by || 'System'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">
                                        File Size
                                      </p>
                                      <p>{formatFileSize(log.file_size_bytes)}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">
                                        Records Found
                                      </p>
                                      <p>{log.records_found}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">
                                        Validated
                                      </p>
                                      <p>{log.records_validated}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">
                                        Duplicates Skipped
                                      </p>
                                      <p>{log.records_duplicated}</p>
                                    </div>
                                    {log.ai_provider && (
                                      <>
                                        <div>
                                          <p className="text-muted-foreground">
                                            AI Provider
                                          </p>
                                          <p>{log.ai_provider}</p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground">
                                            AI Processing Time
                                          </p>
                                          <p>
                                            {formatDuration(log.ai_processing_time_ms)}
                                          </p>
                                        </div>
                                      </>
                                    )}
                                    {log.error_message && (
                                      <div className="col-span-3">
                                        <p className="text-muted-foreground">
                                          Error/Notes
                                        </p>
                                        <p className="text-red-600 text-xs bg-red-50 p-2 rounded mt-1">
                                          {log.error_message}
                                        </p>
                                      </div>
                                    )}
                                    {log.patient_names && log.patient_names.length > 0 && (
                                      <div>
                                        <p className="text-muted-foreground">
                                          Patients ({log.patient_names.length})
                                        </p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {log.patient_names.map((name, idx) => (
                                            <Badge key={idx} variant="secondary" className="text-xs">
                                              <User className="h-3 w-3 mr-1" />
                                              {name}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {log.bastion_request && (
                                      <div className="col-span-3 mt-3">
                                        <details className="group">
                                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1">
                                            <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
                                            Bastion Request (Text sent to AI)
                                          </summary>
                                          <pre className="mt-2 p-3 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                                            {log.bastion_request}
                                          </pre>
                                        </details>
                                      </div>
                                    )}
                                    {log.bastion_response && (
                                      <div className="col-span-3 mt-3">
                                        <details className="group">
                                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1">
                                            <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
                                            Bastion Response (AI Output)
                                          </summary>
                                          <pre className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                                            {log.bastion_response}
                                          </pre>
                                        </details>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
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
