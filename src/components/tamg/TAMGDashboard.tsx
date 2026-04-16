import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TAMG_ANIMAL_CATEGORIES, ANTIBIOTIC_CLASSES, type AntibioticClass, type TamgAnimalCategory } from "@/types/tamg";
import { getAnimalSpeciesName, getAntibioticClassName } from "@/services/tamgService";
import { AlertTriangle, RefreshCw, Activity, FileSpreadsheet, PlusCircle, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BVLReminder } from "./BVLReminder";

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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prescriptions, setPrescriptions] = useState<AntibioticPrescription[]>([]);
  const [classStats, setClassStats] = useState<UsageStats[]>([]);
  const [speciesStats, setSpeciesStats] = useState<SpeciesStats[]>([]);
  const [timeRange, setTimeRange] = useState<"7" | "30" | "90">("30");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));

      const { data, error: queryError } = await supabase
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

      if (queryError) throw queryError;

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

    } catch (err) {
      console.error("Error loading data:", err);
      setError("Daten konnten nicht geladen werden. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  }, [practiceId, timeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Error state with retry option
  if (error && !loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Fehler beim Laden
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {error}
            </p>
            <Button onClick={loadData} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              Erneut versuchen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-live="polite" aria-label="Daten werden geladen">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        
        {/* Summary cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Charts skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Table skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Screen reader announcement for data loaded */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {loading ? "Daten werden geladen" : `${prescriptions.length} Verschreibungen angezeigt`}
      </div>
      
      {/* BVL Reporting Deadline Reminder */}
      <BVLReminder practiceId={practiceId} />

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
            <div className="text-center py-12 space-y-6" role="status">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <ClipboardList className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Noch keine Verschreibungen</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Im ausgewählten Zeitraum ({timeRange === "7" ? "7 Tage" : timeRange === "30" ? "30 Tage" : "90 Tage"}) wurden noch keine Antibiotika-Verschreibungen dokumentiert.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/tamg/new')}
                  className="gap-2 mt-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Erste Verschreibung anlegen
                </Button>
              </div>
              <div className="text-xs text-muted-foreground border-t pt-4 max-w-md mx-auto">
                <strong>Tipp:</strong> Die TAMG-Dokumentation hilft Ihnen, alle Antibiotika-Gaben gemäß Tierarzneimittelgesetz zu erfassen und für die BVL-Meldung vorzubereiten.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 whitespace-nowrap">Datum</th>
                    <th className="text-left py-2 whitespace-nowrap">Antibiotikum</th>
                    <th className="text-left py-2 hidden sm:table-cell whitespace-nowrap">Wirkstoff</th>
                    <th className="text-left py-2 whitespace-nowrap">Tierart</th>
                    <th className="text-left py-2 hidden md:table-cell whitespace-nowrap">Diagnose</th>
                    <th className="text-left py-2 hidden sm:table-cell whitespace-nowrap">Typ</th>
                    <th className="text-left py-2 whitespace-nowrap">BVL Status</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.slice(0, 10).map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="py-2 whitespace-nowrap">
                        {new Date(p.prescription_date).toLocaleDateString("de-DE")}
                      </td>
                      <td className="py-2 font-medium whitespace-nowrap">{p.drug_name}</td>
                      <td className="py-2 hidden sm:table-cell">{p.active_substance}</td>
                      <td className="py-2 whitespace-nowrap">
                        {TAMG_ANIMAL_CATEGORIES[p.animal_species]?.de || p.animal_species}
                      </td>
                      <td className="py-2 hidden md:table-cell">{p.diagnosis || "-"}</td>
                      <td className="py-2 hidden sm:table-cell capitalize whitespace-nowrap">{p.prescription_type}</td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
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