import { FileX, Upload, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface NoFacilityDataProps {
  facilityName?: string;
  className?: string;
  showImportButton?: boolean;
}

/**
 * Full-page component shown when selected facility has no wound_encounters data
 */
export function NoFacilityData({ 
  facilityName = "this facility",
  className = "",
  showImportButton = true
}: NoFacilityDataProps) {
  const [, setLocation] = useLocation();
  const { clearSelectedFacility } = useAuth();

  const handleSelectFacility = () => {
    clearSelectedFacility();
    setLocation('/');
  };

  return (
    <div className={`flex items-center justify-center min-h-[60vh] p-4 ${className}`}>
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <FileX className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">No Data Available</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="space-y-2">
            <p className="text-muted-foreground">
              There are no wound encounters for:
            </p>
            <p className="font-medium text-foreground text-lg">
              {facilityName}
            </p>
            <p className="text-sm text-muted-foreground">
              Import wound data using PDF files or select a different facility to view reports.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            {showImportButton && (
              <Button 
                onClick={() => setLocation('/facility/data-import')}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Import Data
              </Button>
            )}
            <Button 
              variant="outline"
              onClick={handleSelectFacility}
              className="flex items-center gap-2"
            >
              <Building2 className="h-4 w-4" />
              Select Facility
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Smaller card version for use within existing page layouts
 */
export function NoFacilityDataCard({ 
  facilityName = "this facility",
  title = "No Data Available",
  className = ""
}: { facilityName?: string; title?: string; className?: string }) {
  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <FileX className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-center text-muted-foreground text-sm">
            No wound encounter data available for:
          </p>
          <p className="text-center font-medium text-foreground text-sm mt-1">
            {facilityName}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
