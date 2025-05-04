
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Define form schemas with validation
const loginSchema = z.object({
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein"),
  password: z.string().min(6, "Das Passwort muss mindestens 6 Zeichen lang sein"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Der Name muss mindestens 2 Zeichen lang sein"),
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein"),
  password: z.string().min(6, "Das Passwort muss mindestens 6 Zeichen lang sein"),
  passwordConfirm: z.string().min(6, "Das Passwort muss mindestens 6 Zeichen lang sein"),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Die Passwörter stimmen nicht überein",
  path: ["passwordConfirm"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

interface InvitationData {
  valid: boolean;
  owner_id?: string;
  owner_name?: string;
  owner_email?: string;
  praxis_id?: string;
  message?: string;
}

// Define the response type for the verify_owner_invitation RPC function
interface VerifyInvitationResponse {
  valid: boolean;
  owner_id?: string;
  owner_name?: string;
  owner_email?: string;
  praxis_id?: string;
  message?: string;
}

// Define the input params type for the verify_owner_invitation RPC function
interface VerifyInvitationParams {
  token_param: string;
}

// Define the input params type for the complete_owner_registration RPC function
interface CompleteRegistrationParams {
  token_param: string;
  auth_id_param: string;
}

const OwnerLogin = () => {
  const [loading, setLoading] = useState(false);
  const [validateTokenLoading, setValidateTokenLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("login");
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Form setup
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    }
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirm: "",
    }
  });

  // Check for token in URL and verify it
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    
    if (token) {
      setInvitationToken(token);
      verifyInvitationToken(token);
    }
  }, [location]);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // If user is logged in but not an owner, redirect to main app
        if (session.user?.user_metadata?.role !== 'owner') {
          window.location.href = '/';
        } else {
          // If owner is already logged in, redirect to dashboard
          navigate("/owner/dashboard");
        }
      }
    };

    checkSession();
  }, [navigate]);

  // Verify invitation token
  const verifyInvitationToken = async (token: string) => {
    setValidateTokenLoading(true);
    
    try {
      const { data, error } = await supabase.rpc<VerifyInvitationResponse, VerifyInvitationParams>(
        'verify_owner_invitation',
        { token_param: token }
      );
      
      if (error || !data?.valid) {
        toast({
          variant: "destructive",
          title: "Ungültiger Einladungslink",
          description: data?.message || "Dieser Link ist ungültig oder abgelaufen."
        });
        return;
      }
      
      // Set the invitation data
      setInvitationData(data as InvitationData);
      
      // Pre-fill the registration form
      if (data.owner_name) {
        registerForm.setValue("name", data.owner_name);
      }
      
      if (data.owner_email) {
        registerForm.setValue("email", data.owner_email);
      }
      
      // Switch to registration tab
      setActiveTab("register");
    } catch (err: any) {
      console.error("Error verifying invitation:", err);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Beim Überprüfen der Einladung ist ein Fehler aufgetreten."
      });
    } finally {
      setValidateTokenLoading(false);
    }
  };

  const handleLogin = async (values: LoginFormValues) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      
      if (error) throw error;
      
      // Check if user has owner role
      if (data.user?.user_metadata?.role !== 'owner') {
        window.location.href = '/';
        return;
      }
      
      navigate("/owner/dashboard");
    } catch (error: any) {
      let errorMessage = "Ungültige Anmeldedaten oder Benutzer existiert nicht.";
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        variant: "destructive",
        title: "Anmeldung fehlgeschlagen",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleRegistration = async (values: RegisterFormValues) => {
    // If no invitation token, show info message
    if (!invitationToken) {
      toast({
        title: "Registrierung",
        description: "Bitte wenden Sie sich an Ihre Tierarztpraxis, um einen Zugang zu erhalten.",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Register the user with owner role
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.name,
            role: 'owner'
          }
        }
      });
      
      if (error) throw error;
      
      if (!data.user) {
        throw new Error("Benutzer konnte nicht erstellt werden");
      }
      
      // Complete registration by linking the auth account to the owner record
      const { data: completionData, error: completionError } = await supabase.rpc<boolean, CompleteRegistrationParams>(
        'complete_owner_registration',
        {
          token_param: invitationToken,
          auth_id_param: data.user.id
        }
      );
      
      if (completionError || !completionData) {
        throw new Error("Fehler bei der Verknüpfung des Kontos mit Ihrem Besitzer-Profil");
      }
      
      toast({
        title: "Registrierung erfolgreich",
        description: "Ihr Konto wurde erfolgreich erstellt. Sie können sich jetzt anmelden.",
      });
      
      // Switch to login tab after successful registration
      setActiveTab("login");
      loginForm.setValue("email", values.email);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registrierung fehlgeschlagen",
        description: error.message || "Bei der Registrierung ist ein Fehler aufgetreten.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (validateTokenLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Einladung wird überprüft</CardTitle>
            <CardDescription className="text-center">
              Bitte warten Sie, während Ihre Einladung überprüft wird.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Tierbesitzer Portal</CardTitle>
          <CardDescription className="text-center">
            {invitationData?.valid 
              ? `Willkommen! Bitte erstellen Sie Ihr Konto.`
              : `Melden Sie sich an, um auf Ihre Termine und die Gesundheitsdaten Ihres Tieres zuzugreifen.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {!invitationData?.valid && (
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Anmelden</TabsTrigger>
                <TabsTrigger value="register">Registrieren</TabsTrigger>
              </TabsList>
            )}
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4 mt-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-Mail</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="name@example.com" 
                            type="email"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passwort</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Anmeldung...
                      </>
                    ) : "Anmelden"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(handleRegistration)} className="space-y-4 mt-4">
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Max Mustermann"
                            disabled={!!invitationData?.owner_name}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-Mail</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="name@example.com" 
                            type="email"
                            disabled={!!invitationData?.owner_email}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passwort</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="passwordConfirm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passwort bestätigen</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registrierung...
                      </>
                    ) : "Registrieren"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-center w-full text-muted-foreground">
            Bitte kontaktieren Sie Ihre Tierarztpraxis, wenn Sie ein Konto einrichten möchten oder Probleme beim Anmelden haben.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OwnerLogin;
