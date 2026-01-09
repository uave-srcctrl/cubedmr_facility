import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NoDataComponentProps {
  title?: string;
  description?: string;
  className?: string;
}

export function NoDataComponent({ 
  title = "No Data Available",
  description = "Unable to fetch data from backend. Data source may be unavailable.",
  className = ""
}: NoDataComponentProps) {
  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground text-sm max-w-sm">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
