import {
  FileText,
  Calendar,
  MapPin,
  Activity,
  User,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EcgLoader } from "@/components/ecg-loader";
import { cn, getEtiologyColor, normalizeEtiology } from "@/lib/utils";
import { formatDateDisplay } from "@/lib/wound-utils";
import { PatientHeaderCard } from "@/components/wound-display";
import { ReportPatient } from "@/hooks/use-patients";

interface ReportsGeneratedModalProps {
  reportPatients: ReportPatient[];
  totalEncounters: number;
  totalPatients: number;
  isLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientClick?: (patientId: string, patientName: string) => void;
  dateRange?: { start: string; end: string };
}

export function ReportsGeneratedModal({
  reportPatients,
  totalEncounters,
  totalPatients,
  isLoading,
  open,
  onOpenChange,
  onPatientClick,
  dateRange,
}: ReportsGeneratedModalProps) {

  const getProgressColor = (progress: string) => {
    const p = progress?.toLowerCase() || '';
    if (p.includes('improv')) return 'bg-green-100 text-green-800';
    if (p.includes('stable')) return 'bg-blue-100 text-blue-800';
    if (p.includes('deteriorat') || p.includes('worsen')) return 'bg-red-100 text-red-800';
    if (p.includes('resolv')) return 'bg-purple-100 text-purple-800';
    if (p.includes('new')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  // getEtiologyColor imported from @/lib/utils

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-chart-3/20 rounded-full">
              <FileText className="h-6 w-6 text-chart-3" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">
                Reports Generated
              </DialogTitle>
              <DialogDescription className="mt-1">
                {dateRange ? (
                  <>Wound encounters from {formatDateDisplay(dateRange.start)} to {formatDateDisplay(dateRange.end)}</>
                ) : (
                  <>All wound encounter reports</>
                )}
              </DialogDescription>
            </div>
          </div>
          {!isLoading && (
            <div className="flex gap-4 mt-4">
              <Badge variant="outline" className="text-sm px-3 py-1">
                <User className="h-3 w-3 mr-1" />
                {totalPatients} Patient{totalPatients !== 1 ? "s" : ""}
              </Badge>
              <Badge className="text-sm px-3 py-1 bg-chart-3 hover:bg-chart-3">
                <FileText className="h-3 w-3 mr-1" />
                {totalEncounters} Report{totalEncounters !== 1 ? "s" : ""}
              </Badge>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {isLoading ? (
            <EcgLoader title="Loading reports..." minHeight="min-h-[200px]" />
          ) : reportPatients.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-3 bg-muted rounded-full mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-muted-foreground">
                    No Reports Found
                  </p>
                  <p className="text-muted-foreground mt-1">
                    No wound encounters in the selected date range
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reportPatients.map((patient) => (
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
                    <PatientHeaderCard
                      patientName={patient.patient_name}
                      patientId={patient.patient_id}
                      woundCount={patient.encounters.length}
                      countLabel="report"
                      badgeVariant="secondary"
                      showChevron={!!onPatientClick}
                    />

                    {/* Encounters List */}
                    <div className="space-y-2">
                      {patient.encounters.map((encounter, idx) => (
                        <div 
                          key={encounter.id || idx}
                          className="rounded-lg p-3 border bg-muted/30"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{encounter.location || "Unknown"}</span>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs", getEtiologyColor(encounter.etiology))}
                                >
                                  {normalizeEtiology(encounter.etiology)}
                                </Badge>
                                <Badge className={cn("text-xs", getProgressColor(encounter.progress))}>
                                  {encounter.progress || "N/A"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDateDisplay(encounter.dos)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Activity className="h-3 w-3" />
                                  {parseFloat(String(encounter.surface || 0)).toFixed(2)} cm²
                                </div>
                                {encounter.days > 0 && (
                                  <span>{encounter.days} days</span>
                                )}
                                {encounter.disposition && (
                                  <Badge variant="outline" className="text-xs">
                                    {encounter.disposition}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
