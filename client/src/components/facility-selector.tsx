import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EcgLoader } from "@/components/ecg-loader";
import { AlertCircle, Loader2, Building2, LogOut, FileUp } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";

// Pastel background colors for facility cards
const cardColors = [
  "bg-blue-50 hover:bg-blue-100/70 dark:bg-blue-950/20 dark:hover:bg-blue-950/30",
  "bg-green-50 hover:bg-green-100/70 dark:bg-green-950/20 dark:hover:bg-green-950/30",
  "bg-purple-50 hover:bg-purple-100/70 dark:bg-purple-950/20 dark:hover:bg-purple-950/30",
  "bg-pink-50 hover:bg-pink-100/70 dark:bg-pink-950/20 dark:hover:bg-pink-950/30",
  "bg-amber-50 hover:bg-amber-100/70 dark:bg-amber-950/20 dark:hover:bg-amber-950/30",
  "bg-teal-50 hover:bg-teal-100/70 dark:bg-teal-950/20 dark:hover:bg-teal-950/30",
  "bg-indigo-50 hover:bg-indigo-100/70 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30",
  "bg-cyan-50 hover:bg-cyan-100/70 dark:bg-cyan-950/20 dark:hover:bg-cyan-950/30",
];
import { cn } from "@/lib/utils";

interface Facility {
  id: string;
  name: string;
  patients?: number;
  activePatients?: number;
  location?: string;
  total_wound_encounters?: number;
  active_wounds?: number;
  average_push_score?: string;
  acuity_level?: string;
  [key: string]: any;
}

interface FacilitySelectorProps {
  facilities: Facility[];
  onSelectFacility: (facilityId: string) => void;
  onLogout?: () => void;
  onImportData?: () => void;
  isLoading?: boolean;
}

export function FacilitySelector({
  facilities,
  onSelectFacility,
  onLogout,
  onImportData,
  isLoading = false
}: FacilitySelectorProps) {
  const [selectedFacility, setSelectedFacility] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  // Check if Import Data button should be shown based on settings
  const showImportDataButton = settings.pages
    .find(p => p.id === 'facility-selector')
    ?.components?.find(c => c.id === 'import-data-button')?.enabled ?? true;

  // Pre-select first facility if none selected
  useEffect(() => {
    if (facilities.length > 0 && !selectedFacility) {
      setSelectedFacility(facilities[0].id);
    }
  }, [facilities, selectedFacility]);

  // Enfocar el contenedor cuando se monta para capturar eventos de teclado
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  const handleSelectFacility = async (facilityId: string) => {
    if (!facilityId || isSubmitting) return;
    setIsSubmitting(true);
    setSelectedFacility(facilityId);
    try {
      onSelectFacility(facilityId);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && selectedFacility && !isSubmitting) {
      handleSelectFacility(selectedFacility);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/20">
        <EcgLoader title="Loading facilities..." minHeight="min-h-[300px]" />
      </div>
    );
  }

  // Empty State
  if (facilities.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Facilities Available</AlertTitle>
          <AlertDescription>
            No facilities are assigned to your account. Please contact an administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/20 p-4"
      onKeyPress={handleKeyPress}
    >
      <Card className="w-full max-w-4xl shadow-lg border-0">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Select Your Facility</CardTitle>
                <CardDescription>Choose which facility you want to access</CardDescription>
              </div>
            </div>
            {onLogout && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Facility Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {facilities.map((facility, index) => (
              <div
                key={facility.id}
                onClick={() => handleSelectFacility(facility.id)}
                className={cn(
                  "p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md",
                  selectedFacility === facility.id
                    ? "border-primary shadow-md"
                    : "border-muted hover:border-primary/50",
                  cardColors[index % cardColors.length]
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base">
                    {facility.name || `Facility ${facility.id}`}
                  </h3>
                  <div 
                    className={cn(
                      "h-5 w-5 rounded-full border-2 flex-shrink-0 transition-all",
                      selectedFacility === facility.id
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    )}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Multiple Facilities Info */}
          {facilities.length > 1 && (
            <Alert className="bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-100">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-900 dark:text-blue-100">Multiple Facilities</AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                You can change facilities anytime from the menu after logging in.
              </AlertDescription>
            </Alert>
          )}

          {/* Loading indicator when submitting */}
          {isSubmitting && (
            <div className="flex items-center justify-center gap-2 text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading facility...</span>
            </div>
          )}

          {/* Import Data Button */}
          {onImportData && showImportDataButton && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={onImportData}
                className="text-primary hover:bg-primary/10"
              >
                <FileUp className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            </div>
          )}

          {/* Hint */}
          <p className="text-center text-xs text-muted-foreground">
            💡 Click on a facility to access it
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
