
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface OwnerRegistrationProps {
  email: string;
  token: string;
}

const OwnerRegistration = ({ email, token }: OwnerRegistrationProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: email,
    password: "",
    vorname: "",
    nachname: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Sign up the owner with owner role
      const { data: authData, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            vorname: formData.vorname,
            nachname: formData.nachname,
            role: 'owner'
          },
        },
      });

      if (error) {
        throw error;
      }

      console.log("Owner signed up:", authData.user?.id);
      
      if (authData.user) {
        // Link the auth account with the besitzer record
        const { data: linkResult, error: linkError } = await supabase.rpc('complete_owner_registration', {
          token_param: token,
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
          toast({
            title: "Registrierung erfolgreich",
            description: "Ihr Besitzerkonto wurde erfolgreich erstellt. Sie können sich jetzt anmelden."
          });
          
          // Redirect to owner login
          navigate('/owner');
        }
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        variant: "destructive",
        title: "Fehler bei der Registrierung",
        description: error.message || "Ein unbekannter Fehler ist aufgetreten"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          readOnly
          className="bg-gray-50"
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
            Wird registriert...
          </>
        ) : (
          "Registrieren"
        )}
      </Button>
    </form>
  );
};

export default OwnerRegistration;
