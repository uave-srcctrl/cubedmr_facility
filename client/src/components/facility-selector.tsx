import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, Building2, MapPin, Users, Zap, TrendingUp, LogOut } from "lucide-react";
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
  isLoading?: boolean;
}

export function FacilitySelector({
  facilities,
  onSelectFacility,
  onLogout,
  isLoading = false
}: FacilitySelectorProps) {
  const [selectedFacility, setSelectedFacility] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleSelectFacility = async () => {
    if (!selectedFacility) return;
    setIsSubmitting(true);
    try {
      onSelectFacility(selectedFacility);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && selectedFacility && !isSubmitting) {
      handleSelectFacility();
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-lg font-medium">Loading facilities...</p>
        </div>
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
            {facilities.map((facility) => (
              <div
                key={facility.id}
                onClick={() => setSelectedFacility(facility.id)}
                className={cn(
                  "p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md",
                  selectedFacility === facility.id
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-muted hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className="space-y-3">
                  {/* Header con nombre y radio button */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-base">
                        {facility.name || `Facility ${facility.id}`}
                      </h3>
                      {facility.acuity_level && (
                        <p className={cn(
                          "text-xs font-medium mt-1",
                          facility.acuity_level === "Crítico" ? "text-red-600" :
                          facility.acuity_level === "Alerta" ? "text-orange-600" :
                          facility.acuity_level === "Monitoreo" ? "text-yellow-600" :
                          "text-green-600"
                        )}>
                          {facility.acuity_level}
                        </p>
                      )}
                    </div>
                    <div 
                      className={cn(
                        "h-5 w-5 rounded-full border-2 flex-shrink-0 transition-all",
                        selectedFacility === facility.id
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      )}
                    />
                  </div>

                  {/* Info con detalles de heridas */}
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {facility.total_wound_encounters && (
                      <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3" />
                        <span>
                          {facility.total_wound_encounters} total wound encounters
                        </span>
                      </div>
                    )}
                    
                    {facility.active_wounds !== undefined && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-3 w-3" />
                        <span>
                          {facility.active_wounds} active wound{facility.active_wounds !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {facility.average_push_score && (
                      <div className="flex items-center gap-2">
                        <span>Avg PUSH: {facility.average_push_score}</span>
                      </div>
                    )}

                    {facility.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{facility.location}</span>
                      </div>
                    )}

                    {facility.patients && (
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        <span>{facility.patients} total patients</span>
                      </div>
                    )}

                    {facility.activePatients && (
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        <span>{facility.activePatients} active patients</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          {facilities.length > 1 && (
            <Alert className="bg-blue-50 border-blue-200 text-blue-900">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900">Multiple Facilities</AlertTitle>
              <AlertDescription className="text-blue-800 text-sm">
                You can change facilities anytime from the menu after logging in.
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSelectFacility}
            disabled={!selectedFacility || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Continue to Dashboard"
            )}
          </Button>

          {/* Keyboard shortcut hint */}
          <p className="text-center text-xs text-muted-foreground">
            💡 Press Enter to continue or click any facility above
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
