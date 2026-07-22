/**
 * Import Audit — summary stat cards.
 * Extracted from import-audit.tsx (LIMP-4 decomposition) without behavior change.
 */
import { Card, CardContent } from '@/components/ui/card';
import { FileSpreadsheet, CheckCircle, XCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import type { ImportStats } from './import-audit.types';

export function ImportStatsCards({ stats, isLoading }: { stats: ImportStats | null; isLoading: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Imports</p>
              <p className="text-2xl font-bold">
                {isLoading ? '-' : stats?.total_imports || 0}
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
                {isLoading ? '-' : stats?.total_records_imported || 0}
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
                {isLoading ? '-' : stats?.failed_imports || 0}
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
                {isLoading ? '-' : stats?.reverted_imports || 0}
              </p>
            </div>
            <RotateCcw className="h-8 w-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Duplicated</p>
              <p className="text-2xl font-bold text-orange-600">
                {isLoading ? '-' : stats?.duplicated_imports || 0}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
