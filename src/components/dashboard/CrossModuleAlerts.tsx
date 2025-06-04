
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package, Calendar, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface Alert {
  id: string;
  type: 'low_stock' | 'upcoming_appointment' | 'patient_overdue' | 'order_pending';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
  actionText?: string;
}

const CrossModuleAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { userInfo } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (userInfo?.praxisId) {
      fetchAlerts();
    }
  }, [userInfo]);

  const fetchAlerts = async () => {
    const newAlerts: Alert[] = [];

    try {
      // Check for low stock medications
      const { data: lowStockMeds } = await supabase
        .from('medikamente')
        .select('name, current_stock, minimum_stock')
        .eq('praxis_id', userInfo?.praxisId)
        .lt('current_stock', 'minimum_stock');

      lowStockMeds?.forEach(med => {
        newAlerts.push({
          id: `low_stock_${med.name}`,
          type: 'low_stock',
          title: 'Niedriger Lagerbestand',
          description: `${med.name}: ${med.current_stock} Einheiten (Min: ${med.minimum_stock})`,
          priority: med.current_stock === 0 ? 'high' : 'medium',
          actionUrl: '/inventory/medications',
          actionText: 'Nachbestellen'
        });
      });

      // Check for upcoming appointments (next 24 hours)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { data: upcomingAppointments } = await supabase
        .from('appointments')
        .select(`
          *,
          patient(name, spezies)
        `)
        .eq('praxis_id', userInfo?.praxisId)
        .gte('start_time', new Date().toISOString())
        .lt('start_time', tomorrow.toISOString())
        .order('start_time');

      if (upcomingAppointments && upcomingAppointments.length > 0) {
        newAlerts.push({
          id: 'upcoming_appointments',
          type: 'upcoming_appointment',
          title: 'Termine heute',
          description: `${upcomingAppointments.length} Termine in den nächsten 24 Stunden`,
          priority: 'medium',
          actionUrl: '/appointments',
          actionText: 'Termine anzeigen'
        });
      }

      // Check for pending orders
      const { data: pendingOrders } = await supabase
        .from('inventory_orders')
        .select('*')
        .eq('praxis_id', userInfo?.praxisId)
        .eq('status', 'pending');

      if (pendingOrders && pendingOrders.length > 0) {
        newAlerts.push({
          id: 'pending_orders',
          type: 'order_pending',
          title: 'Offene Bestellungen',
          description: `${pendingOrders.length} Bestellungen warten auf Bearbeitung`,
          priority: 'low',
          actionUrl: '/inventory/orders',
          actionText: 'Bestellungen verwalten'
        });
      }

      // Check for patients with overdue follow-ups
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const { data: overduePatients } = await supabase
        .from('patient')
        .select(`
          *,
          behandlungen!inner(created_at)
        `)
        .eq('praxis_id', userInfo?.praxisId)
        .lt('behandlungen.created_at', oneMonthAgo.toISOString())
        .limit(5);

      if (overduePatients && overduePatients.length > 0) {
        newAlerts.push({
          id: 'overdue_patients',
          type: 'patient_overdue',
          title: 'Nachkontrolle empfohlen',
          description: `${overduePatients.length} Patienten ohne Behandlung in letzten 30 Tagen`,
          priority: 'low',
          actionUrl: '/patients',
          actionText: 'Patienten kontaktieren'
        });
      }

      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: Alert['type']) => {
    switch (type) {
      case 'low_stock':
        return <Package className="h-4 w-4" />;
      case 'upcoming_appointment':
        return <Calendar className="h-4 w-4" />;
      case 'patient_overdue':
        return <Users className="h-4 w-4" />;
      case 'order_pending':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: Alert['priority']) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Systembenachrichtigungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div>Lade Benachrichtigungen...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Systembenachrichtigungen</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-muted-foreground">Keine aktuellen Benachrichtigungen</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="mt-1">
                    {getIcon(alert.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{alert.title}</p>
                      <Badge variant={getPriorityColor(alert.priority)}>
                        {alert.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                  </div>
                </div>
                {alert.actionUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(alert.actionUrl!)}
                  >
                    {alert.actionText}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CrossModuleAlerts;
