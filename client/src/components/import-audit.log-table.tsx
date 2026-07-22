/**
 * Import Audit - logs table with sortable headers and an expandable detail row.
 * Extracted from import-audit.tsx (LIMP-4 decomposition) without behavior change.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Loader2,
  FileSpreadsheet,
  ChevronUp,
  ChevronDown,
  Calendar,
  Building,
  User,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { statusConfig, sourceTypeIcons } from './import-audit.types';
import type { ImportLog, SortColumn } from './import-audit.types';
import { formatDate, formatDuration, formatFileSize } from './import-audit.utils';

export function ImportLogTable({
  isLoadingLogs,
  logsError,
  logs,
  sortedLogs,
  handleSort,
  getSortIcon,
  expandedRows,
  toggleRowExpanded,
  handleRevertClick,
}: {
  isLoadingLogs: boolean;
  logsError: unknown;
  logs: ImportLog[];
  sortedLogs: ImportLog[];
  handleSort: (column: SortColumn) => void;
  getSortIcon: (column: SortColumn) => React.ReactNode;
  expandedRows: Set<string>;
  toggleRowExpanded: (importId: string) => void;
  handleRevertClick: (log: ImportLog) => void;
}) {
  return (
    <>
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
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('import_date')}
                    >
                      <div className="flex items-center">
                        Date
                        {getSortIcon('import_date')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('original_filename')}
                    >
                      <div className="flex items-center">
                        File
                        {getSortIcon('original_filename')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('facility_name')}
                    >
                      <div className="flex items-center">
                        Facility
                        {getSortIcon('facility_name')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('imported_by')}
                    >
                      <div className="flex items-center">
                        Imported By
                        {getSortIcon('imported_by')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-center cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('records_inserted')}
                    >
                      <div className="flex items-center justify-center">
                        Records
                        {getSortIcon('records_inserted')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        {getSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort('processing_duration_ms')}
                    >
                      <div className="flex items-center">
                        Duration
                        {getSortIcon('processing_duration_ms')}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {sortedLogs.map((log) => {
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
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="max-w-[150px] truncate" title={log.imported_by || undefined}>
                                  {log.imported_by || 'System'}
                                </span>
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
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  logger.debug('[ImportAudit] Revert button clicked for:', log.import_id, 'records_inserted:', log.records_inserted, 'type:', typeof log.records_inserted);
                                  handleRevertClick(log);
                                }}
                                disabled={
                                  log.status === 'reverted' ||
                                  Number(log.records_inserted) === 0
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
                              <TableCell colSpan={9}>
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
    </>
  );
}
