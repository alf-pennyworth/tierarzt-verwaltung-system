import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface UsageStats {
  drug_name: string;
  count: number;
  total_dosage: string;
}

interface SpeciesStats {
  species: string;
  count: number;
}

interface MonthlyTrend {
  month: string;
  prescriptions: number;
}

interface AntibioticPrescription {
  id: string;
  drug_name: string;
  patient_id: string;
  dosage: string;
  duration_days: number;
  indication: string;
  prescribed_at: string;
  bvl_reported: boolean;
  patients?: { name: string; species: string };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface TAMGDashboardProps {
  practiceId: string;
}

export function TAMGDashboard({ practiceId }: TAMGDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<AntibioticPrescription[]>([]);
  const [drugStats, setDrugStats] = useState<UsageStats[]>([]);
  const [speciesStats, setSpeciesStats] = useState<SpeciesStats[]>([]);
  const [timeRange, setTimeRange] = useState<"7" | "30" | "90">("30");

  useEffect(() => {
    loadData();
  }, [practiceId, timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));

      const { data, error } = await supabase
        .from("antibiotic_prescriptions")
        .select(`
          *,
          patient:patient_id (name, species)
        `)
        .eq("practice_id", practiceId)
        .gte("prescribed_at", startDate.toISOString())
        .order("prescribed_at", { ascending: false });

      if (error) throw error;

      setPrescriptions(data || []);

      // Calculate drug statistics
      const drugCounts: Record<string, number> = {};
      const speciesCounts: Record<string, number> = {};

      (data || []).forEach((p: any) => {
        const drugName = p.medication?.name || "Unbekannt";
        drugCounts[drugName] = (drugCounts[drugName] || 0) + 1;

        const species = p.patient?.species || "Unbekannt";
        speciesCounts[species] = (speciesCounts[species] || 0) + 1;
      });

      setDrugStats(
        Object.entries(drugCounts)
          .map(([name, count]) => ({ drug_name: name, count, total_dosage: "" }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      );

      setSpeciesStats(
        Object.entries(speciesCounts)
          .map(([species, count]) => ({ species, count }))
          .sort((a, b) => b.count - a.count)
      );

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div>Laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">TAMG Dashboard</h2>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Zeitraum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Letzte 7 Tage</SelectItem>
            <SelectItem value="30">Letzte 30 Tage</SelectItem>
            <SelectItem value="90">Letzte 90 Tage</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gesamt Verschreibungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prescriptions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verschiedene Antibiotika</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drugStats.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">BVL-Meldepflichtig</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {prescriptions.filter((p) => !p.bvl_reported).length}
            </div>
            <p className="text-xs text-muted-foreground">Noch nicht gemeldet</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Antibiotika nach Wirkstoff</CardTitle>
            <CardDescription>Häufigste Verschreibungen im Zeitraum</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={drugStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="drug_name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" name="Anzahl" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verteilung nach Tierart</CardTitle>
            <CardDescription>Antibiotikaeinsatz nach Spezies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={speciesStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {speciesStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Prescriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Letzte Verschreibungen</CardTitle>
          <CardDescription>Die letzten 10 Antibiotika-Verschreibungen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Datum</th>
                  <th className="text-left py-2">Antibiotikum</th>
                  <th className="text-left py-2">Patient</th>
                  <th className="text-left py-2">Indikation</th>
                  <th className="text-left py-2">BVL Status</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.slice(0, 10).map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2">
                      {new Date(p.prescribed_at).toLocaleDateString("de-DE")}
                    </td>
                    <td className="py-2">{p.drug_name}</td>
                    <td className="py-2">
                      {(p as any).patient?.name || "Unbekannt"}
                    </td>
                    <td className="py-2">{p.indication}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          p.bvl_reported
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {p.bvl_reported ? "Gemeldet" : "Offen"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}