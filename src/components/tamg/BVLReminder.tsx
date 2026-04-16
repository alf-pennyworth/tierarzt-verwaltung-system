import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  FileSpreadsheet,
  History,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getReportingDeadline,
  getNextDeadline,
  getDaysRemaining,
  getTimeRemaining,
  isDeadlineUrgent,
  isDeadlineOverdue,
  formatGermanDate,
  type BvlQuarter,
} from "@/lib/bvl-deadlines";

interface BVLReminderProps {
  practiceId: string;
  compact?: boolean;
}

interface ExportHistoryItem {
  id: string;
  export_date: string;
  period_start: string;
  period_end: string;
  records_count: number;
  status: string;
}

interface BVLStatus {
  currentDeadline: BvlQuarter;
  nextQuarter: BvlQuarter;
  unreportedCount: number;
  recentExports: ExportHistoryItem[];
  loading: boolean;
}

export function BVLReminder({ practiceId, compact = false }: BVLReminderProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<BVLStatus | null>(null);

  useEffect(() => {
    async function fetchBVLStatus() {
      const currentDeadline = getReportingDeadline();
      const nextQuarter = getNextDeadline();

      try {
        // Get unreported prescriptions count
        const { count: unreportedCount } = await supabase
          .from('antibiotic_prescriptions')
          .select('*', { count: 'exact', head: true })
          .eq('praxis_id', practiceId)
          .eq('reported_to_bvl', false)
          .is('deleted_at', null);

        // Get recent export history
        const { data: exports } = await supabase
          .from('tamg_export_batches')
          .select('id, export_date, period_start, period_end, records_count, status')
          .eq('praxis_id', practiceId)
          .order('export_date', { ascending: false })
          .limit(5);

        setStatus({
          currentDeadline,
          nextQuarter,
          unreportedCount: unreportedCount || 0,
          recentExports: (exports || []) as ExportHistoryItem[],
          loading: false,
        });
      } catch (error) {
        console.error('Failed to fetch BVL status:', error);
        setStatus({
          currentDeadline,
          nextQuarter,
          unreportedCount: 0,
          recentExports: [],
          loading: false,
        });
      }
    }

    if (practiceId) {
      fetchBVLStatus();
    }
  }, [practiceId]);

  if (!status) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { currentDeadline, nextQuarter, unreportedCount, recentExports } = status;
  const daysRemaining = getDaysRemaining(currentDeadline.reportDeadline);
  const timeRemaining = getTimeRemaining(currentDeadline.reportDeadline);
  const isUrgent = isDeadlineUrgent(currentDeadline.reportDeadline);
  const isOverdue = isDeadlineOverdue(currentDeadline.reportDeadline);

  // Compact view for dashboard widget
  if (compact) {
    return (
      <Card 
        className={`cursor-pointer hover:shadow-md transition-all ${
          isOverdue ? 'border-red-300 bg-red-50' : 
          isUrgent ? 'border-amber-300 bg-amber-50' : 
          'border-blue-200 bg-blue-50'
        }`}
        onClick={() => navigate('/tamg/export')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isOverdue ? 'bg-red-200' : isUrgent ? 'bg-amber-200' : 'bg-blue-200'
              }`}>
                <CalendarClock className={`h-5 w-5 ${
                  isOverdue ? 'text-red-700' : isUrgent ? 'text-amber-700' : 'text-blue-700'
                }`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  BVL-Meldezeitraum
                </p>
                <p className="font-semibold">
                  {currentDeadline.label}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant={isOverdue ? 'destructive' : isUrgent ? 'default' : 'secondary'}>
                {isOverdue ? 'Überfällig' : timeRemaining}
              </Badge>
              {unreportedCount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {unreportedCount} offene Meldungen
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full view for TAMG page
  return (
    <div className="space-y-4">
      {/* Deadline Countdown Card */}
      <Card className={isOverdue ? 'border-red-300' : isUrgent ? 'border-amber-300' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="h-5 w-5" />
            BVL-Meldezeitraum
          </CardTitle>
          <CardDescription>
            Frist für die Meldung von Antibiotika-Verbrauchsdaten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current Quarter */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Aktueller Meldezeitraum</p>
              <p className="text-xl font-semibold">{currentDeadline.label}</p>
              <p className="text-sm">
                {formatGermanDate(currentDeadline.startDate)} - {formatGermanDate(currentDeadline.endDate)}
              </p>
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Meldefrist</p>
              <p className="text-xl font-semibold">
                {formatGermanDate(currentDeadline.reportDeadline)}
              </p>
              <div className="flex items-center gap-2">
                <Clock className={`h-4 w-4 ${
                  isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-muted-foreground'
                }`} />
                <Badge variant={isOverdue ? 'destructive' : isUrgent ? 'default' : 'secondary'}>
                  {isOverdue ? 'Überfällig' : `Noch ${timeRemaining}`}
                </Badge>
              </div>
            </div>

            {/* Unreported Count */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Unberichtete Verschreibungen</p>
              <p className={`text-xl font-semibold ${unreportedCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {unreportedCount}
              </p>
              {unreportedCount > 0 && (
                <Button 
                  size="sm" 
                  onClick={() => navigate('/tamg/export')}
                  className="gap-1"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export starten
                </Button>
              )}
            </div>
          </div>

          {/* Warning banners */}
          {isOverdue && (
            <div className="mt-4 flex items-start gap-3 p-3 bg-red-100 border border-red-300 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Meldefrist überschritten</p>
                <p className="text-sm text-red-700">
                  Die Frist für die BVL-Meldung ist bereits abgelaufen. Bitte melden Sie Ihre Daten umgehend.
                </p>
              </div>
            </div>
          )}

          {isUrgent && !isOverdue && (
            <div className="mt-4 flex items-start gap-3 p-3 bg-amber-100 border border-amber-300 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Meldefrist rückt näher</p>
                <p className="text-sm text-amber-700">
                  Nur noch {timeRemaining} bis zur Meldefrist. Stellen Sie sicher, dass alle Daten gemeldet werden.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export History Card */}
      {recentExports.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5" />
              Export-Historie
            </CardTitle>
            <CardDescription>
              Zuletzt durchgeführte BVL-Exporte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentExports.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                  onClick={() => navigate('/tamg/export')}
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">
                        Export vom {new Date(exp.export_date).toLocaleDateString('de-DE')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Zeitraum: {new Date(exp.period_start).toLocaleDateString('de-DE')} - {new Date(exp.period_end).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {exp.records_count} Datensätze
                    </Badge>
                    <Badge variant={exp.status === 'completed' ? 'default' : 'secondary'}>
                      {exp.status === 'completed' ? 'Abgeschlossen' : 
                       exp.status === 'submitted' ? 'Eingereicht' : 'Ausstehend'}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Quarter Preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Nächster Meldezeitraum
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{nextQuarter.label}</p>
              <p className="text-sm text-muted-foreground">
                {formatGermanDate(nextQuarter.startDate)} - {formatGermanDate(nextQuarter.endDate)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Meldefrist</p>
              <p className="font-medium">{formatGermanDate(nextQuarter.reportDeadline)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}