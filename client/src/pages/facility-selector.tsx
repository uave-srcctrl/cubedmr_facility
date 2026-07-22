import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { FacilitySelector } from "@/components/facility-selector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { logger } from "@/lib/logger";

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
}

export default function FacilitySelectorPage() {
  const [, navigate] = useLocation();
  const {
    getFacilities,
    setSelectedFacility,
    getSelectedFacility,
    logout,
  } = useAuth();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar facilities desde servidor al montar el componente
  useEffect(() => {
    const loadFacilities = async () => {
      try {
        logger.debug("[FacilitySelectorPage] 📤 Iniciando petición a getFacilities()...");
        logger.debug("[FacilitySelectorPage] ⏱️  Timestamp:", new Date().toISOString());
        
        // Llamar a getFacilities() que hace petición al servidor
        const fetchedFacilities = await getFacilities();
        
        logger.debug("\n" + "=".repeat(80));
        logger.debug("[FacilitySelectorPage] 📥 RESULTADO DE getFacilities()");
        logger.debug("=".repeat(80));
        logger.debug(`Total facilities recibidas: ${fetchedFacilities?.length || 0}`);
        logger.debug("Datos completos:", fetchedFacilities);
        logger.debug("=".repeat(80) + "\n");
        
        if (!fetchedFacilities || fetchedFacilities.length === 0) {
          logger.warn("[FacilitySelectorPage] ⚠️  ADVERTENCIA: No se recibieron facilities del servidor");
          setError("No facilities available. Please contact your administrator.");
          setIsLoading(false);
          return;
        }
        
        // Mapear datos si es necesario
        const mappedFacilities = fetchedFacilities.map((facility: any, idx: number) => {
          const mapped = {
            id: facility.id || facility.facility_id,
            name: facility.name || facility.facility_name,
            facility_id: facility.facility_id,
            total_wound_encounters: facility.total_wound_encounters,
            active_wounds: facility.active_wounds,
            average_push_score: facility.average_push_score,
            acuity_level: facility.acuity_level,
            ...facility
          };
          
          logger.debug(`[FacilitySelectorPage] Facility ${idx + 1}:`, {
            id: mapped.id,
            name: mapped.name,
            acuity_level: mapped.acuity_level,
            total_wounds: mapped.total_wound_encounters,
            active_wounds: mapped.active_wounds,
            push_score: mapped.average_push_score
          });
          
          return mapped;
        });
        
        // Deduplicate facilities by ID (keep first occurrence)
        const seen = new Set<string>();
        const uniqueFacilities = mappedFacilities.filter((facility: any) => {
          const id = String(facility.id);
          if (seen.has(id)) {
            logger.debug(`[FacilitySelectorPage] ⚠️ Duplicate facility removed: ${facility.name} (ID: ${id})`);
            return false;
          }
          seen.add(id);
          return true;
        });
        
        if (uniqueFacilities.length !== mappedFacilities.length) {
          logger.warn(`[FacilitySelectorPage] ⚠️ Removed ${mappedFacilities.length - uniqueFacilities.length} duplicate facilities`);
        }
        
        logger.debug(`[FacilitySelectorPage] ✅ Facilities mapeadas exitosamente: ${uniqueFacilities.length} facilities`);
        setFacilities(uniqueFacilities);
        setError(null);
        setIsLoading(false);
      } catch (err) {
        logger.error("[FacilitySelectorPage] ❌ ERROR al cargar facilities:", {
          message: (err as Error).message,
          stack: (err as Error).stack,
          error: err
        });
        setError("Failed to load facilities from server. Please try again.");
        setIsLoading(false);
      }
    };

    loadFacilities();
  }, []);  // ← VACÍO: solo ejecutar al montar el componente

  const handleSelectFacility = (facilityId: string) => {
    try {
      logger.debug("[FacilitySelectorPage] Selecting facility:", facilityId);
      
      // Guardar facility seleccionada
      setSelectedFacility(facilityId);

      // Validar que se guardó correctamente
      const selectedId = getSelectedFacility();
      if (selectedId === facilityId) {
        logger.debug(`[FacilitySelectorPage] ✅ Successfully selected facility: ${facilityId}`);
        
        // Esperar un poco antes de navegar para asegurar que el estado se actualice
        setTimeout(() => {
          logger.debug("[FacilitySelectorPage] 🚀 Navigating to dashboard...");
          navigate("/facility/");
        }, 100);
      } else {
        logger.error("[FacilitySelectorPage] ❌ Failed to select facility. Selected ID:", selectedId, "Expected:", facilityId);
        setError("Failed to select facility. Please try again.");
      }
    } catch (err) {
      logger.error("[FacilitySelectorPage] ❌ Error selecting facility:", err);
      setError("An error occurred while selecting the facility.");
    }
  };

  const handleLogout = async () => {
    try {
      logger.debug("[FacilitySelectorPage] Logout iniciado");
      await logout();
      logger.debug("[FacilitySelectorPage] Logout completado, navegando a login");
      navigate("/");
    } catch (err) {
      logger.error("[FacilitySelectorPage] Error al hacer logout:", err);
      setError("An error occurred while logging out.");
    }
  };

  const handleImportData = () => {
    logger.debug("[FacilitySelectorPage] Navigating to import without facility selection");
    navigate("/facility/data-import");
  };

  // Error State - NO fallback
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Facilities</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <FacilitySelector
      facilities={facilities}
      onSelectFacility={handleSelectFacility}
      onLogout={handleLogout}
      onImportData={handleImportData}
      isLoading={isLoading}
    />
  );
}
