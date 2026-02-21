import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { LOCAL_API } from "@/lib/api-config";
import { dispatchAuthEvent, AUTH_EVENTS } from "@/lib/auth-events";

// Helper function to compute SHA256 hash
async function sha256(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
}

const formSchema = z.object({
  identifier: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
});

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const checkAuth = () => {
      if (isAuthenticated()) {
        console.log("[Login] User already authenticated - skipping login form and calling onLogin()");
        onLogin();
      }
    };

    // Small delay to ensure localStorage is populated
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [isAuthenticated, onLogin]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      // Facility login by email
      const email = values.identifier;
      const entity = "TryLogin";
      
      // Generate a device ID if not already in localStorage
      let deviceId = localStorage.getItem("deviceId");
      if (!deviceId) {
        deviceId = "web-" + Math.random().toString(36).substr(2, 9);
        localStorage.setItem("deviceId", deviceId);
      }

      console.log("[Login] Submitting facility login with email:", email, "- Entity:", entity, "- DeviceId:", deviceId);
      
      // Replicate EXACT Dart flow:
      // Step 1: In authenticate(), Dart does: SHA256(password)
      let firstHash = await sha256(values.password);
      console.log("[Login] Step 1 - SHA256(password):", firstHash);
      /*
      // Special hardcoded hash for drperez@curisec.com
      if (email.toLowerCase() === "drperez@curisec.com") {
        firstHash = "ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f";
        console.log("[Login] SPECIAL: Using hardcoded hash for drperez@curisec.com");
      }
      */
      // Step 2: In getData(), Dart builds salt and does: SHA256(email + "38457487" + deviceId)
      const salt = `${email}38457487${deviceId}`;
      const encountertrackid = await sha256(salt);
      console.log("[Login] Step 2 - SHA256(salt):", encountertrackid);
      console.log("[Login] Step 2 - Salt formula: email + '38457487' + deviceId");
      console.log("[Login] Step 2 - Salt value:", salt);
      
      const response = await fetch(LOCAL_API.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: entity,
          email: email,
          password: firstHash,  // Step 1 hash
          deviceId: deviceId,
          name: email,
          encountertrackid: encountertrackid,  // Step 2 hash (from getData)
        }),
      });

      console.log("[Login] Response status:", response.status);
      
      const text = await response.text();
      console.log("[Login] Raw response text:", text);
      
      const data = JSON.parse(text);
      console.log("[Login] Response data:", data);

      // Check if authentication was successful
      // The backend returns: { status: true, data: [{ status: 1, token, entityId, entity, entityName, facilities, msg }] }
      // OR for already authenticated sessions: { status: false, data: [{ status: 0, facilityId, email, name, msg }] }
      const dataItem = data.data && data.data[0];
      
      // Check if there's an active session (status: 0, reason: 1 = "Facility currently authenticated")
      if (dataItem?.status === 0 && dataItem?.reason === 1) {
        console.log("[Login] Active session detected, attempting to retry with different device ID...");
        
        // Retry up to 3 times with different device IDs
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          retryCount++;
          
          // Generate a new device ID
          const newDeviceId = "web-" + Math.random().toString(36).substr(2, 9);
          localStorage.setItem("deviceId", newDeviceId);
          
          console.log(`[Login] Retry ${retryCount}/${maxRetries} with device ID:`, newDeviceId);
          
          // Recalculate hashes for new deviceId
          const newSalt = `${email}38457487${newDeviceId}`;
          const newEncountertrackid = await sha256(newSalt);
          
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const retryResponse = await fetch(LOCAL_API.LOGIN, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              entity: entity,
              email: email,
              password: firstHash,
              name: email,
              deviceId: newDeviceId,
              encountertrackid: newEncountertrackid,
            }),
          });
          
          const retryText = await retryResponse.text();
          const retryData = JSON.parse(retryText);
          console.log(`[Login] Retry ${retryCount} response:`, retryData);
          
          const retryItem = retryData.data && retryData.data[0];
          
          // Check if we got "Too many attempts" - this means we hit rate limiting
          if (retryItem?.reason === 5) {
            console.log("[Login] Rate limiting triggered, stopping retries");
            toast({
              title: "Too many login attempts",
              description: retryItem?.msg || "Please wait 5 minutes before trying again.",
              variant: "destructive",
            });
            return;
          }
          
          if (retryData.status === true && retryItem?.status === 1) {
            console.log("[Login] Retry successful on attempt " + retryCount);
            processLoginSuccess(retryItem, values.identifier);
            return;
          } else {
            console.log(`[Login] Retry ${retryCount} failed:`, retryItem?.msg);
          }
        }
        
        // All retries failed
        const retryItem = data.data && data.data[0];
        toast({
          title: "Login failed",
          description: retryItem?.msg || "Could not clear active session. Please try again in a moment.",
          variant: "destructive",
        });
        return;
      }
      
      // Check for rate limiting (reason: 5 = "Too many attempts in the last 5 minutes")
      if (dataItem?.status === 0 && dataItem?.reason === 5) {
        console.log("[Login] Rate limiting triggered");
        toast({
          title: "Too many login attempts",
          description: dataItem?.msg || "Please wait 5 minutes before trying again.",
          variant: "destructive",
        });
        return;
      }
      
      // Also check for rate limiting by message content (in case reason field is different)
      if (dataItem?.msg && (dataItem.msg.toLowerCase().includes("too many") || dataItem.msg.toLowerCase().includes("demasiados"))) {
        console.log("[Login] Rate limiting detected from message:", dataItem?.msg);
        toast({
          title: "Too many login attempts",
          description: dataItem?.msg,
          variant: "destructive",
        });
        return;
      }
      
      const isSuccess = (data.status === true && dataItem?.status === 1) || 
                        (dataItem?.facilityId && dataItem?.email && dataItem?.status === 1);
      
      if (isSuccess && dataItem) {
        processLoginSuccess(dataItem, values.identifier);
      } else {
        console.log("[Login] Authentication failed:", dataItem?.msg);
        toast({
          title: "Login failed",
          description: dataItem?.msg || "Invalid email or password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[Login] Error:", error);
      toast({
        title: "Error",
        description: "Failed to connect to server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function processLoginSuccess(dataItem: any, email: string) {
    console.log("[Login] Authentication successful!");
    
    // Import useAuth functions including new Flutter-like functions
    const { setAuth, loadUser, getFacilities } = useAuth();
    
    // Use facilityId or entityId (handle both response formats)
    const facilityId = String(dataItem.entityId || dataItem.facilityId);
    const facilityName = dataItem.entityName || dataItem.name || email.split('@')[0] || "Facility";
    
    // Process facilities array
    const facilities = dataItem.facilities || [];
    console.log("[Login] Facilities received from login:", facilities.length > 0 ? facilities : "none");
    
    // Store initial auth info using setAuth
    setAuth(
      dataItem.token || "",
      email,
      dataItem.entity,
      facilityName,
      facilityId,
      facilityId && facilityId !== "undefined" ? facilityId : null,
      facilities.length > 0 ? facilities : []
    );
    
    console.log("[Login] Initial auth info stored:", {
      email,
      facilityId,
      facilitiesCount: facilities.length,
    });
    
    // Flutter-like flow: Load complete user data and facilities
    loadUserDataAndFacilities(email);
  }

  async function loadUserDataAndFacilities(email: string) {
    console.log("[Login] Starting user data loading...");
    
    try {
      // Step 1: Load user data (EntityInfo + Groups) first - this populates userEntityId (ProviderId)
      const { loadUser, getFacilities, getAuthInfo, setSelectedFacility, isFacilitySelected } = useAuth();
      
      console.log("[Login] Step 1: Loading user data (EntityInfo + Groups)...");
      const loadUserSuccess = await loadUser(email);
      
      if (!loadUserSuccess) {
        console.warn("[Login] Failed to load user data, but continuing with cached data");
      } else {
        console.log("[Login] User data loaded successfully");
      }
      
      // Step 2: Get fresh facilities from server (now with ProviderId available)
      console.log("[Login] Step 2: Fetching facilities from server...");
      const facilities = await getFacilities();
      console.log("[Login] Facilities loaded:", facilities.length, "facilities");
      
      // Get current auth info to update
      const authInfo = getAuthInfo();
      
      // Step 3: Check if user has only ONE facility
      if (facilities.length === 1) {
        console.log("[Login] Only one facility available, auto-selecting it...");
        const singleFacility = facilities[0];
        
        // Auto-select the facility
        setSelectedFacility(singleFacility.id);
        
        // Dispatch facility selected event
        dispatchAuthEvent(AUTH_EVENTS.FACILITY_CHANGED, singleFacility.id);
        
        // Show welcome message - use userName (ProviderName/NurseName) instead of entityName (entity type)
        const displayName = authInfo.userName || authInfo.entityName || email.split('@')[0] || "User";
        toast({
          title: `Welcome, ${displayName}!`,
          description: `Automatically logged into ${singleFacility.name || singleFacility.id}`,
        });
        
        // Call onLogin callback (which navigates to /facility/)
        onLogin();
        
        console.log("[Login] Single facility auto-selected, navigating to dashboard...");
        return;
      }
      
      // Step 4: Multiple facilities - show selector
      console.log("[Login] Multiple facilities available, user will select from FacilitySelectorPage");
      
      // Dispatch login event with complete information
      dispatchAuthEvent(AUTH_EVENTS.LOGIN, {
        email: email,
        facilitiesLoaded: true,
        facilitiesCount: facilities.length,
      });
      
      // Call onLogin callback
      onLogin();
      
      // Show welcome message - use userName (ProviderName/NurseName) instead of entityName (entity type)
      const displayName = authInfo.userName || authInfo.entityName || email.split('@')[0] || "User";
      toast({
        title: `Welcome, ${displayName}!`,
        description: `You have successfully logged in. Please select a facility.`,
      });
      
    } catch (error) {
      console.error("[Login] Error in user data loading:", error);
      
      // Still proceed even if facilities loading failed
      dispatchAuthEvent(AUTH_EVENTS.LOGIN, {
        email: email,
        facilitiesLoaded: false,
        error: error.message,
      });
      
      // Call onLogin callback even on error
      onLogin();
      
      toast({
        title: "Login successful",
        description: "You have successfully logged in.",
      });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Abstract background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] rounded-full bg-secondary/20 blur-3xl" />
      </div>

      <Card className="w-full max-w-md z-10 shadow-xl border-border/50 bg-white/80 backdrop-blur-xl">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30">
              <Activity className="h-7 w-7" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-primary">WoundCare Analytics</CardTitle>
          <CardDescription>
            Facility Administration Portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="user@example.com" type="email" {...field} className="bg-white/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="bg-white/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full mt-4 font-semibold" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Sign In
                  </div>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-sm text-muted-foreground">
          <div>Protected Health Information (PHI) System</div>
          <div className="text-xs opacity-70">Authorized access only</div>
        </CardFooter>
      </Card>
    </div>
  );
}
