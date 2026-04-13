import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TAMG_ANIMAL_CATEGORIES, ANTIBIOTIC_CLASSES, type AntibioticClass, type TamgAnimalCategory } from "@/types/tamg";
import { getAnimalSpeciesName, getAntibioticClassName } from "@/services/tamgService";

interface UsageStats {
  antibiotic_class: AntibioticClass;
  count: number;
  total_amount: number;
}

interface SpeciesStats {
  species: TamgAnimalCategory;
  count: number;
}

interface AntibioticPrescription {
  id: string;
  drug_name: string;
  active_substance: string;
  antibiotic_class: AntibioticClass;
  patient_id: string | null;
  amount_prescribed: number;
  unit: string;
  treatment_duration_days: number | null;
  animal_species: TamgAnimalCategory;
  diagnosis: string | null;
  prescription_type: string;
  prescription_date: string;
  reported_to_bvl: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC107', '#E91E63', '#9C27B0', '#3F51B5'];

interface TAMGDashboardProps {
  practiceId: string;
}

export function TAMGDashboard({ practiceId }: TAMGDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<AntibioticPrescription[]>([]);
  const [classStats, setClassStats] = useState<UsageStats[]>([]);
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
          id,
          drug_name,
          active_substance,
          antibiotic_class,
          patient_id,
          amount_prescribed,
          unit,
          treatment_duration_days,
          animal_species,
          diagnosis,
          prescription_type,
          prescription_date,
          reported_to_bvl
        `)
        .eq("praxis_id", practiceId)
        .gte("prescription_date", startDate.toISOString().split('T')[0])
        .is("deleted_at", null)
        .order("prescription_date", { ascending: false });

      if (error) throw error;

      setPrescriptions((data || []) as AntibioticPrescription[]);

      // Calculate class statistics
      const classCounts: Record<string, { count: number; total_amount: number }> = {};
      const speciesCounts: Record<string, number> = {};

      (data || []).forEach((p: any) => {
        // Class stats
        const className = p.antibiotic_class || 'other';
        if (!classCounts[className]) {
          classCounts[className] = { count: 0, total_amount: 0 };
        }
        classCounts[className].count += 1;
        classCounts[className].total_amount += Number(p.amount_prescribed) || 0;

        // Species stats
        const species = p.animal_species || 'other';
        speciesCounts[species] = (speciesCounts[species] || 0) + 1;
      });

      setClassStats(
        Object.entries(classCounts)
          .map(([antibiotic_class, stats]) => ({
            antibiotic_class: antibiotic_class as AntibioticClass,
            count: stats.count,
            total_amount: stats.total_amount,
          }))
          .sort((a, b) => b.count - a.count)
      );

      setSpeciesStats(
        Object.entries(speciesCounts)
          .map(([species, count]) => ({ species: species as TamgAnimalCategory, count }))
          .sort((a, b) => b.count - a.count)
      );

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for charts
  const chartData = classStats.map(stat => ({
    name: ANTIBIOTIC_CLASSES[stat.antibiotic_class]?.de || stat.antibiotic_class,
    count: stat.count,
    amount: stat.total_amount,
  }));

  const pieData = speciesStats.map(stat => ({
    name: TAMG_ANIMAL_CATEGORIES[stat.species]?.de || stat.species,
    value: stat.count,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" role="status" aria-live="polite">
        <div>Laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Screen reader announcement for data loaded */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {loading ? "Daten werden geladen" : `${prescriptions.length} Verschreibungen angezeigt`}
      </div>
      
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">TAMG Dashboard</h2>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)} aria-label="Zeitraum auswählen">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <CardTitle className="text-sm font-medium">Antibiotika-Klassen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classStats.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tierarten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{speciesStats.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">BVL-Meldepflichtig</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {prescriptions.filter((p) => !p.reported_to_bvl).length}
            </div>
            <p className="text-xs text-muted-foreground">Noch nicht gemeldet</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Antibiotika nach Wirkstoffklasse</CardTitle>
            <CardDescription>Häufigste Verschreibungen im Zeitraum</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" name="Anzahl" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Keine Daten im ausgewählten Zeitraum
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verteilung nach Tierart</CardTitle>
            <CardDescription>Antibiotika-Einsatz nach Spezies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Keine Daten im ausgewählten Zeitraum
                </div>
              )}
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
          {prescriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" role="status">
              <p>Keine Verschreibungen im ausgewählten Zeitraum.</p>
              <p className="text-sm mt-2">Erstellen Sie eine neue Verschreibung über den Tab "Neue Verschreibung".</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Datum</th>
                    <th className="text-left py-2">Antibiotikum</th>
                    <th className="text-left py-2">Wirkstoff</th>
                    <th className="text-left py-2">Tierart</th>
                    <th className="text-left py-2">Diagnose</th>
                    <th className="text-left py-2">Typ</th>
                    <th className="text-left py-2">BVL Status</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.slice(0, 10).map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="py-2">
                        {new Date(p.prescription_date).toLocaleDateString("de-DE")}
                      </td>
                      <td className="py-2 font-medium">{p.drug_name}</td>
                      <td className="py-2">{p.active_substance}</td>
                      <td className="py-2">
                        {TAMG_ANIMAL_CATEGORIES[p.animal_species]?.de || p.animal_species}
                      </td>
                      <td className="py-2">{p.diagnosis || "-"}</td>
                      <td className="py-2 capitalize">{p.prescription_type}</td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            p.reported_to_bvl
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {p.reported_to_bvl ? "Gemeldet" : "Offen"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}