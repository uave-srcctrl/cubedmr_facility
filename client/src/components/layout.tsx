import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Activity,
  PieChart,
  LogOut,
  Menu,
  X,
  Stethoscope
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
  user: { name: string; role: string } | null;
  onLogout: () => void;
}

export default function Layout({ children, user, onLogout }: LayoutProps) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Facility Wound Report", href: "/facility-report", icon: FileText },
    { name: "Outcome Report Global", href: "/outcome-report", icon: Activity },
    { name: "Wound Etiology", href: "/etiology-report", icon: PieChart },
    { name: "Acuity Index", href: "/acuity-report", icon: Stethoscope },
  ];

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
      <div className="flex-1 overflow-y-auto py-6 px-3">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
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
            );
          })}
        </nav>
      </div>
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 px-2 mb-4">
          <Avatar className="h-9 w-9 border border-sidebar-border">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>DR</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user?.name || "Dr. Smith"}</span>
            <span className="text-xs text-muted-foreground">{user?.role || "Facility Admin"}</span>
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
