
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PatientEventData {
  patientId: string;
  eventType: 'treatment' | 'appointment' | 'consultation' | 'inventory_usage';
  data: any;
  praxisId: string;
}

export const triggerPatientEvent = async (eventData: PatientEventData) => {
  // This could trigger various integrations based on the event
  switch (eventData.eventType) {
    case 'treatment':
      await handleTreatmentEvent(eventData);
      break;
    case 'appointment':
      await handleAppointmentEvent(eventData);
      break;
    case 'consultation':
      await handleConsultationEvent(eventData);
      break;
  }
};

const handleTreatmentEvent = async (eventData: PatientEventData) => {
  // Auto-create follow-up appointment if needed
  if (eventData.data.requiresFollowUp) {
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 14); // 2 weeks later
    
    // Create suggested appointment
    await supabase.from('appointments').insert({
      patient_id: eventData.patientId,
      praxis_id: eventData.praxisId,
      title: 'Nachkontrolle',
      description: `Nachkontrolle für Behandlung vom ${new Date().toLocaleDateString()}`,
      start_time: followUpDate.toISOString(),
      end_time: new Date(followUpDate.getTime() + 30 * 60000).toISOString(), // 30 min
      created_by: (await supabase.auth.getUser()).data.user?.id
    });
  }
};

const handleAppointmentEvent = async (eventData: PatientEventData) => {
  // Send reminder to owner if appointment is scheduled
  const { data: patient } = await supabase
    .from('patient')
    .select(`
      *, 
      besitzer!inner(*)
    `)
    .eq('id', eventData.patientId)
    .single();

  if (patient?.besitzer?.email) {
    // In a real app, this would send an email notification
    console.log(`Appointment reminder would be sent to: ${patient.besitzer.email}`);
  }
};

const handleConsultationEvent = async (eventData: PatientEventData) => {
  // Update patient last consultation date
  await supabase
    .from('patient')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', eventData.patientId);
};

export const getPatientInsights = async (patientId: string) => {
  try {
    // Get comprehensive patient data
    const { data: patient, error: patientError } = await supabase
      .from('patient')
      .select(`
        *,
        besitzer(*),
        behandlungen(*),
        appointments(*),
        video_consultations(*)
      `)
      .eq('id', patientId)
      .single();

    if (patientError) throw patientError;

    const insights = {
      totalTreatments: patient.behandlungen?.length || 0,
      totalAppointments: patient.appointments?.length || 0,
      totalConsultations: patient.video_consultations?.length || 0,
      lastTreatment: patient.behandlungen?.[0]?.created_at,
      nextAppointment: patient.appointments?.find(apt => new Date(apt.start_time) > new Date()),
      medicationsUsed: {} as Record<string, number>,
      commonDiagnoses: {} as Record<string, number>
    };

    // Analyze medication usage
    patient.behandlungen?.forEach(treatment => {
      if (treatment.medikament_typ) {
        insights.medicationsUsed[treatment.medikament_typ] = 
          (insights.medicationsUsed[treatment.medikament_typ] || 0) + 1;
      }
    });

    // Analyze diagnoses
    patient.behandlungen?.forEach(treatment => {
      const diagnosis = treatment.diagnose_fallback || 'Unknown';
      insights.commonDiagnoses[diagnosis] = 
        (insights.commonDiagnoses[diagnosis] || 0) + 1;
    });

    return insights;
  } catch (error) {
    console.error('Error getting patient insights:', error);
    throw error;
  }
};
