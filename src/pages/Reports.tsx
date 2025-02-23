
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Reports = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const generateCsv = async () => {
    try {
      setIsLoading(true);

      const { data: behandlungen, error: behandlungenError } = await supabase
        .from('behandlungen')
        .select(`
          untersuchung_datum,
          medikament_menge_formatted,
          medikamente (
            zulassungsnummer,
            packungs_id,
            masseinheit,
            eingangs_nr
          ),
          patient:patient_id (
            tamb_form,
            praxis:praxis_id (
              betriebsnummer
            ),
            besitzer:besitzer_id (
              betriebsnummer
            )
          )
        `);

      if (behandlungenError) throw behandlungenError;

      // Transform data into CSV format
      const csvRows = [
        [
          'BNR15',
          'BNR15_HA',
          'TAMB_FORM',
          'TAMA_ZNR',
          'TAMA_PID',
          'TAMA_ENR',
          'TAMX_AWMEN',
          'TAMX_AW_ME',
          'TAMX_AWDAT'
        ]
      ];

      behandlungen?.forEach(behandlung => {
        csvRows.push([
          behandlung.patient?.praxis?.betriebsnummer || '',
          behandlung.patient?.besitzer?.betriebsnummer || '',
          behandlung.patient?.tamb_form || '',
          behandlung.medikamente?.zulassungsnummer || '',
          behandlung.medikamente?.packungs_id || '',
          behandlung.medikamente?.eingangs_nr || '',
          behandlung.medikament_menge_formatted || '',
          behandlung.medikamente?.masseinheit || '',
          new Date(behandlung.untersuchung_datum).toISOString().split('T')[0]
        ]);
      });

      // Convert to CSV string
      const csvContent = csvRows.map(row => row.join(';')).join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `behandlungen_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast({
        title: "Export erfolgreich",
        description: "Die CSV-Datei wurde erfolgreich erstellt.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: "destructive",
        title: "Export fehlgeschlagen",
        description: "Beim Erstellen der CSV-Datei ist ein Fehler aufgetreten.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Berichte</h1>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Behandlungen Export</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Exportieren Sie Behandlungsdaten im CSV-Format für externe Systeme.</p>
            <Button 
              onClick={generateCsv} 
              disabled={isLoading}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isLoading ? "Wird exportiert..." : "CSV exportieren"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
