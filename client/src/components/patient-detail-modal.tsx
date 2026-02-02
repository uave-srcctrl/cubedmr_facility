import { useState } from "react";
import {
  Zap,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  Home,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Treatment {
  date: string;
  type: string;
}

interface Wound {
  id: string;
  type: string;
  push_score: number | null;
  in_house: boolean;
  treatments: Treatment[];
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  status: "active" | "inactive" | "discharged";
  created_at: string;
  active_wounds?: number;
  wounds?: Wound[];
}

interface PatientDetailModalProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatientDetailModal({
  patient,
  open,
  onOpenChange,
}: PatientDetailModalProps) {
  if (!patient) return null;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-600">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "discharged":
        return <Badge variant="outline">Discharged</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getWoundTypeColor = (type: string) => {
    switch (type) {
      case "Pressure Ulcer":
        return "bg-red-100 text-red-800";
      case "Venous Stasis":
        return "bg-blue-100 text-blue-800";
      case "Diabetic":
        return "bg-orange-100 text-orange-800";
      case "Arterial":
        return "bg-purple-100 text-purple-800";
      case "Surgical":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex-1">
            <DialogTitle className="text-2xl">
              {patient.first_name} {patient.last_name}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">ID: {patient.id}</p>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-2">{getStatusBadge(patient.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Age</p>
                  <p className="font-medium mt-2">
                    {calculateAge(patient.date_of_birth)} years
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Date of Birth
                  </p>
                  <p className="font-medium mt-2">
                    {formatDate(patient.date_of_birth)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Patient Since</p>
                  <p className="font-medium mt-2">
                    {formatDate(patient.created_at)}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                {patient.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{patient.phone}</p>
                    </div>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{patient.email}</p>
                    </div>
                  </div>
                )}
                {patient.city && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">
                        {patient.address && `${patient.address}, `}
                        {patient.city}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Wounds */}
          {patient.wounds && patient.wounds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Active Wounds ({patient.wounds.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {patient.wounds.map((wound) => (
                  <div
                    key={wound.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={getWoundTypeColor(wound.type)}>
                          {wound.type}
                        </Badge>
                        <div className="text-sm">
                          <p className="text-muted-foreground">ID: {wound.id}</p>
                        </div>
                      </div>
                      <Badge
                        variant={wound.in_house ? "default" : "secondary"}
                        className="flex items-center gap-1"
                      >
                        <Home className="h-3 w-3" />
                        {wound.in_house ? "In-House" : "Externo"}
                      </Badge>
                    </div>

                    {/* Push Score - Solo para Pressure Ulcer */}
                    {wound.type === "Pressure Ulcer" && wound.push_score !== null && (
                      <div className="bg-gradient-to-r from-red-50 to-orange-50 p-3 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-sm">
                              PUSH Score
                            </span>
                          </div>
                          <span className="text-lg font-bold text-orange-700">
                            {wound.push_score}/17
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-orange-600 h-2 rounded-full"
                            style={{
                              width: `${(wound.push_score / 17) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Treatment History */}
                    {wound.treatments && wound.treatments.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Treatment History
                        </h4>
                        <div className="space-y-2">
                          {wound.treatments.map((treatment, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-slate-50 p-2 rounded text-sm"
                            >
                              <span className="font-medium">
                                {treatment.type}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {formatDate(treatment.date)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {!patient.wounds || patient.wounds.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    No wounds registered for this patient
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
