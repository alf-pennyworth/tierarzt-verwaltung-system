
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MessageSquare, Video, PawPrint, User, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const OwnerDashboard = () => {
  const [ownerName, setOwnerName] = useState<string>("");
  const navigate = useNavigate();
  
  useEffect(() => {
    // Fetch owner information
    const fetchOwnerInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Get owner details from the besitzer table using the auth_id
        const { data, error } = await supabase
          .from('besitzer')
          .select('name')
          .eq('auth_id', user.id)
          .single();
          
        if (data) {
          setOwnerName(data.name);
        }
      }
    };
    
    fetchOwnerInfo();
  }, []);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/owner');
  };

  return (
    <div className="container p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tierbesitzer Portal</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm hidden sm:inline">{ownerName}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Abmelden</span>
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PawPrint className="h-5 w-5 mr-2" />
              Meine Tiere
            </CardTitle>
            <CardDescription>Gesundheitsdaten und Profile Ihrer Tiere</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => toast({ title: "Funktionalität in Entwicklung" })}>
              Tiere anzeigen
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Termine
            </CardTitle>
            <CardDescription>Kommende und vergangene Termine</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => toast({ title: "Funktionalität in Entwicklung" })}>
              Termine verwalten
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Video className="h-5 w-5 mr-2" />
              Videosprechstunden
            </CardTitle>
            <CardDescription>Online-Konsultationen mit Tierärzten</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => toast({ title: "Funktionalität in Entwicklung" })}>
              Videosprechstunden anzeigen
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Nachrichten
            </CardTitle>
            <CardDescription>Kommunikation mit der Praxis</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => toast({ title: "Funktionalität in Entwicklung" })}>
              Nachrichten anzeigen
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OwnerDashboard;
