import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { FacilitySelector } from "@/components/facility-selector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface Facility {
  id: string;
  name: string;
  patients?: number;
  activePatients?: number;
  location?: string;
}

export default function FacilitySelectorPage() {
  const [, navigate] = useLocation();
  const {
    getAuthInfo,
    getAvailableFacilities,
    setSelectedFacility,
    getSelectedFacility,
    getEntityId
  } = useAuth();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar facilities en mount
  useEffect(() => {
    const loadFacilities = async () => {
      try {
        const authInfo = getAuthInfo();
        
        // Si no hay facilities disponibles, usar fallback
        if (!authInfo.facilities || authInfo.facilities.length === 0) {
          const availableFacilities = getAvailableFacilities();
          if (availableFacilities.length === 0) {
            // No facilities available - use fallback to facility 5
            console.log("[FacilitySelectorPage] No facilities available, using fallback facilityId: 5");
            setSelectedFacility("5");
            setIsLoading(false);
            // Navigate to dashboard with fallback facility
            setTimeout(() => navigate("/facility/"), 300);
            return;
          }
          setFacilities(availableFacilities);
        } else {
          setFacilities(authInfo.facilities);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error loading facilities:", err);
        setError("Failed to load facilities. Please try again.");
        setIsLoading(false);
      }
    };

    loadFacilities();
  }, []);

  const handleSelectFacility = (facilityId: string) => {
    try {
      // Guardar facility seleccionada
      setSelectedFacility(facilityId);

      // Validar que se guardó correctamente
      const selectedId = getSelectedFacility();
      if (selectedId === facilityId) {
        console.log(`[FacilitySelectorPage] Successfully selected facility: ${facilityId}`);
        
        // Navegar al dashboard
        navigate("/facility/");
      } else {
        setError("Failed to select facility. Please try again.");
      }
    } catch (err) {
      console.error("Error selecting facility:", err);
      setError("An error occurred while selecting the facility.");
    }
  };

  // Error State
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <FacilitySelector
      facilities={facilities}
      onSelectFacility={handleSelectFacility}
      isLoading={isLoading}
    />
  );
}
