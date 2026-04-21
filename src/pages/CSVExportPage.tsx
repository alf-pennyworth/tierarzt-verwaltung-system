import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  FileSpreadsheet,
  Users,
  Calendar,
  Pill,
  Activity,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";

interface ExportField {
  key: string;
  label: string;
  category: string;
  selected: boolean;
}

const PATIENT_FIELDS: ExportField[] = [
  { key: "id", label: "ID", category: "patient", selected: true },
  { key: "name", label: "Name", category: "patient", selected: true },
  { key: "spezies", label: "Spezies", category: "patient", selected: true },
  { key: "rasse", label: "Rasse", category: "patient", selected: true },
  { key: "geschlecht", label: "Geschlecht", category: "patient", selected: true },
  { key: "geburtsdatum", label: "Geburtsdatum", category: "patient", selected: true },
  { key: "chipnummer", label: "Chipnummer", category: "patient", selected: true },
  { key: "gewicht", label: "Gewicht", category: "patient", selected: false },
  { key: "besitzer_name", label: "Besitzer Name", category: "patient", selected: true },
  { key: "besitzer_email", label: "Besitzer E-Mail", category: "patient", selected: false },
  { key: "besitzer_telefon", label: "Besitzer Telefon", category: "patient", selected: false },
  { key: "besitzer_adresse", label: "Besitzer Adresse", category: "patient", selected: false },
  { key: "erstellt_am", label: "Erfasst am", category: "patient", selected: false },
];

const TREATMENT_FIELDS: ExportField[] = [
  { key: "untersuchung_datum", label: "Untersuchungsdatum", category: "treatment", selected: true },
  { key: "diagnose", label: "Diagnose", category: "treatment", selected: true },
  { key: "behandlung", label: "Behandlung", category: "treatment", selected: true },
  { key: "medikament_name", label: "Medikament", category: "treatment", selected: true },
  { key: "medikament_dosierung", label: "Dosierung", category: "treatment", selected: false },
  { key: "notizen", label: "Notizen", category: "treatment", selected: false },
  { key: "vet_name", label: "Tierarzt", category: "treatment", selected: true },
];

const TAMG_FIELDS: ExportField[] = [
  { key: "antibiotic_name", label: "Antibiotikum", category: "tamg", selected: true },
  { key: "prescription_date", label: "Verschreibungsdatum", category: "tamg", selected: true },
  { key: "dosage", label: "Dosierung", category: "tamg", selected: true },
  { key: "duration_days", label: "Dauer (Tage)", category: "tamg", selected: true },
  { key: "indication", label: "Indikation", category: "tamg", selected: true },
  { key: "animal_species", label: "Tierart", category: "tamg", selected: false },
  { key: "vet_name", label: "Tierarzt", category: "tamg", selected: true },
];

export default function CSVExportPage() {
  const { userInfo } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [dataType, setDataType] = useState<"patients" | "treatments" | "tamg">("patients");
  const [dateRange, setDateRange] = useState<"all" | "30days" | "90days" | "year">("all");

  const [fields, setFields] = useState<ExportField[]>(() => [
    ...PATIENT_FIELDS,
    ...TREATMENT_FIELDS,
    ...TAMG_FIELDS,
  ]);

  const toggleField = (key: string) => {
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, selected: !f.selected } : f))
    );
  };

  const toggleAllInCategory = (category: string, select: boolean) => {
    setFields((prev) =>
      prev.map((f) => (f.category === category ? { ...f, selected: select } : f))
    );
  };

  const getActiveFields = () => {
    return fields.filter((f) => f.category === dataType && f.selected);
  };

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case "30days":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case "90days":
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      case "year":
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return null;
    }
  };

  const exportToCSV = useCallback(async () => {
    if (!userInfo?.praxisId) return;

    setExporting(true);
    try {
      let data: any[] = [];
      const activeFields = getActiveFields();

      if (dataType === "patients") {
        let query = supabase
          .from("patient")
          .select(`
            id, name, spezies, rasse, geschlecht, geburtsdatum, chipnummer, gewicht,
            created_at,
            owner:owner_id(name, email, telefon, adresse)
          `)
          .eq("praxis_id", userInfo.praxisId);

        const dateFilter = getDateFilter();
        if (dateFilter) {
          query = query.gte("created_at", dateFilter);
        }

        const { data: patients } = await query;
        data = patients?.map((p) => ({
          id: p.id,
          name: p.name,
          spezies: p.spezies,
          rasse: p.rasse,
          geschlecht: p.geschlecht,
          geburtsdatum: p.geburtsdatum,
          chipnummer: p.chipnummer,
          gewicht: p.gewicht,
          besitzer_name: p.owner?.name || "",
          besitzer_email: p.owner?.email || "",
          besitzer_telefon: p.owner?.telefon || "",
          besitzer_adresse: p.owner?.adresse || "",
          erstellt_am: p.created_at,
        })) || [];
      } else if (dataType === "treatments") {
        let query = supabase
          .from("behandlungen")
          .select(`
            id, untersuchung_datum, diagnose_fallback, behandlung, notizen,
            medikament:medikament_id(name, dosierung),
            vet:vet_id(name)
          `)
          .eq("praxis_id", userInfo.praxisId);

        const dateFilter = getDateFilter();
        if (dateFilter) {
          query = query.gte("untersuchung_datum", dateFilter);
        }

        const { data: treatments } = await query;
        data = treatments?.map((t) => ({
          id: t.id,
          untersuchung_datum: t.untersuchung_datum,
          diagnose: t.diagnose_fallback,
          behandlung: t.behandlung,
          medikament_name: t.medikament?.name || "",
          medikament_dosierung: t.medikament?.dosierung || "",
          notizen: t.notizen,
          vet_name: t.vet?.name || "",
        })) || [];
      } else if (dataType === "tamg") {
        let query = supabase
          .from("antibiotic_prescriptions")
          .select(`
            id, prescription_date, antibiotic_name, dosage, duration_days, indication, animal_species,
            vet:vet_id(name)
          `)
          .eq("praxis_id", userInfo.praxisId);

        const dateFilter = getDateFilter();
        if (dateFilter) {
          query = query.gte("prescription_date", dateFilter);
        }

        const { data: prescriptions } = await query;
        data = prescriptions?.map((p) => ({
          id: p.id,
          antibiotic_name: p.antibiotic_name,
          prescription_date: p.prescription_date,
          dosage: p.dosage,
          duration_days: p.duration_days,
          indication: p.indication,
          animal_species: p.animal_species,
          vet_name: p.vet?.name || "",
        })) || [];
      }

      if (data.length === 0) {
        toast({
          title: "Keine Daten",
          description: "Für die ausgewählten Kriterien wurden keine Daten gefunden.",
          variant: "destructive",
        });
        setExporting(false);
        return;
      }

      // Generate CSV
      const headers = activeFields.map((f) => f.label).join(";");
      const rows = data.map((row) =>
        activeFields
          .map((field) => {
            const value = row[field.key];
            if (value === null || value === undefined) return "";
            const str = String(value);
            // Escape semicolons and quotes
            if (str.includes(";") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(";")
      );

      const csv = [headers, ...rows].join("\n");

      // Download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${dataType}_export_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export erfolgreich",
        description: `${data.length} Datensätze exportiert`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export fehlgeschlagen",
        description: "Ein Fehler ist aufgetreten",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }, [dataType, fields, userInfo?.praxisId, dateRange]);

  const categories = {
    patient: { label: "Patienten", icon: Users, fields: PATIENT_FIELDS },
    treatment: { label: "Behandlungen", icon: Activity, fields: TREATMENT_FIELDS },
    tamg: { label: "TAMG", icon: Pill, fields: TAMG_FIELDS },
  };

  const currentCategory = categories[dataType as keyof typeof categories];

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            CSV Export
          </h1>
          <p className="text-muted-foreground">
            Daten für Analyse, Berichte oder Migration exportieren
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export-Konfiguration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Data Type */}
              <div className="space-y-2">
                <Label>Datentyp</Label>
                <Select value={dataType} onValueChange={(v) => setDataType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patients">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" /> Patienten
                      </div>
                    </SelectItem>
                    <SelectItem value="treatments">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" /> Behandlungen
                      </div>
                    </SelectItem>
                    <SelectItem value="tamg">
                      <div className="flex items-center gap-2">
                        <Pill className="h-4 w-4" /> TAMG
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Zeitraum</Label>
                <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Daten</SelectItem>
                    <SelectItem value="30days">Letzte 30 Tage</SelectItem>
                    <SelectItem value="90days">Letzte 90 Tage</SelectItem>
                    <SelectItem value="year">Letztes Jahr</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Export Button */}
              <Button
                className="w-full"
                onClick={exportToCSV}
                disabled={exporting || getActiveFields().length === 0}
              >
                {exporting ? (
                  <>Exportiere... <Download className="h-4 w-4 animate-spin" /></>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    CSV herunterladen
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Field Selection */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Felder auswählen
              </CardTitle>
              <CardDescription>
                {getActiveFields().length} von {currentCategory.fields.length} Feldern ausgewählt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllInCategory(dataType, true)}
                  >
                    Alle auswählen
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllInCategory(dataType, false)}
                  >
                    Keine auswählen
                  </Button>
                </div>
                <Badge variant="secondary">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {getActiveFields().length} aktiv
                </Badge>
              </div>

              <ScrollArea className="h-[500px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentCategory.fields.map((field) => (
                    <div
                      key={field.key}
                      className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={field.key}
                        checked={field.selected}
                        onCheckedChange={() => toggleField(field.key)}
                      />
                      <Label
                        htmlFor={field.key}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
