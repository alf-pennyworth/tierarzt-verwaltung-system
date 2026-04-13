import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Download, FileSpreadsheet } from "lucide-react";

interface BVLExportProps {
  practiceId: string;
}

interface ExportRecord {
  BNR15: string;
  BNR15_HA: string;
  TAMB_FORM: string;
  TAMX_TIANZ: number;
  TAMA_NAME: string;
  TAMX_AWMEN: number;
  TAMX_AW_ME: string;
  TAMX_AWDAT: string;
  TAMX_LFNR: number;
  TAMX_BEHAT: number;
}

// BVL requires Windows-1252/ISO-8859-15 encoding, NOT UTF-8
const encodeWindows1252 = (str: string): string => {
  // Basic mapping for common German characters
  const charMap: Record<string, string> = {
    'ä': '\xe4', 'Ä': '\xc4',
    'ö': '\xf6', 'Ö': '\xd6',
    'ü': '\xfc', 'Ü': '\xdc',
    'ß': '\xdf',
    '€': '\x80',
  };
  
  return str.split('').map(char => charMap[char] || char).join('');
};

const toCSVLine = (record: ExportRecord): string => {
  const values = [
    record.BNR15,
    record.BNR15_HA,
    record.TAMB_FORM,
    record.TAMX_TIANZ.toString(),
    record.TAMA_NAME,
    record.TAMX_AWMEN.toString(),
    record.TAMX_AW_ME,
    record.TAMX_AWDAT,
    record.TAMX_LFNR.toString(),
    record.TAMX_BEHAT.toString(),
  ];
  
  // Quote values containing semicolons or quotes
  return values.map(v => {
    if (v.includes(';') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  }).join(';');
};

const toWindows1252Blob = (content: string): Blob => {
  // Windows-1252 encoding for BVL compatibility
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(encodeWindows1252(content));
  return new Blob([uint8Array], { type: 'text/csv;charset=windows-1252' });
};

export function BVLExport({ practiceId }: BVLExportProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // First of month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [action, setAction] = useState<'I' | 'X' | 'S'>('X');

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie einen Zeitraum aus.",
        variant: "destructive",
      });
      return;
    }

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "Fehler",
        description: "Das Startdatum muss vor dem Enddatum liegen.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Fetch antibiotic prescriptions within date range
      const { data: prescriptions, error } = await supabase
        .from('antibiotic_prescriptions')
        .select(`
          id,
          prescribed_at,
          drug_name,
          amount,
          unit,
          treatment_duration_days,
          animal_species,
          treatment_purpose,
          bvl_reported,
          patient:patient_id (
            name,
            species
          )
        `)
        .eq('practice_id', practiceId)
        .gte('prescribed_at', startDate)
        .lte('prescribed_at', endDate + 'T23:59:59')
        .order('prescribed_at', { ascending: true });

      if (error) throw error;

      if (!prescriptions || prescriptions.length === 0) {
        toast({
          title: "Keine Daten",
          description: "Keine Verschreibungen im gewählten Zeitraum gefunden.",
        });
        return;
      }

      // Transform to BVL format
      const records: ExportRecord[] = prescriptions.map((p: any, index: number) => ({
        // TODO: Get BNR15 from practice table once column is added via Supabase migration
        // Currently using placeholder - production needs real 15-digit operation number
        BNR15: '09 000 000 00 001', // Praxis BNR15 (Betriebsnummer)
        BNR15_HA: '09 000 000 00 002', // Owner BNR15 (Halterbetriebsnummer) - TODO: Get from patient
        TAMB_FORM: getUsageForm(p.animal_species || p.patient?.species), // Usage type based on species
        TAMX_TIANZ: p.animal_count || 1, // Number of treated animals
        TAMA_NAME: p.drug_name || 'Unbekannt', // Medicinal product name
        TAMX_AWMEN: p.amount || 1, // Application amount
        TAMX_AW_ME: p.unit?.toUpperCase() || 'ST', // Unit
        TAMX_AWDAT: new Date(p.prescribed_at).toISOString().split('T')[0], // Application date
        TAMX_LFNR: (index + 1).toString().padStart(5, '0'), // Sequential number - BVL often expects padded
        TAMX_BEHAT: p.treatment_duration_days || 1, // Treatment days
      }));

      // Build CSV content with header
      const header = 'BNR15;BNR15_HA;TAMB_FORM;TAMX_TIANZ;TAMA_NAME;TAMX_AWMEN;TAMX_AW_ME;TAMX_AWDAT;TAMX_LFNR;TAMX_BEHAT';
      const lines = [header, ...records.map(toCSVLine)];
      const csvContent = lines.join('\r\n'); // Windows line endings

      // Create Windows-1252 encoded blob
      const blob = toWindows1252Blob(csvContent);
      
      // Download file
      const fileName = `BVL_Export_${startDate}_${endDate}_A${action}.csv`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Mark as reported
      const prescriptionIds = prescriptions.map((p: any) => p.id);
      await supabase
        .from('antibiotic_prescriptions')
        .update({ bvl_reported: true })
        .in('id', prescriptionIds);

      toast({
        title: "Export erfolgreich",
        description: `${records.length} Datensätze wurden exportiert und als gemeldet markiert.`,
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export fehlgeschlagen",
        description: "Der Export konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Map species to BVL usage form codes
  const getUsageForm = (species?: string): string => {
    const speciesMap: Record<string, string> = {
      'Rind': 'RIN',      // Cattle
      'Schwein': 'SCH',   // Pig
      'Huhn': 'GEF',      // Poultry
      'Pute': 'GEF',      // Poultry
      'Pferd': 'PF',      // Horse
      'Schaf': 'SCH',     // Sheep
      'Ziege': 'ZIE',     // Goat
      'Hund': 'HUN',      // Dog
      'Katze': 'KAT',     // Cat
      'Kaninchen': 'KAN', // Rabbit
    };
    return speciesMap[species || ''] || 'SON'; // Default: Sonstige (other)
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            BVL-Export erstellen
          </CardTitle>
          <CardDescription>
            Exportieren Sie Antibiotika-Verschreibungen im BVL-TAMv2 Format für HI-Tier.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Von (Startdatum)</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-required="true"
                max={endDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Bis (Enddatum)</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-required="true"
                min={startDate}
              />
            </div>
          </div>

          {/* Action Type */}
          <div className="space-y-2">
            <Label htmlFor="action">Aktion</Label>
            <Select value={action} onValueChange={(v) => setAction(v as 'I' | 'X' | 'S')}>
              <SelectTrigger id="action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="X">
                  <span className="font-medium">X - Ändern</span>
                  <span className="text-muted-foreground ml-2">(Upsert: Einfügen oder Aktualisieren)</span>
                </SelectItem>
                <SelectItem value="I">
                  <span className="font-medium">I - Einfügen</span>
                  <span className="text-muted-foreground ml-2">(Nur neue Datensätze)</span>
                </SelectItem>
                <SelectItem value="S">
                  <span className="font-medium">S - Stornieren</span>
                  <span className="text-muted-foreground ml-2">(Datensatz löschen)</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info Box */}
          <div className="bg-muted p-4 rounded-lg text-sm">
            <p className="font-medium mb-2">Hinweis zur BVL-Meldung:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Die CSV-Datei wird im Windows-1252-Encoding erstellt (BVL-kompatibel)</li>
              <li>Exportierte Verschreibungen werden automatisch als "gemeldet" markiert</li>
              <li>Upload über HI-Tier Dateibereich (www.hi-tier.de/HitCom)</li>
              <li>Bei Storno (S) werden nur die Schlüsselfelder benötigt</li>
            </ul>
          </div>

          {/* Export Button */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setStartDate(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
                setEndDate(new Date().toISOString().split('T')[0]);
              }}
            >
              Zurücksetzen
            </Button>
            <Button
              onClick={handleExport}
              disabled={loading || !startDate || !endDate}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {loading ? 'Wird exportiert...' : 'CSV exportieren'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Field Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Felderklärung (TAM v2)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>BNR15:</strong> Betriebsnummer des Tierarztes
            </div>
            <div>
              <strong>BNR15_HA:</strong> Betriebsnummer des Halters
            </div>
            <div>
              <strong>TAMB_FORM:</strong> Nutzungsart (Tierart-Code)
            </div>
            <div>
              <strong>TAMX_TIANZ:</strong> Anzahl behandelte Tiere
            </div>
            <div>
              <strong>TAMA_NAME:</strong> Arzneimittelname
            </div>
            <div>
              <strong>TAMX_AWMEN:</strong> Anwendungsmenge
            </div>
            <div>
              <strong>TAMX_AW_ME:</strong> Maßeinheit
            </div>
            <div>
              <strong>TAMX_AWDAT:</strong> Anwendungsdatum
            </div>
            <div>
              <strong>TAMX_LFNR:</strong> Laufende Nummer
            </div>
            <div>
              <strong>TAMX_BEHAT:</strong> Behandlungstage
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}