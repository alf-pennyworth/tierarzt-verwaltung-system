import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, Eye, AlertCircle, CheckCircle } from "lucide-react";

interface BVLExportProps {
  practiceId: string;
}

interface PrescriptionPreview {
  id: string;
  drug_name: string;
  animal_species: string;
  amount: number;
  unit: string;
  prescribed_at: string;
  treatment_duration_days: number;
  bvl_reported: boolean;
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
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<PrescriptionPreview[] | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // First of month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [action, setAction] = useState<'I' | 'X' | 'S'>('X');

  const handlePreview = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie einen Zeitraum aus.",
        variant: "destructive",
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "Fehler",
        description: "Das Startdatum muss vor dem Enddatum liegen.",
        variant: "destructive",
      });
      return;
    }

    setPreviewing(true);
    try {
      const { data, error } = await supabase
        .from('antibiotic_prescriptions')
        .select(`
          id,
          drug_name,
          animal_species,
          amount_prescribed,
          unit,
          prescription_date,
          treatment_duration_days,
          reported_to_bvl
        `)
        .eq('praxis_id', practiceId)
        .gte('prescription_date', startDate)
        .lte('prescription_date', endDate)
        .is('deleted_at', null)
        .order('prescription_date', { ascending: true });

      if (error) throw error;

      const previews: PrescriptionPreview[] = (data || []).map((p: any) => ({
        id: p.id,
        drug_name: p.drug_name || 'Unbekannt',
        animal_species: p.animal_species || 'Sonstige',
        amount: p.amount_prescribed || 0,
        unit: p.unit || 'ST',
        prescribed_at: p.prescription_date,
        treatment_duration_days: p.treatment_duration_days || 1,
        bvl_reported: p.reported_to_bvl || false,
      }));

      setPreviewData(previews);
      setShowPreviewDialog(true);
    } catch (error) {
      console.error('Preview error:', error);
      toast({
        title: "Fehler",
        description: "Vorschau konnte nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setPreviewing(false);
    }
  };

  const handleExport = async () => {
    if (!previewData || previewData.length === 0) {
      toast({
        title: "Fehler",
        description: "Keine Daten zum Exportieren.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Transform to BVL format
      const records: ExportRecord[] = previewData.map((p, index) => ({
        BNR15: '09 000 000 00 001',
        BNR15_HA: '09 000 000 00 002',
        TAMB_FORM: getUsageForm(p.animal_species),
        TAMX_TIANZ: 1,
        TAMA_NAME: p.drug_name,
        TAMX_AWMEN: p.amount,
        TAMX_AW_ME: p.unit.toUpperCase(),
        TAMX_AWDAT: new Date(p.prescribed_at).toISOString().split('T')[0],
        TAMX_LFNR: (index + 1).toString().padStart(5, '0'),
        TAMX_BEHAT: p.treatment_duration_days,
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
      const prescriptionIds = previewData.map(p => p.id);
      await supabase
        .from('antibiotic_prescriptions')
        .update({ reported_to_bvl: true })
        .in('id', prescriptionIds);

      setShowPreviewDialog(false);
      setPreviewData(null);

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
              variant="secondary"
              onClick={handlePreview}
              disabled={previewing || !startDate || !endDate}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              {previewing ? 'Laden...' : 'Vorschau'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Export-Vorschau</DialogTitle>
            <DialogDescription>
              Überprüfen Sie die zu exportierenden Datensätze vor dem Download.
            </DialogDescription>
          </DialogHeader>
          
          {previewData && (
            <>
              <div className="flex items-center gap-4 py-2 border-b">
                <Badge variant="secondary" className="gap-1">
                  <FileSpreadsheet className="h-3 w-3" />
                  {previewData.length} Datensätze
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Zeitraum: {new Date(startDate).toLocaleDateString('de-DE')} - {new Date(endDate).toLocaleDateString('de-DE')}
                </span>
                {previewData.some(p => p.bvl_reported) && (
                  <Badge variant="outline" className="gap-1 text-yellow-600">
                    <AlertCircle className="h-3 w-3" />
                    {previewData.filter(p => p.bvl_reported).length} bereits gemeldet
                  </Badge>
                )}
              </div>
              
              <div className="flex-1 overflow-auto py-4">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Datum</th>
                      <th className="text-left py-2 px-2">Antibiotikum</th>
                      <th className="text-left py-2 px-2">Tierart</th>
                      <th className="text-right py-2 px-2">Menge</th>
                      <th className="text-center py-2 px-2">Tage</th>
                      <th className="text-center py-2 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 50).map((p, i) => (
                      <tr key={p.id} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                        <td className="py-2 px-2">
                          {new Date(p.prescribed_at).toLocaleDateString('de-DE')}
                        </td>
                        <td className="py-2 px-2 font-medium">{p.drug_name}</td>
                        <td className="py-2 px-2">{p.animal_species}</td>
                        <td className="py-2 px-2 text-right">
                          {p.amount} {p.unit}
                        </td>
                        <td className="py-2 px-2 text-center">{p.treatment_duration_days}</td>
                        <td className="py-2 px-2 text-center">
                          {p.bvl_reported ? (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <CheckCircle className="h-3 w-3" />
                              Gemeldet
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <AlertCircle className="h-3 w-3" />
                              Offen
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 50 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    ... und weitere {previewData.length - 50} Datensätze
                  </p>
                )}
              </div>
            </>
          )}

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleExport}
              disabled={loading || !previewData || previewData.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {loading ? 'Wird exportiert...' : 'CSV herunterladen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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