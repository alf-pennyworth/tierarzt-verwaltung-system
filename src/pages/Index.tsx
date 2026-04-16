import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, FileSpreadsheet, Pill, Stethoscope, User, FileAudio, Truck, Video, Users, ClipboardList, AlertCircle, Activity, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const MODULES = [
  {
    name: "Transkription",
    icon: FileAudio,
    route: "/patients",
    description: "Diktat und Transkription von Behandlungsnotizen",
  },
  {
    name: "Terminplanung",
    icon: CalendarClock,
    route: "/appointments",
    description: "Termine planen und verwalten",
  },
  {
    name: "Abrechnung",
    icon: FileSpreadsheet,
    route: "/dashboard",
    description: "Rechnungsstellung und Abrechnung",
    comingSoon: true,
  },
  {
    name: "Bestandsverwaltung",
    icon: Truck,
    route: "/inventory",
    description: "Bestände und Lieferungen verwalten",
  },
  {
    name: "Rezeptverwaltung",
    icon: Pill,
    route: "/dashboard",
    description: "Verschreibungen und Rezepte",
    comingSoon: true,
  },
  {
    name: "Personalverwaltung",
    icon: User,
    route: "/dashboard",
    description: "Mitarbeiter und Dienstpläne",
    comingSoon: true,
  },
  {
    name: "Telemedizin",
    icon: Video,
    route: "/telemedizin",
    description: "Virtuelle Sprechstunden und Patientenkommunikation",
  },
  {
    name: "Patientenmanagement",
    icon: Stethoscope,
    route: "/patients",
    description: "Patientendaten und Behandlungen",
  },
];

interface DashboardStats {
  patientsCount: number;
  prescriptionsThisMonth: number;
  pendingBvlReports: number;
  recentActivities: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'patient' | 'prescription' | 'treatment';
  title: string;
  description: string;
  timestamp: string;
  route?: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userInfo?.praxisId) {
        setLoading(false);
        return;
      }

      try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfMonthStr = firstDayOfMonth.toISOString().split('T')[0];

        // Fetch patients count
        const { count: patientsCount } = await supabase
          .from('patient')
          .select('*', { count: 'exact', head: true })
          .eq('praxis_id', userInfo.praxisId)
          .is('deleted_at', null);

        // Fetch prescriptions this month
        const { count: prescriptionsThisMonth } = await supabase
          .from('antibiotic_prescriptions')
          .select('*', { count: 'exact', head: true })
          .eq('praxis_id', userInfo.praxisId)
          .gte('prescription_date', firstDayOfMonthStr)
          .is('deleted_at', null);

        // Fetch pending BVL reports
        const { count: pendingBvlReports } = await supabase
          .from('antibiotic_prescriptions')
          .select('*', { count: 'exact', head: true })
          .eq('praxis_id', userInfo.praxisId)
          .eq('bvl_reported', false)
          .is('deleted_at', null);

        // Fetch recent activities
        const { data: recentPrescriptions } = await supabase
          .from('antibiotic_prescriptions')
          .select('id, drug_name, prescription_date, animal_species')
          .eq('praxis_id', userInfo.praxisId)
          .is('deleted_at', null)
          .order('prescription_date', { ascending: false })
          .limit(5);

        const { data: recentPatients } = await supabase
          .from('patient')
          .select('id, name, species, created_at')
          .eq('praxis_id', userInfo.praxisId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5);

        const { data: recentTreatments } = await supabase
          .from('behandlungen')
          .select('id, diagnosis, treatment_date, patient_id, patient:patient_id(name)')
          .eq('praxis_id', userInfo.praxisId)
          .is('deleted_at', null)
          .order('treatment_date', { ascending: false })
          .limit(5);

        // Build activity list
        const activities: ActivityItem[] = [];

        // Add recent prescriptions
        (recentPrescriptions || []).forEach((p: any) => {
          activities.push({
            id: `presc-${p.id}`,
            type: 'prescription',
            title: `Verschreibung: ${p.drug_name}`,
            description: `Tierart: ${p.animal_species || 'Unbekannt'}`,
            timestamp: p.prescription_date,
            route: '/tamg',
          });
        });

        // Add recent patients
        (recentPatients || []).forEach((p: any) => {
          activities.push({
            id: `patient-${p.id}`,
            type: 'patient',
            title: `Neuer Patient: ${p.name}`,
            description: `Spezies: ${p.species || 'Unbekannt'}`,
            timestamp: p.created_at,
            route: `/patient/${p.id}`,
          });
        });

        // Add recent treatments
        (recentTreatments || []).forEach((t: any) => {
          activities.push({
            id: `treatment-${t.id}`,
            type: 'treatment',
            title: `Behandlung: ${(t as any).patient?.name || 'Unbekannt'}`,
            description: t.diagnosis || 'Keine Diagnose',
            timestamp: t.treatment_date,
            route: `/patient/${(t as any).patient_id}`,
          });
        });

        // Sort by timestamp
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setStats({
          patientsCount: patientsCount || 0,
          prescriptionsThisMonth: prescriptionsThisMonth || 0,
          pendingBvlReports: pendingBvlReports || 0,
          recentActivities: activities.slice(0, 10),
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userInfo?.praxisId]);

  const handleModuleClick = (module: typeof MODULES[0]) => {
    if (module.comingSoon) return;
    navigate(module.route);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Gerade eben';
    if (diffHours < 24) return `Vor ${diffHours} Std.`;
    if (diffDays < 7) return `Vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    return date.toLocaleDateString('de-DE');
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'prescription':
        return <Pill className="h-4 w-4 text-blue-500" />;
      case 'patient':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'treatment':
        return <Stethoscope className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-3xl font-bold">Veterinary Management System</h1>

      {/* Quick Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/patients')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Patienten</p>
                    <p className="text-3xl font-bold">{stats?.patientsCount ?? 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/tamg')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Verschreibungen diesen Monat</p>
                    <p className="text-3xl font-bold">{stats?.prescriptionsThisMonth ?? 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <ClipboardList className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/tamg')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Offene BVL-Meldungen</p>
                    <p className="text-3xl font-bold">{stats?.pendingBvlReports ?? 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertCircle className={`h-6 w-6 ${(stats?.pendingBvlReports ?? 0) > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
                  </div>
                </div>
                {(stats?.pendingBvlReports ?? 0) > 0 && (
                  <p className="text-xs text-amber-600 mt-2">Meldepflichtige Antibiotika-Gaben</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* TAMG Quick Access */}
      {(stats?.pendingBvlReports ?? 0) > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">
                    {stats?.pendingBvlReports} ausstehende BVL-Meldung{stats?.pendingBvlReports !== 1 ? 'en' : ''}
                  </p>
                  <p className="text-sm text-amber-600">
                    Antibiotika-Verschreibungen müssen gemäß TAMG gemeldet werden
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/tamg/export')}
                className="bg-amber-600 hover:bg-amber-700"
              >
                BVL-Export
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Letzte Aktivitäten
          </CardTitle>
          <CardDescription>Neueste Patienten, Behandlungen und Verschreibungen</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats?.recentActivities && stats.recentActivities.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => activity.route && navigate(activity.route)}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Keine Aktivitäten vorhanden</p>
              <p className="text-sm">Beginnen Sie mit dem Anlegen von Patienten oder Behandlungen</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module Navigation */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Module</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {MODULES.map((module) => (
            <Card 
              key={module.name}
              className={`cursor-pointer hover:shadow-md transition-all ${
                module.comingSoon ? "opacity-60" : ""
              }`}
              onClick={() => handleModuleClick(module)}
            >
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <module.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">{module.name}</h3>
                <p className="text-sm text-muted-foreground">{module.description}</p>
                {module.comingSoon && (
                  <span className="mt-3 px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                    Coming Soon
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;