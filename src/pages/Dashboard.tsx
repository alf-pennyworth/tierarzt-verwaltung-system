import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Users, Stethoscope, Pill, CalendarDays, Activity,
  TrendingUp, AlertTriangle, Plus, FileText, Clock,
  ArrowRight, Dog, Cat, Bird, Beef
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  getReportingDeadline, getDaysRemaining, isDeadlineUrgent,
  formatGermanDate,
} from "@/lib/bvl-deadlines";

interface DashboardData {
  totalPatients: number;
  newPatientsThisMonth: number;
  patientsBySpecies: { name: string; value: number; color: string }[];
  treatmentsThisMonth: number;
  commonDiagnoses: { name: string; count: number }[];
  topPrescribed: { name: string; count: number }[];
  lowStockItems: { id: string; name: string; current_stock: number; minimum_stock: number }[];
  recentActivity: ActivityItem[];
  appointmentsToday: number;
  appointmentsUpcoming: number;
  tamgPrescriptionsThisMonth: number;
}

interface ActivityItem {
  id: string;
  type: "patient" | "treatment" | "prescription" | "appointment" | "inventory";
  title: string;
  description: string;
  timestamp: string;
  route?: string;
}

const COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const SPECIES_ICONS: Record<string, React.ReactNode> = {
  Hund: <Dog className="h-4 w-4" />,
  Katze: <Cat className="h-4 w-4" />,
  Vogel: <Bird className="h-4 w-4" />,
  Rind: <Beef className="h-4 w-4" />,
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const bvlDeadline = useMemo(() => getReportingDeadline(), []);
  const bvlDaysRemaining = useMemo(() => getDaysRemaining(bvlDeadline.reportDeadline), [bvlDeadline]);
  const bvlUrgent = useMemo(() => isDeadlineUrgent(bvlDeadline.reportDeadline), [bvlDeadline]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userInfo?.praxisId) {
        setLoading(false);
        return;
      }

      try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfMonthStr = firstDayOfMonth.toISOString().split("T")[0];
        const todayStr = now.toISOString().split("T")[0];
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];
        const thirtyDaysLater = new Date(now);
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        const thirtyDaysLaterStr = thirtyDaysLater.toISOString().split("T")[0];

        // Total patients
        const { count: totalPatients } = await supabase
          .from("patient")
          .select("*", { count: "exact", head: true })
          .eq("praxis_id", userInfo.praxisId)
          .is("deleted_at", null);

        // New patients this month
        const { count: newPatientsThisMonth } = await supabase
          .from("patient")
          .select("*", { count: "exact", head: true })
          .eq("praxis_id", userInfo.praxisId)
          .is("deleted_at", null)
          .gte("created_at", firstDayOfMonthStr);

        // Patients by species
        const { data: speciesData } = await supabase
          .from("patient")
          .select("spezies")
          .eq("praxis_id", userInfo.praxisId)
          .is("deleted_at", null);

        const speciesCounts: Record<string, number> = {};
        (speciesData || []).forEach((p) => {
          const sp = p.spezies || "Unbekannt";
          speciesCounts[sp] = (speciesCounts[sp] || 0) + 1;
        });
        const patientsBySpecies = Object.entries(speciesCounts)
          .map(([name, value], i) => ({
            name,
            value,
            color: COLORS[i % COLORS.length],
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6);

        // Treatments this month
        const { count: treatmentsThisMonth } = await supabase
          .from("behandlungen")
          .select("*", { count: "exact", head: true })
          .eq("praxis_id", userInfo.praxisId)
          .is("deleted_at", null)
          .gte("untersuchung_datum", firstDayOfMonthStr);

        // Common diagnoses
        const { data: diagnosesData } = await supabase
          .from("behandlungen")
          .select("diagnose_fallback, diagnose:diagnose_id(diagnose)")
          .eq("praxis_id", userInfo.praxisId)
          .is("deleted_at", null)
          .gte("untersuchung_datum", firstDayOfMonthStr)
          .not("diagnose_fallback", "is", null)
          .limit(100);

        const diagCounts: Record<string, number> = {};
        (diagnosesData || []).forEach((d: any) => {
          const label = d.diagnose?.diagnose || d.diagnose_fallback || "Unbekannt";
          diagCounts[label] = (diagCounts[label] || 0) + 1;
        });
        const commonDiagnoses = Object.entries(diagCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Top prescribed medications (from treatments with medikament_id this month)
        const { data: medsData } = await supabase
          .from("behandlungen")
          .select("medikament_id, medikamente:medikament_id(name)")
          .eq("praxis_id", userInfo.praxisId)
          .is("deleted_at", null)
          .gte("untersuchung_datum", firstDayOfMonthStr)
          .not("medikament_id", "is", null)
          .limit(100);

        const medCounts: Record<string, number> = {};
        (medsData || []).forEach((m: any) => {
          const name = m.medikamente?.name || "Unbekannt";
          medCounts[name] = (medCounts[name] || 0) + 1;
        });
        const topPrescribed = Object.entries(medCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Low stock items
        const { data: lowStockData } = await supabase
          .from("medikamente")
          .select("id, name, current_stock, minimum_stock")
          .eq("praxis_id", userInfo.praxisId)
          .is("deleted_at", null)
          .lt("current_stock", "minimum_stock")
          .order("current_stock", { ascending: true })
          .limit(5);

        // Appointments today
        const { count: appointmentsToday } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("praxis_id", userInfo.praxisId)
          .gte("start_time", todayStr)
          .lt("start_time", tomorrowStr)
          .is("deleted_at", null);

        // Appointments upcoming (next 30 days)
        const { count: appointmentsUpcoming } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("praxis_id", userInfo.praxisId)
          .gte("start_time", tomorrowStr)
          .lte("start_time", thirtyDaysLaterStr)
          .is("deleted_at", null);

        // TAMG prescriptions this month
        const { count: tamgPrescriptionsThisMonth } = await supabase
          .from("antibiotic_prescriptions")
          .select("*", { count: "exact", head: true })
          .eq("praxis_id", userInfo.praxisId)
          .gte("prescription_date", firstDayOfMonthStr)
          .is("deleted_at", null);

        // Recent activity
        const { data: recentPatients } = await supabase
          .from("patient")
          .select("id, name, spezies, created_at")
          .eq("praxis_id", userInfo.praxisId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(5);

        const { data: recentTreatments } = await supabase
          .from("behandlungen")
          .select("id, diagnose_fallback, untersuchung_datum, patient:patient_id(name)")
          .eq("praxis_id", userInfo.praxisId)
          .is("deleted_at", null)
          .order("untersuchung_datum", { ascending: false })
          .limit(5);

        const { data: recentAppointments } = await supabase
          .from("appointments")
          .select("id, title, start_time, patient:patient_id(name)")
          .eq("praxis_id", userInfo.praxisId)
          .is("deleted_at", null)
          .gte("start_time", todayStr)
          .order("start_time", { ascending: true })
          .limit(5);

        const activities: ActivityItem[] = [];
        (recentPatients || []).forEach((p: any) => {
          activities.push({
            id: `patient-${p.id}`,
            type: "patient",
            title: `Neuer Patient: ${p.name}`,
            description: `Spezies: ${p.spezies || "Unbekannt"}`,
            timestamp: p.created_at,
            route: `/patient/${p.id}`,
          });
        });
        (recentTreatments || []).forEach((t: any) => {
          activities.push({
            id: `treatment-${t.id}`,
            type: "treatment",
            title: `Behandlung: ${t.patient?.name || "Unbekannt"}`,
            description: t.diagnose_fallback || "Keine Diagnose",
            timestamp: t.untersuchung_datum,
            route: `/treatment/${t.id}`,
          });
        });
        (recentAppointments || []).forEach((a: any) => {
          activities.push({
            id: `appointment-${a.id}`,
            type: "appointment",
            title: a.title || "Termin",
            description: a.patient?.name || "",
            timestamp: a.start_time,
            route: "/appointments",
          });
        });

        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setData({
          totalPatients: totalPatients || 0,
          newPatientsThisMonth: newPatientsThisMonth || 0,
          patientsBySpecies,
          treatmentsThisMonth: treatmentsThisMonth || 0,
          commonDiagnoses,
          topPrescribed,
          lowStockItems: (lowStockData || []) as any,
          recentActivity: activities.slice(0, 10),
          appointmentsToday: appointmentsToday || 0,
          appointmentsUpcoming: appointmentsUpcoming || 0,
          tamgPrescriptionsThisMonth: tamgPrescriptionsThisMonth || 0,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userInfo?.praxisId]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 0) {
      const h = Math.abs(diffHours);
      if (h < 24) return `In ${h} Std.`;
      const d = Math.abs(diffDays);
      if (d < 7) return `In ${d} Tag${d > 1 ? "en" : ""}`;
      return date.toLocaleDateString("de-DE");
    }
    if (diffHours < 1) return "Gerade eben";
    if (diffHours < 24) return `Vor ${diffHours} Std.`;
    if (diffDays < 7) return `Vor ${diffDays} Tag${diffDays > 1 ? "en" : ""}`;
    return date.toLocaleDateString("de-DE");
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "patient":
        return <Users className="h-4 w-4 text-green-500" />;
      case "treatment":
        return <Stethoscope className="h-4 w-4 text-purple-500" />;
      case "appointment":
        return <CalendarDays className="h-4 w-4 text-blue-500" />;
      case "prescription":
        return <Pill className="h-4 w-4 text-amber-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    onClick,
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    color: string;
    onClick?: () => void;
  }) => (
    <Card className={`${onClick ? "cursor-pointer hover:shadow-md transition-all" : ""}`} onClick={onClick}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground truncate">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 ml-3 ${color}`}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container py-4 sm:py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Übersicht für {userInfo?.praxisName || "Ihre Praxis"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => navigate("/patients?add=true")}>
            <Plus className="h-4 w-4 mr-1" />
            Patient
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/patients")}>
            <Stethoscope className="h-4 w-4 mr-1" />
            Behandlung
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/appointments")}>
            <CalendarDays className="h-4 w-4 mr-1" />
            Termin
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Patienten gesamt"
          value={data?.totalPatients ?? 0}
          subtitle={`+${data?.newPatientsThisMonth ?? 0} neu diesen Monat`}
          icon={Users}
          color="bg-green-100 text-green-600"
          onClick={() => navigate("/patients")}
        />
        <StatCard
          title="Behandlungen"
          value={data?.treatmentsThisMonth ?? 0}
          subtitle="Diesen Monat"
          icon={Stethoscope}
          color="bg-purple-100 text-purple-600"
        />
        <StatCard
          title="Termine heute"
          value={data?.appointmentsToday ?? 0}
          subtitle={`+${data?.appointmentsUpcoming ?? 0} in 30 Tagen`}
          icon={CalendarDays}
          color="bg-blue-100 text-blue-600"
          onClick={() => navigate("/appointments")}
        />
        <StatCard
          title="TAMG-Verschreibungen"
          value={data?.tamgPrescriptionsThisMonth ?? 0}
          subtitle="Diesen Monat"
          icon={Pill}
          color="bg-amber-100 text-amber-600"
          onClick={() => navigate("/tamg")}
        />
      </div>

      {/* BVL Deadline Warning */}
      {bvlDaysRemaining <= 30 && (
        <Card className={`${bvlUrgent ? "border-red-300 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`h-5 w-5 ${bvlUrgent ? "text-red-600" : "text-amber-600"}`} />
                <div>
                  <p className={`font-medium ${bvlUrgent ? "text-red-800" : "text-amber-800"}`}>
                    BVL-Meldezeitraum: {bvlDeadline.label}
                  </p>
                  <p className={`text-sm ${bvlUrgent ? "text-red-600" : "text-amber-600"}`}>
                    Abgabe bis {formatGermanDate(bvlDeadline.reportDeadline)}
                    {bvlDaysRemaining >= 0 ? ` — noch ${bvlDaysRemaining} Tage` : " — überfällig!"}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className={bvlUrgent ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}
                onClick={() => navigate("/tamg/export")}
              >
                <FileText className="h-4 w-4 mr-1" />
                BVL-Export
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Patients by Species */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Patienten nach Spezies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.patientsBySpecies && data.patientsBySpecies.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.patientsBySpecies}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {data.patientsBySpecies.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  {data.patientsBySpecies.map((s) => (
                    <Badge key={s.name} variant="secondary" className="flex items-center gap-1">
                      {SPECIES_ICONS[s.name] || <Activity className="h-3 w-3" />}
                      {s.name}: {s.value}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Noch keine Patientendaten
              </div>
            )}
          </CardContent>
        </Card>

        {/* Common Diagnoses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Häufige Diagnosen (Monat)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.commonDiagnoses && data.commonDiagnoses.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.commonDiagnoses} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Noch keine Diagnosedaten
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Prescribed Medications */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Pill className="h-4 w-4" />
              Top verschriebene Medikamente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topPrescribed && data.topPrescribed.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.topPrescribed}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Noch keine Verschreibungsdaten
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Niedriger Bestand
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.lowStockItems && data.lowStockItems.length > 0 ? (
              <div className="space-y-3">
                {data.lowStockItems.map((item) => (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[70%]">{item.name}</span>
                      <span className="text-muted-foreground text-xs shrink-0">
                        {item.current_stock} / {item.minimum_stock} {item.current_stock < item.minimum_stock ? "⚠" : ""}
                      </span>
                    </div>
                    <Progress
                      value={Math.min((item.current_stock / item.minimum_stock) * 100, 100)}
                      className="h-2"
                    />
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => navigate("/inventory")}
                >
                  Bestandsverwaltung öffnen
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Keine niedrigen Bestände</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Clock className="h-5 w-5" />
            Letzte Aktivitäten
          </CardTitle>
          <CardDescription>Neueste Patienten, Behandlungen und Termine</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.recentActivity && data.recentActivity.length > 0 ? (
            <div className="space-y-2">
              {data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => activity.route && navigate(activity.route)}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
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
    </div>
  );
};

export default Dashboard;
