
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
import { Json } from "@/integrations/supabase/types";

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

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  
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
    
    if (token) {
      setIsLoading(true);
      setInviteToken(token);
      
      // Verify the invite token
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
  }, [location, toast]);

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // If this is a clinic registration (no invite token)
      if (!inviteToken) {
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

        // 2. Sign up the user
        const { data: authData, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              vorname: formData.vorname,
              nachname: formData.nachname,
              praxis_id: praxisData.id, // Assign the new praxis
              is_admin: true, // First user is admin
            },
          },
        });

        if (error) {
          throw error;
        }

        // 3. Manually create the profile to ensure it's properly linked to both user and praxis
        if (authData.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .insert([
              { 
                id: authData.user.id,
                vorname: formData.vorname,
                nachname: formData.nachname,
                email: formData.email,
                praxis_id: praxisData.id
              }
            ]);

          if (profileError) {
            console.error("Error creating profile:", profileError);
            // Don't throw here, as the user is already created
          }
        }

        toast({
          title: "Praxis registriert",
          description: "Bitte überprüfen Sie Ihre E-Mails für die Bestätigung.",
        });
      } else {
        // If this is a vet registration via invite
        if (!inviteData) {
          throw new Error("Einladungsdaten fehlen");
        }

        // Sign up the invited vet
        const { data: authData, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              vorname: formData.vorname,
              nachname: formData.nachname,
              praxis_id: inviteData.praxis_id,
              is_admin: false, // Invited vets are not admins by default
            },
          },
        });

        if (error) {
          throw error;
        }

        // Manually create the profile for invited vet
        if (authData.user) {
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
          }
        }

        // Mark the invite as used by calling a stored procedure
        if (inviteToken) {
          await supabase.rpc('mark_invite_used', { token_param: inviteToken });
        }

        toast({
          title: "Registrierung erfolgreich",
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
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        throw error;
      }

      navigate("/");
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
              ? `Erstellen Sie Ihren Account für ${inviteData.praxis_name}` 
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
