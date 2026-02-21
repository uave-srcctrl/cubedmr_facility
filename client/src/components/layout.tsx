import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Activity,
  PieChart,
  LogOut,
  Menu,
  X,
  Stethoscope,
  Building2,
  Check,
  ChevronDown,
  Upload,
  FileSpreadsheet,
  FileJson,
  FileCode,
  File,
  Settings,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { onAuthEvent, AUTH_EVENTS } from "@/lib/auth-events";

interface LayoutProps {
  children: React.ReactNode;
  user: { name: string; role: string; email?: string } | null;
  onLogout: () => void;
}

export default function Layout({ children, user, onLogout }: LayoutProps) {
  console.log('[Layout] Component mounted/rendered with user:', user?.name);
  const [location] = useLocation();
  console.log('[Layout] Current location:', location);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Facility management
  const [, navigate] = useLocation();
  
  const { 
    getSelectedFacility,
    setSelectedFacility,
    clearSelectedFacility,
    getSelectedFacilityInfo,
    getAvailableFacilities
  } = useAuth();

  const [selectedFacilityId, setSelectedFacilityIdLocal] = useState<string | null>(null);
  const [selectedFacilityInfo, setSelectedFacilityInfoLocal] = useState<any>(null);
  const [facilities, setFacilitiesLocal] = useState<any[]>([]);

  // Load facility info on mount and when it changes
  useEffect(() => {
    const loadFacilityInfo = () => {
      const selected = getSelectedFacility();
      const info = getSelectedFacilityInfo();
      const available = getAvailableFacilities();
      
      setSelectedFacilityIdLocal(selected);
      setSelectedFacilityInfoLocal(info);
      setFacilitiesLocal(available);
    };

    loadFacilityInfo();

    // Listen for facility changes
    const unsubscribe = onAuthEvent(AUTH_EVENTS.FACILITY_CHANGED, () => {
      loadFacilityInfo();
    });

    return unsubscribe;
  }, []);

  const handleChangeFacility = (facilityId: string) => {
    console.log(`[Layout] Changing facility to: ${facilityId}`);
    setSelectedFacility(facilityId);
    setSelectedFacilityIdLocal(facilityId);
    navigate('/facility/');
  }

  const handleGoToFacilitySelector = () => {
    console.log('[Layout] Clearing facility and navigating to selector');
    clearSelectedFacility();
    setSelectedFacilityIdLocal(null);
    setSelectedFacilityInfoLocal(null);
    navigate('/');
  }

  // ==================== SETTINGS HOOK ====================
  const { isPageEnabled } = useSettings();

  // Navigation items with their settings page IDs
  const allNavigation = [
    { name: "Dashboard", href: "/facility/", icon: LayoutDashboard, pageId: "dashboard" },
    { name: "Patients", href: "/facility/patients", icon: Users, pageId: "patients" },
    { name: "Woundcare Round Summary", href: "/facility/round-summary", icon: FileText, pageId: "round-summary" },
    { name: "Facility Wound Report", href: "/facility/facility-report", icon: FileText, pageId: "facility-report" },
    { name: "Outcome Report Global", href: "/facility/outcome-report", icon: Activity, pageId: "outcome-report" },
    { name: "Wound Etiology", href: "/facility/etiology-report", icon: PieChart, pageId: "etiology-report" },
    { name: "Acuity Index", href: "/facility/acuity-report", icon: Stethoscope, pageId: "acuity-report" },
    { name: "Data Import", href: "/facility/data-import", icon: Upload, pageId: "data-import", separator: true },
    { name: "Excel Import", href: "/facility/excel-import", icon: FileSpreadsheet, pageId: "excel-import" },
  ];

  // Filter navigation based on settings
  const navigation = useMemo(() => {
    return allNavigation.filter(item => isPageEnabled(item.pageId));
  }, [isPageEnabled]);

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
          <span>WoundCare<span className="font-light text-muted-foreground">Analytics</span></span>
        </div>
      </div>

      {/* ===== FACILITY SELECTOR DROPDOWN ===== */}
      {facilities.length > 0 && (
        <div className="px-4 py-4 border-b border-sidebar-border bg-sidebar-accent/30">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Current Facility
          </label>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full mt-2.5 px-3 py-2.5 rounded-md border border-input bg-background/80 hover:bg-background transition-colors flex items-center justify-between text-sm font-medium group">
                <span className="flex items-center gap-2 truncate text-foreground">
                  <Building2 className="h-4 w-4 flex-shrink-0 text-primary" />
                  <span className="truncate text-sm">
                    {selectedFacilityInfo?.name || "Select facility"}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="start" className="w-56" side="right">
              <DropdownMenuItem
                onClick={handleGoToFacilitySelector}
                className="cursor-pointer gap-2 text-primary hover:text-primary"
              >
                <div className="flex items-center gap-2 w-full">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium text-sm">Go to Facility Selector</span>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {facilities.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No facilities available
                </div>
              ) : (
                facilities.map((facility: any) => (
                    <DropdownMenuItem
                      key={facility.id}
                      onClick={() => handleChangeFacility(facility.id)}
                      className={cn(
                        "cursor-pointer gap-2",
                        selectedFacilityId === facility.id && "bg-primary/10"
                      )}
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 truncate">
                            <div className="font-medium text-sm truncate">
                              {facility.name}
                            </div>
                            {facility.activePatients !== undefined && (
                              <div className="text-xs text-muted-foreground">
                              {facility.activePatients} active
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Checkmark para facility actual */}
                      {selectedFacilityId === facility.id && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {/* ===== FIN FACILITY SELECTOR DROPDOWN ===== */}

      <div className="flex-1 overflow-y-auto py-6 px-3">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <div key={item.name}>
                {item.separator && (
                  <div className="my-3 border-t border-sidebar-border" />
                )}
              <Link href={item.href}>
                <div
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {item.name}
                </div>
              </Link>
              </div>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-sidebar-border p-4 space-y-2">
        <Link href="/facility/settings">
          <div
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
              location === "/facility/settings"
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
            )}
          >
            <Settings
              className={cn(
                "h-5 w-5 flex-shrink-0 transition-colors",
                location === "/facility/settings" ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            Settings
          </div>
        </Link>
        
        <div className="flex items-center gap-3 px-2 py-2 border-t border-sidebar-border/50 mt-2 pt-4">
          <Avatar className="h-9 w-9 border border-sidebar-border">
            <AvatarFallback>{user?.name?.charAt(0) || "D"}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{user?.name || "User"}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.email || "No email"}</span>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/5"
          onClick={onLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <SidebarContent />
      </div>

      {/* Mobile Header */}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background/80 backdrop-blur-sm px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 lg:hidden">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-m-2.5 p-2.5 text-muted-foreground lg:hidden">
                <span className="sr-only">Open sidebar</span>
                <Menu className="h-6 w-6" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-r border-sidebar-border">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center justify-end">
             <span className="font-semibold text-primary">WoundCare Analytics</span>
          </div>
        </header>

        <main className="py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
          {children}
        </main>
      </div>
    </div>
  );
}
