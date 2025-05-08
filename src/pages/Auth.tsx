import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

// This interface defines the shape of invite data
interface InviteData {
  email: string;
  praxis_id: string;
  praxis_name: string;
}

// Define the expected return type for the verify_invite RPC
interface VerifyInviteResponse {
  token: string;
  email: string;
  praxis_id: string;
  praxis_name: string;
  expires_at: string;
  is_used: boolean | null;
}

// Define the expected return type for owner invitations
interface VerifyOwnerInviteResponse {
  valid: boolean;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  praxis_id: string;
  message?: string;
}

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [inviteType, setInviteType] = useState<"vet" | "owner" | null>(null);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    vorname: "",
    nachname: "",
    praxisName: "",
  });

  useEffect(() => {
    // Check for invite token in URL query params
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const type = params.get("type");
    
    if (token) {
      setIsLoading(true);
      setInviteToken(token);
      
      // Set the invite type based on URL parameter
      if (type === "owner-invitation") {
        setInviteType("owner");
        verifyOwnerInviteToken(token)
          .then(data => {
            if (data) {
              setInviteData(data);
              setActiveTab("register");
              toast({
                title: "Besitzereinladung gefunden",
                description: `Sie wurden eingeladen, ein Besitzerkonto zu erstellen.`,
              });
            }
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        // Default to vet invitation
        setInviteType("vet");
        verifyInviteToken(token)
          .then(data => {
            if (data) {
              setInviteData(data);
              setActiveTab("register");
              toast({
                title: "Einladung gefunden",
                description: `Sie wurden eingeladen, ${data.praxis_name} beizutreten.`,
              });
            }
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    }
  }, [location, toast]);

  // Function to verify vet invitation token
  const verifyInviteToken = async (token: string): Promise<InviteData | null> => {
    try {
      // Call a stored procedure to verify and get invite data
      const { data: inviteResponse, error } = await supabase.rpc('verify_invite', { 
        token_param: token 
      });

      if (error || !inviteResponse) {
        console.error("Error verifying token:", error);
        toast({
          variant: "destructive",
          title: "Ungültiger Einladungslink",
          description: "Der Einladungslink ist ungültig oder abgelaufen.",
        });
        return null;
      }

      // Cast the response through unknown first to avoid direct conversion error
      const inviteData = inviteResponse as unknown as VerifyInviteResponse;
      
      // Pre-fill the email field
      setFormData(prev => ({
        ...prev,
        email: inviteData.email
      }));

      return {
        praxis_id: inviteData.praxis_id,
        praxis_name: inviteData.praxis_name,
        email: inviteData.email
      };
      
    } catch (error) {
      console.error("Error verifying invite token:", error);
      toast({
        variant: "destructive",
        title: "Fehler beim Überprüfen der Einladung",
        description: "Bitte versuchen Sie es später erneut."
      });
      return null;
    }
  };

  // Function to verify owner invitation token
  const verifyOwnerInviteToken = async (token: string): Promise<InviteData | null> => {
    try {
      // Call the owner-specific RPC to verify the invitation
      const { data: inviteResponse, error } = await supabase.rpc('verify_owner_invitation', { 
        token_param: token 
      });

      if (error) {
        console.error("Error verifying owner token:", error);
        toast({
          variant: "destructive",
          title: "Ungültiger Einladungslink",
          description: "Der Besitzer-Einladungslink ist ungültig oder abgelaufen.",
        });
        return null;
      }

      // Cast the response through unknown first to avoid direct conversion error
      const ownerInviteData = inviteResponse as unknown as VerifyOwnerInviteResponse;
      
      if (!ownerInviteData.valid) {
        toast({
          variant: "destructive",
          title: "Ungültiger Einladungslink",
          description: ownerInviteData.message || "Der Besitzer-Einladungslink ist ungültig oder abgelaufen.",
        });
        return null;
      }
      
      // Pre-fill the email field
      setFormData(prev => ({
        ...prev,
        email: ownerInviteData.owner_email
      }));

      return {
        praxis_id: ownerInviteData.praxis_id,
        praxis_name: "", // Owner registrations don't need a praxis name
        email: ownerInviteData.owner_email
      };
      
    } catch (error) {
      console.error("Error verifying owner invite token:", error);
      toast({
        variant: "destructive",
        title: "Fehler beim Überprüfen der Besitzer-Einladung",
        description: "Bitte versuchen Sie es später erneut."
      });
      return null;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Handle different registration types
      if (inviteType === "owner" && inviteToken) {
        // Owner registration flow
        console.log("Starting owner registration with token:", inviteToken);

        // Sign up the owner with metadata that includes the role
        const { data: authData, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              vorname: formData.vorname,
              nachname: formData.nachname,
              role: 'owner' // Assign owner role
            },
          },
        });

        if (error) {
          throw error;
        }

        console.log("Owner signed up:", authData.user?.id);
        
        if (authData.user) {
          // Call function to complete owner registration and link with besitzer record
          const { data: linkResult, error: linkError } = await supabase.rpc('complete_owner_registration', {
            token_param: inviteToken,
            auth_id_param: authData.user.id
          });
          
          if (linkError) {
            console.error("Error linking owner account:", linkError);
            toast({
              variant: "destructive",
              title: "Fehler bei der Verknüpfung",
              description: "Ihr Konto wurde erstellt, konnte aber nicht mit Ihrem Besitzerprofil verknüpft werden."
            });
          } else {
            console.log("Owner account linked successfully");
            toast({
              title: "Registrierung erfolgreich",
              description: "Ihr Besitzerkonto wurde erfolgreich erstellt. Sie können sich jetzt anmelden."
            });
          }
        }
      } else if (inviteType === "vet" && inviteToken && inviteData) {
        // Vet invitation registration (existing flow)
        console.log("Registering invited vet with praxis_id:", inviteData.praxis_id);

        // Sign up the invited vet with metadata that includes the praxis ID
        const { data: authData, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              vorname: formData.vorname,
              nachname: formData.nachname,
              praxis_id: inviteData.praxis_id, // Store praxis ID in metadata
              is_admin: false, // Invited vets are not admins by default
              role: 'vet' // Assign vet role
            },
          },
        });

        if (error) {
          throw error;
        }

        console.log("Invited user signed up:", authData.user?.id);
        console.log("User metadata:", authData.user?.user_metadata);

        // Manually create the profile for invited vet
        if (authData.user) {
          console.log("Creating profile for invited vet with praxis_id:", inviteData.praxis_id);
          
          const { error: profileError } = await supabase
            .from("profiles")
            .insert([
              { 
                id: authData.user.id,
                vorname: formData.vorname,
                nachname: formData.nachname,
                email: formData.email,
                praxis_id: inviteData.praxis_id
              }
            ]);

          if (profileError) {
            console.error("Error creating profile:", profileError);
            // Don't throw here, as the user is already created
          } else {
            console.log("Created profile for invited vet");
          }
        }

        // Mark the invite as used by calling a stored procedure
        if (inviteToken) {
          await supabase.rpc('mark_invite_used', { token_param: inviteToken });
          console.log("Marked invite as used");
        }

        toast({
          title: "Registrierung erfolgreich",
          description: "Bitte überprüfen Sie Ihre E-Mails für die Bestätigung.",
        });
      } else if (!inviteToken) {
        // New praxis registration (existing flow)
        console.log("Creating new praxis:", formData.praxisName);
        
        // 1. Create the praxis first
        const { data: praxisData, error: praxisError } = await supabase
          .from("praxis")
          .insert([
            { name: formData.praxisName }
          ])
          .select("id")
          .single();

        if (praxisError) {
          throw praxisError;
        }

        const praxisId = praxisData.id;
        console.log("Created new praxis with ID:", praxisId);

        // 2. Sign up the user with metadata that includes the praxis ID
        const { data: authData, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              vorname: formData.vorname,
              nachname: formData.nachname,
              praxis_id: praxisId, // Store praxis ID in metadata
              is_admin: true, // First user is admin
              role: 'vet' // Assign vet role
            },
          },
        });

        if (error) {
          throw error;
        }

        console.log("User signed up:", authData.user?.id);
        console.log("User metadata:", authData.user?.user_metadata);

        // 3. Manually create the profile to ensure it's properly linked to both user and praxis
        if (authData.user) {
          console.log("Creating profile with praxis_id:", praxisId);
          
          // Try using the service role client which bypasses RLS
          const { error: profileError } = await supabase
            .from("profiles")
            .insert([
              { 
                id: authData.user.id,
                vorname: formData.vorname,
                nachname: formData.nachname,
                email: formData.email,
                praxis_id: praxisId
              }
            ]);

          if (profileError) {
            console.error("Error creating profile:", profileError);
            // Don't throw here, as the user and praxis are already created
          } else {
            console.log("Created profile for user with praxis_id:", praxisId);
          }
        }

        toast({
          title: "Praxis registriert",
          description: "Bitte überprüfen Sie Ihre E-Mails für die Bestätigung.",
        });
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        variant: "destructive",
        title: "Fehler bei der Registrierung",
        description: error.message || "Ein unbekannter Fehler ist aufgetreten",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        throw error;
      }

      console.log("Login successful, user metadata:", data.user?.user_metadata);

      // Check user role in metadata and redirect accordingly
      if (data.user?.user_metadata?.role === 'owner') {
        navigate('/owner/dashboard');
      } else {
        // Default to main app for vets or undefined roles
        navigate('/');
      }
      
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Fehler beim Login",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check for existing session and redirect based on role
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log("Session found, user metadata:", session.user.user_metadata);
        // Check user role in metadata and redirect accordingly
        if (session.user.user_metadata?.role === 'owner') {
          navigate('/owner/dashboard');
        } else {
          // Default to main app for vets or undefined roles
          navigate('/');
        }
      }
    };
    
    checkSession();
  }, [navigate]);

  if (isLoading && !inviteData && inviteToken) {
    return (
      <div className="container flex items-center justify-center min-h-screen py-10">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p>Einladung wird überprüft...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Willkommen</CardTitle>
          <CardDescription>
            {inviteData 
              ? inviteType === "owner"
                ? "Erstellen Sie Ihr Besitzerkonto"
                : `Erstellen Sie Ihren Account für ${inviteData.praxis_name}`
              : "Melden Sie sich an oder erstellen Sie ein Konto"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue={activeTab} 
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            {!inviteData && (
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Registrieren</TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m.mustermann@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Passwort</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, password: e.target.value }))
                    }
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird geladen...
                    </>
                  ) : (
                    "Anmelden"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vorname">Vorname</Label>
                  <Input
                    id="vorname"
                    placeholder="Max"
                    value={formData.vorname}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, vorname: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nachname">Nachname</Label>
                  <Input
                    id="nachname"
                    placeholder="Mustermann"
                    value={formData.nachname}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nachname: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="m.mustermann@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    required
                    disabled={!!inviteData}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Passwort</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, password: e.target.value }))
                    }
                    required
                  />
                </div>
                
                {!inviteData && (
                  <div className="space-y-2">
                    <Label htmlFor="praxisName">Praxisname</Label>
                    <Input
                      id="praxisName"
                      placeholder="Tierklinik Beispiel"
                      value={formData.praxisName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, praxisName: e.target.value }))
                      }
                      required
                    />
                  </div>
                )}
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird geladen...
                    </>
                  ) : (
                    "Registrieren"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
