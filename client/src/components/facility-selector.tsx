import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, Building2, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Facility {
  id: string;
  name: string;
  patients?: number;
  activePatients?: number;
  location?: string;
}

interface FacilitySelectorProps {
  facilities: Facility[];
  onSelectFacility: (facilityId: string) => void;
  isLoading?: boolean;
}

export function FacilitySelector({
  facilities,
  onSelectFacility,
  isLoading = false
}: FacilitySelectorProps) {
  const [selectedFacility, setSelectedFacility] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-select first facility if none selected
  useEffect(() => {
    if (facilities.length > 0 && !selectedFacility) {
      setSelectedFacility(facilities[0].id);
    }
  }, [facilities, selectedFacility]);

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
      className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/20 p-4"
      onKeyPress={handleKeyPress}
    >
      <Card className="w-full max-w-2xl shadow-lg border-0">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Select Your Facility</CardTitle>
              <CardDescription>Choose which facility you want to access</CardDescription>
            </div>
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
                    <h3 className="font-semibold text-sm leading-tight">
                      {facility.name}
                    </h3>
                    <div 
                      className={cn(
                        "h-4 w-4 rounded-full border-2 flex-shrink-0 transition-all",
                        selectedFacility === facility.id
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      )}
                    />
                  </div>

                  {/* Info fila con detalles */}
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {facility.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{facility.location}</span>
                      </div>
                    )}
                    
                    {facility.activePatients !== undefined && (
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        <span>
                          {facility.activePatients} active patient{facility.activePatients !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Info sobre facilities */}
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
