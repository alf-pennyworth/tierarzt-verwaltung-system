import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { TAMGDashboard, AntibioticForm, BVLExport } from "@/components/tamg";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, FileSpreadsheet, PlusCircle } from "lucide-react";

const TAMG = () => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const practiceId = userInfo?.praxisId || '';
  const vetId = userInfo?.id || '';
  
  // Determine active tab from path
  const path = location.pathname;
  const defaultTab = path.includes('/tamg/new') ? 'new' 
    : path.includes('/tamg/export') ? 'export' 
    : 'dashboard';

  const handleTabChange = (value: string) => {
    switch (value) {
      case 'new':
        navigate('/tamg/new');
        break;
      case 'export':
        navigate('/tamg/export');
        break;
      default:
        navigate('/tamg');
    }
  };

  if (!practiceId) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              Keine Praxis zugeordnet. Bitte melden Sie sich an oder kontaktieren Sie den Support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">TAMG Antibiotika-Verwaltung</h1>
          <p className="text-muted-foreground">
            Dokumentation und BVL-Meldung nach TAMG-Vorgaben
          </p>
        </div>
      </div>

      <Tabs value={defaultTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Neue Verschreibung
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            BVL-Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <TAMGDashboard practiceId={practiceId} />
        </TabsContent>

        <TabsContent value="new" className="mt-6">
          <Card>
            <Card>
              <CardContent className="p-6">
                <AntibioticForm 
                  practiceId={practiceId} 
                  vetId={vetId}
                  onSuccess={() => navigate('/tamg')}
                  onCancel={() => navigate('/tamg')}
                />
              </CardContent>
            </Card>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="mt-6">
          <BVLExport practiceId={practiceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TAMG;