
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Patient } from '../pages/Profile';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';

interface PatientListItemProps {
  patient: Patient;
}

const PatientListItem: React.FC<PatientListItemProps> = ({ patient }) => {
  const navigate = useNavigate();
  
  // Format date to a more readable format
  const formattedDate = patient.geburtsdatum 
    ? new Date(patient.geburtsdatum).toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    : 'Unbekannt';
  
  const handleClick = () => {
    navigate(`/patient/${patient.id}`);
  };
  
  return (
    <div 
      className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-center space-x-3">
        <Avatar>
          {patient.bild_url ? (
            <AvatarImage src={patient.bild_url} alt={patient.name} />
          ) : (
            <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
          )}
        </Avatar>
        <div>
          <h3 className="font-medium">{patient.name}</h3>
          <div className="text-sm text-muted-foreground">
            {patient.spezies} • {patient.rasse || 'Keine Rasse'} • Geb: {formattedDate}
          </div>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="ml-2">
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default PatientListItem;
