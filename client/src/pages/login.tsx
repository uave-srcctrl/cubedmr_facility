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
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { LOCAL_API } from "@/lib/api-config";

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      // Facility login by email
      const email = values.identifier;
      const entity = "TryLoginFacilities";
      
      // Generate a device ID if not already in localStorage
      let deviceId = localStorage.getItem("deviceId");
      if (!deviceId) {
        deviceId = "web-" + Math.random().toString(36).substr(2, 9);
        localStorage.setItem("deviceId", deviceId);
      }

      console.log("[Login] Submitting facility login with email:", email, "- Entity:", entity, "- DeviceId:", deviceId);
      
      const response = await fetch(LOCAL_API.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: entity,
          email: email,
          password: values.password,
          name: email,
          deviceId: deviceId,
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
      const isSuccess = (data.status === true && dataItem?.status === 1) || 
                        (dataItem?.facilityId && dataItem?.email);
      
      if (isSuccess && dataItem) {
        console.log("[Login] Authentication successful or already active!");
        
        // Use facilityId or entityId (handle both response formats)
        const facilityId = String(dataItem.entityId || dataItem.facilityId);
        const facilityName = dataItem.entityName || dataItem.name || values.identifier.split('@')[0] || "Facility";
        
        // Store facility ID (must be string)
        if (facilityId && facilityId !== "undefined") {
          localStorage.setItem("userFacilityId", facilityId);
          localStorage.setItem("userEntityId", facilityId);
          console.log("[Login] Facility ID stored:", facilityId);
        }
        
        // Store token if present
        if (dataItem.token) {
          localStorage.setItem("authToken", dataItem.token);
          console.log("[Login] Token stored in localStorage");
        }
        
        // Store email for display purposes
        localStorage.setItem("userEmail", values.identifier);
        
        // Store facility info
        if (dataItem.entity) {
          localStorage.setItem("userEntity", dataItem.entity);
        }
        
        localStorage.setItem("userEntityName", facilityName);
        
        // Store accessible facilities list for authorization checks
        if (dataItem.facilities && Array.isArray(dataItem.facilities)) {
          localStorage.setItem("userFacilities", JSON.stringify(dataItem.facilities));
          console.log("[Login] Facilities list stored:", dataItem.facilities);
        }
        
        console.log("[Login] Facility info stored:", {
          entity: dataItem.entity,
          entityName: facilityName,
          facilityId: facilityId,
          facilities: dataItem.facilities,
        });
        
        onLogin();
        
        // Show welcome message with facility name
        toast({
          title: `Welcome, ${facilityName}!`,
          description: "You have successfully logged in.",
        });
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
                    <FormLabel>Facility Email</FormLabel>
                    <FormControl>
                      <Input placeholder="facility@example.com" type="email" {...field} className="bg-white/50" />
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
