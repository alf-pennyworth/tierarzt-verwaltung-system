
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

const OwnerLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("login");
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for redirects from main app
  useEffect(() => {
    // Check if there's a session and if it's not an owner, redirect to main app
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // If user is not an owner, redirect to main app
        if (session.user?.user_metadata?.role !== 'owner') {
          window.location.href = '/';
        }
      }
    };

    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Check if user has owner role
      if (data.user?.user_metadata?.role !== 'owner') {
        // If not owner, redirect to main app
        window.location.href = '/';
        return;
      }
      
      navigate("/owner/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Anmeldung fehlgeschlagen",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Registrierung",
      description: "Bitte wenden Sie sich an Ihre Tierarztpraxis, um einen Zugang zu erhalten.",
    });
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Tierbesitzer Portal</CardTitle>
          <CardDescription className="text-center">
            Melden Sie sich an, um auf Ihre Termine und die Gesundheitsdaten Ihres Tieres zuzugreifen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Anmelden</TabsTrigger>
              <TabsTrigger value="register">Registrieren</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Passwort</Label>
                  <Input 
                    id="password" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Anmeldung...
                    </>
                  ) : "Anmelden"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegistration} className="space-y-4 mt-4">
                <p className="text-center text-muted-foreground">
                  Um sich zu registrieren, wenden Sie sich bitte an Ihre Tierarztpraxis.
                  Diese wird Ihnen einen Einladungslink zusenden.
                </p>
                <Button type="submit" className="w-full">
                  Mehr Information
                </Button>
              </form>
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
