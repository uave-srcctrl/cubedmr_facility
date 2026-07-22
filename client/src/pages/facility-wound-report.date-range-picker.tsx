/**
 * Date range picker used by the Facility Wound Report.
 * Extracted from facility-wound-report.tsx (LIMP-4 decomposition) without behavior change.
 */
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DateRangePicker({ date, setDate, label, enabledDates }: { date: Date | undefined, setDate: (d: Date | undefined) => void, label: string, enabledDates?: string[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[228px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{label}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[288px] p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          defaultMonth={date}
          enabledDates={enabledDates}
          className="w-full"
        />
      </PopoverContent>
    </Popover>
  )
}
