import { supabase } from '@/integrations/supabase/client';
import type { Appointment } from '@/types/appointments';

export interface CreateAppointmentInput {
  patient_id?: string;
  besitzer_id?: string;
  title: string;
  description?: string;
  appointment_type?: 'consultation' | 'surgery' | 'vaccination' | 'follow_up' | 'emergency';
  start_time: string;
  end_time: string;
  duration_minutes?: number;
  notes?: string;
}

/**
 * Get appointments for a practice with optional filters
 */
export async function getAppointments(
  praxisId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    vetId?: string;
  }
) {
  let query = supabase
    .from('appointments')
    .select(`
      *,
      patient:patient_id (id, name, species),
      besitzer:besitzer_id (id, name, email)
    `)
    .eq('praxis_id', praxisId)
    .order('start_time', { ascending: true });

  if (filters?.startDate) {
    query = query.gte('start_time', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('start_time', filters.endDate);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.vetId) {
    query = query.eq('vet_id', filters.vetId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Appointment[];
}

/**
 * Get today's appointments
 */
export async function getTodayAppointments(praxisId: string) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  return getAppointments(praxisId, {
    startDate: today,
    endDate: tomorrow,
    status: 'scheduled'
  });
}

/**
 * Create a new appointment
 */
export async function createAppointment(
  praxisId: string,
  userId: string,
  input: CreateAppointmentInput
): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      praxis_id: praxisId,
      created_by: userId,
      vet_id: userId,
      ...input,
      status: 'scheduled'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update appointment status
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show',
  cancellationReason?: string
) {
  const updates: any = { status };
  if (cancellationReason) {
    updates.cancellation_reason = cancellationReason;
  }

  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Send reminder for appointment
 */
export async function sendAppointmentReminder(appointmentId: string) {
  const { data, error } = await supabase
    .from('appointments')
    .update({
      reminder_sent: true,
      reminder_sent_at: new Date().toISOString()
    })
    .eq('id', appointmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete appointment (soft delete)
 */
export async function deleteAppointment(appointmentId: string) {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', appointmentId);

  if (error) throw error;
}

/**
 * Get appointment statistics
 */
export async function getAppointmentStats(praxisId: string, period: 'week' | 'month' = 'week') {
  const now = new Date();
  const startDate = period === 'week' 
    ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('appointments')
    .select('status')
    .eq('praxis_id', praxisId)
    .gte('start_time', startDate.toISOString());

  if (error) throw error;

  const stats = {
    total: data?.length || 0,
    completed: data?.filter(a => a.status === 'completed').length || 0,
    cancelled: data?.filter(a => a.status === 'cancelled').length || 0,
    noShow: data?.filter(a => a.status === 'no_show').length || 0,
    scheduled: data?.filter(a => a.status === 'scheduled').length || 0
  };

  return stats;
}
