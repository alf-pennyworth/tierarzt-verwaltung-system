
export interface Appointment {
  id: string;
  praxis_id: string;
  patient_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  created_by: string;
  patient?: {
    id: string;
    name: string;
    spezies: string;
    rasse: string | null;
  };
}
