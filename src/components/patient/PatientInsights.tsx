
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Package, Stethoscope, Video } from 'lucide-react';
import { getPatientInsights } from '@/services/crossModuleIntegration';
import { useNavigate } from 'react-router-dom';

interface PatientInsightsProps {
  patientId: string;
}

const PatientInsights = ({ patientId }: PatientInsightsProps) => {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const data = await getPatientInsights(patientId);
        setInsights(data);
      } catch (error) {
        console.error('Error fetching insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [patientId]);

  if (loading) {
    return <div>Lade Patienteneinblicke...</div>;
  }

  if (!insights) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Behandlungen</CardTitle>
          <Stethoscope className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{insights.totalTreatments}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Termine</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{insights.totalAppointments}</div>
          {insights.nextAppointment && (
            <p className="text-xs text-muted-foreground">
              Nächster: {new Date(insights.nextAppointment.start_time).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Konsultationen</CardTitle>
          <Video className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{insights.totalConsultations}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Medikamente</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Object.keys(insights.medicationsUsed).length}
          </div>
          <p className="text-xs text-muted-foreground">
            Verschiedene Typen
          </p>
        </CardContent>
      </Card>

      {Object.keys(insights.medicationsUsed).length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Häufig verwendete Medikamente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(insights.medicationsUsed as Record<string, number>).map(([med, count]) => (
                <Badge key={med} variant="secondary">
                  {med} ({count}x)
                </Badge>
              ))}
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2"
              onClick={() => navigate('/inventory/medications')}
            >
              Lagerbestand prüfen
            </Button>
          </CardContent>
        </Card>
      )}

      {Object.keys(insights.commonDiagnoses).length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Häufige Diagnosen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(insights.commonDiagnoses as Record<string, number>).map(([diag, count]) => (
                <Badge key={diag} variant="outline">
                  {diag} ({count}x)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PatientInsights;
