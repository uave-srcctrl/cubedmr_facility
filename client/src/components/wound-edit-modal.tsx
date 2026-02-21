import { useState, useEffect } from "react";
import { format, parse } from "date-fns";
import {
  Pencil,
  Save,
  X,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  NestedDialogContent,
} from "@/components/ui/dialog";
import { EcgLoader } from "@/components/ecg-loader";
import { cn } from "@/lib/utils";
import { useUpdateWoundEncounter } from "@/hooks/use-patients";
import { useQueryClient } from "@tanstack/react-query";

// Generic wound data interface that both WoundEncounter and CriticalWound can satisfy
export interface EditableWound {
  id: string;
  dos: string;
  patient_id: string;
  location: string;
  etiology: string;
  width: number;
  height: number;
  depth: number;
  exudate: string;
  tissue: string;
  treatment: string;
  frequency?: string;
  progress: string;
  disposition?: string;
  debridement?: string;
  start_date: string;
  push_score: number;
  POA: boolean;
  Palliative: boolean;
  facility_acquired: boolean;
}

interface WoundEditModalProps {
  wound: EditableWound | null;
  facilityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSuccess?: () => void;
  maxStartDate?: Date; // Optional max date for start date calendar
}

interface EditFormState {
  location: string;
  etiology: string;
  startDate: string;
  width: string;
  height: string;
  depth: string;
  exudate: string;
  tissue: string;
  treatment: string;
  frequency: string;
  progress: string;
  disposition: string;
  debridement: string;
  poa: boolean;
  palliative: boolean;
  facilityAcquired: boolean;
}

const initialFormState: EditFormState = {
  location: '',
  etiology: '',
  startDate: '',
  width: '',
  height: '',
  depth: '',
  exudate: '',
  tissue: '',
  treatment: '',
  frequency: '',
  progress: '',
  disposition: '',
  debridement: '',
  poa: false,
  palliative: false,
  facilityAcquired: false,
};

// Helper to parse string values to numbers
const toNum = (val: unknown): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  return 0;
};

const formatDate = (dateString: string) => {
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

export function WoundEditModal({
  wound,
  facilityId,
  open,
  onOpenChange,
  onSaveSuccess,
  maxStartDate,
}: WoundEditModalProps) {
  const [editForm, setEditForm] = useState<EditFormState>(initialFormState);
  const updateMutation = useUpdateWoundEncounter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Populate form when wound changes
  useEffect(() => {
    if (wound) {
      setEditForm({
        location: wound.location || '',
        etiology: wound.etiology || '',
        startDate: wound.start_date || '',
        width: String(toNum(wound.width)),
        height: String(toNum(wound.height)),
        depth: String(toNum(wound.depth)),
        exudate: wound.exudate || '',
        tissue: wound.tissue || '',
        treatment: wound.treatment || '',
        frequency: wound.frequency || '',
        progress: wound.progress || '',
        disposition: wound.disposition || '',
        debridement: wound.debridement || '',
        poa: !!wound.POA,
        palliative: !!wound.Palliative,
        facilityAcquired: !!wound.facility_acquired,
      });
    } else {
      setEditForm(initialFormState);
    }
  }, [wound]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!wound) return;
    
    try {
      await updateMutation.mutateAsync({
        facilityId,
        patientId: String(wound.patient_id),
        encounterId: String(wound.id),
        location: editForm.location || undefined,
        etiology: editForm.etiology || undefined,
        startDate: editForm.startDate || undefined,
        width: parseFloat(editForm.width) || undefined,
        height: parseFloat(editForm.height) || undefined,
        depth: parseFloat(editForm.depth) || undefined,
        exudate: editForm.exudate || undefined,
        tissue: editForm.tissue || undefined,
        treatment: editForm.treatment || undefined,
        frequency: editForm.frequency || undefined,
        progress: editForm.progress || undefined,
        disposition: editForm.disposition || undefined,
        debridement: editForm.debridement || undefined,
        poa: editForm.poa,
        palliative: editForm.palliative,
        facilityAcquired: editForm.facilityAcquired,
      });
      
      // Refetch all wound-related queries to ensure UI updates
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["patientDetail", facilityId, String(wound.patient_id)] }),
        queryClient.refetchQueries({ queryKey: ["facilityPatients"] }),
        queryClient.refetchQueries({ queryKey: ["facilityPatientsByDate"] }),
        queryClient.refetchQueries({ queryKey: ["criticalCases"] }),
        queryClient.refetchQueries({ queryKey: ["deterioratingWounds"] }),
        queryClient.refetchQueries({ queryKey: ["newWounds"] }),
        queryClient.refetchQueries({ queryKey: ["resolvedWounds"] }),
        queryClient.refetchQueries({ queryKey: ["activeWounds"] }),
        queryClient.refetchQueries({ queryKey: ["chronicWounds"] }),
        queryClient.refetchQueries({ queryKey: ["reportsGenerated"] }),
        queryClient.refetchQueries({ queryKey: ["woundsByDisposition"] }),
        queryClient.refetchQueries({ queryKey: ["woundsByHealingStatus"] }),
        queryClient.refetchQueries({ queryKey: ["woundsByEtiology"] }),
        queryClient.refetchQueries({ queryKey: ["roundSummary"] }),
        queryClient.refetchQueries({ queryKey: ["facilityWoundReport"] }),
        queryClient.refetchQueries({ queryKey: ["facilityAcuityIndex4Weeks"] }),
        queryClient.refetchQueries({ queryKey: ["facilityAcuityIndexRange"] }),
        queryClient.refetchQueries({ queryKey: ["woundEncountersPushScore"] }),
      ]);
      
      toast({
        title: "Wound Updated",
        description: "The wound encounter has been saved successfully.",
      });
      onSaveSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Failed to update wound:', error);
      toast({
        variant: "destructive",
        title: "Error Saving Wound",
        description: error instanceof Error ? error.message : "Failed to save wound changes. Please try again.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <NestedDialogContent className="max-w-[748px]">
        {/* Loading overlay when saving */}
        {updateMutation.isPending && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 rounded-lg">
            <EcgLoader title="Saving changes..." minHeight="min-h-[100px]" />
          </div>
        )}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Wound Encounter
          </DialogTitle>
          <DialogDescription>
            {wound && (
              <>
                {wound.location} - {formatDate(wound.dos)}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
          
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Location, Etiology & Start Date */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="location" className="text-xs">Location</Label>
              <Input
                id="location"
                value={editForm.location}
                onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="etiology" className="text-xs">Etiology</Label>
              <Select
                value={editForm.etiology}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, etiology: value }))}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select etiology" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px] overflow-y-auto">
                  <SelectGroup>
                    <SelectLabel>Pressure Ulcers</SelectLabel>
                    <SelectItem value="Pressure Ulcer">Pressure Ulcer</SelectItem>
                    <SelectItem value="Pressure (DTI)">Pressure (DTI)</SelectItem>
                    <SelectItem value="Pressure (I)">Pressure (I)</SelectItem>
                    <SelectItem value="Pressure (II)">Pressure (II)</SelectItem>
                    <SelectItem value="Pressure (III)">Pressure (III)</SelectItem>
                    <SelectItem value="Pressure (IV)">Pressure (IV)</SelectItem>
                    <SelectItem value="Pressure (Unstageable)">Pressure (Unstageable)</SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Vascular</SelectLabel>
                    <SelectItem value="Venous">Venous</SelectItem>
                    <SelectItem value="Venous Stasis">Venous Stasis</SelectItem>
                    <SelectItem value="Arterial">Arterial</SelectItem>
                    <SelectItem value="Diabetic">Diabetic</SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Other</SelectLabel>
                    <SelectItem value="Surgical">Surgical</SelectItem>
                    <SelectItem value="Traumatic">Traumatic</SelectItem>
                    <SelectItem value="Malignancy">Malignancy</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="startDate" className="text-xs">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-8 w-full justify-start text-left font-normal",
                      !editForm.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editForm.startDate ? format(parse(editForm.startDate, 'yyyy-MM-dd', new Date()), 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[288px] p-0 z-[300]" align="start">
                  <div className="p-3 border-b bg-muted/50 text-xs text-muted-foreground">
                    {maxStartDate 
                      ? `Dates up to ${format(maxStartDate, 'PPP')} available`
                      : 'Select wound start date'
                    }
                  </div>
                  <Calendar
                    mode="single"
                    selected={editForm.startDate ? parse(editForm.startDate, 'yyyy-MM-dd', new Date()) : undefined}
                    onSelect={(date) => setEditForm(prev => ({ ...prev, startDate: date ? format(date, 'yyyy-MM-dd') : '' }))}
                    initialFocus
                    defaultMonth={editForm.startDate ? parse(editForm.startDate, 'yyyy-MM-dd', new Date()) : undefined}
                    maxDate={maxStartDate}
                    className="w-full"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Dimensions Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="width" className="text-xs">Width (cm)</Label>
              <Input
                id="width"
                type="number"
                step="0.1"
                value={editForm.width}
                onChange={(e) => setEditForm(prev => ({ ...prev, width: e.target.value }))}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="height" className="text-xs">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                step="0.1"
                value={editForm.height}
                onChange={(e) => setEditForm(prev => ({ ...prev, height: e.target.value }))}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="depth" className="text-xs">Depth (cm)</Label>
              <Input
                id="depth"
                type="number"
                step="0.1"
                value={editForm.depth}
                onChange={(e) => setEditForm(prev => ({ ...prev, depth: e.target.value }))}
                className="h-8"
              />
            </div>
          </div>
          
          {/* Tissue & Exudate */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="tissue" className="text-xs">Tissue Type</Label>
              <Input
                id="tissue"
                value={editForm.tissue}
                onChange={(e) => setEditForm(prev => ({ ...prev, tissue: e.target.value }))}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="exudate" className="text-xs">Exudate</Label>
              <Select
                value={editForm.exudate}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, exudate: value }))}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select exudate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Serous light">Serous light</SelectItem>
                  <SelectItem value="Serous moderate">Serous moderate</SelectItem>
                  <SelectItem value="Serous heavy">Serous heavy</SelectItem>
                  <SelectItem value="Serosanguineous">Serosanguineous</SelectItem>
                  <SelectItem value="Sanguineous">Sanguineous</SelectItem>
                  <SelectItem value="Purulent">Purulent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Treatment & Progress */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="treatment" className="text-xs">Treatment</Label>
              <Input
                id="treatment"
                value={editForm.treatment}
                onChange={(e) => setEditForm(prev => ({ ...prev, treatment: e.target.value }))}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="progress" className="text-xs">Progress</Label>
              <Select
                value={editForm.progress}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, progress: value }))}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select progress" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Improving">Improving</SelectItem>
                  <SelectItem value="Stable">Stable</SelectItem>
                  <SelectItem value="Deteriorated">Deteriorated</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Frequency & Disposition */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="frequency" className="text-xs">Frequency</Label>
              <Select
                value={editForm.frequency}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, frequency: value }))}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectGroup>
                    <SelectLabel>Daily</SelectLabel>
                    <SelectItem value="QD">QD</SelectItem>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="QAM">QAM</SelectItem>
                    <SelectItem value="QPM">QPM</SelectItem>
                    <SelectItem value="QHS">QHS</SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Multiple Daily</SelectLabel>
                    <SelectItem value="BID">BID</SelectItem>
                    <SelectItem value="TID">TID</SelectItem>
                    <SelectItem value="QID">QID</SelectItem>
                    <SelectItem value="every shift">Every Shift</SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Every X Days</SelectLabel>
                    <SelectItem value="QOD">QOD</SelectItem>
                    <SelectItem value="Q2D">Q2D</SelectItem>
                    <SelectItem value="Q3D">Q3D</SelectItem>
                    <SelectItem value="Q4D">Q4D</SelectItem>
                    <SelectItem value="Q5D">Q5D</SelectItem>
                    <SelectItem value="Q6D">Q6D</SelectItem>
                    <SelectItem value="Q7D">Q7D</SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Weekly</SelectLabel>
                    <SelectItem value="QWK">QWK</SelectItem>
                    <SelectItem value="Q1WK">Q1WK</SelectItem>
                    <SelectItem value="Q2WK">Q2WK</SelectItem>
                    <SelectItem value="Q3WK">Q3WK</SelectItem>
                    <SelectItem value="Q4WK">Q4WK</SelectItem>
                    <SelectItem value="BIW">BIW</SelectItem>
                    <SelectItem value="TIW">TIW</SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Hourly</SelectLabel>
                    <SelectItem value="Q4H">Q4H</SelectItem>
                    <SelectItem value="Q6H">Q6H</SelectItem>
                    <SelectItem value="Q8H">Q8H</SelectItem>
                    <SelectItem value="Q12H">Q12H</SelectItem>
                    <SelectItem value="Q24H">Q24H</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="disposition" className="text-xs">Disposition</Label>
              <Select
                value={editForm.disposition}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, disposition: value }))}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select disposition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Healed">Healed</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Boolean Flags */}
          <div className="grid grid-cols-4 gap-4 py-2">
            <div className="flex flex-col items-center gap-1">
              <Label htmlFor="debridement" className="text-xs text-center">Debridement</Label>
              <Switch
                id="debridement"
                checked={editForm.debridement === 'YES' || editForm.debridement === 'Yes'}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, debridement: checked ? 'YES' : 'NO' }))}
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <Label htmlFor="poa" className="text-xs text-center">POA</Label>
              <Switch
                id="poa"
                checked={editForm.poa}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, poa: checked }))}
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <Label htmlFor="palliative" className="text-xs text-center">Palliative</Label>
              <Switch
                id="palliative"
                checked={editForm.palliative}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, palliative: checked }))}
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <Label htmlFor="facilityAcquired" className="text-xs text-center">Fac. Acquired</Label>
              <Switch
                id="facilityAcquired"
                checked={editForm.facilityAcquired}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, facilityAcquired: checked }))}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={updateMutation.isPending}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </NestedDialogContent>
    </Dialog>
  );
}
