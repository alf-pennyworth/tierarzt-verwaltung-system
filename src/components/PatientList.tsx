
import React from 'react';
import { Patient } from '../pages/Profile';
import PatientListItem from './PatientListItem';

interface PatientListProps {
  patients: Patient[];
}

const PatientList: React.FC<PatientListProps> = ({ patients }) => {
  if (patients.length === 0) {
    return (
      <div className="text-center p-8 border rounded-md bg-muted/30">
        <p className="text-muted-foreground">Keine Patienten gefunden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {patients.map((patient) => (
        <PatientListItem key={patient.id} patient={patient} />
      ))}
    </div>
  );
};

export default PatientList;
