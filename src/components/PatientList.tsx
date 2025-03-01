import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Patient } from '../pages/Profile';

interface PatientListProps {
  patients: Patient[];
}

const PatientList: React.FC<PatientListProps> = ({ patients }) => {
  if (patients.length === 0) {
    return <p>Keine Patienten gefunden.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {patients.map((patient) => (
        <Card key={patient.id}>
          <CardHeader className="flex items-center space-x-4">
            <Avatar>
              {patient.bild_url ? (
                <AvatarImage src={patient.bild_url} alt={patient.name} />
              ) : (
                <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
              )}
            </Avatar>
            <CardTitle>{patient.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Spezies: {patient.spezies}</p>
            <p>Rasse: {patient.rasse}</p>
            <p>Geburtsdatum: {new Date(patient.geburtsdatum).toLocaleDateString()}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PatientList;
