
import { useNavigate } from "react-router-dom";
import { 
  Calendar, 
  CreditCard, 
  Package2, 
  Pill, 
  Users, 
  Video, 
  Mic, 
  MoreHorizontal 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ModuleCard = ({ 
  title, 
  icon: Icon, 
  path, 
  color = "bg-primary" 
}: { 
  title: string; 
  icon: React.ElementType; 
  path: string; 
  color?: string;
}) => {
  const navigate = useNavigate();
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all duration-200" 
      onClick={() => navigate(path)}
    >
      <CardContent className="p-6 flex flex-col items-center justify-center text-center">
        <div className={`${color} text-white p-4 rounded-full mb-4 mt-2`}>
          <Icon className="h-8 w-8" />
        </div>
        <h3 className="font-medium text-lg">{title}</h3>
      </CardContent>
    </Card>
  );
};

const Index = () => {
  const modules = [
    { 
      title: "Patientenverwaltung", 
      icon: Users, 
      path: "/", 
      color: "bg-blue-500" 
    },
    { 
      title: "Terminplanung", 
      icon: Calendar, 
      path: "/appointments", 
      color: "bg-green-500" 
    },
    { 
      title: "Abrechnung", 
      icon: CreditCard, 
      path: "/billing", 
      color: "bg-purple-500" 
    },
    { 
      title: "Inventar", 
      icon: Package2, 
      path: "/inventory", 
      color: "bg-yellow-500" 
    },
    { 
      title: "Rezeptverwaltung", 
      icon: Pill, 
      path: "/medications", 
      color: "bg-red-500" 
    },
    { 
      title: "Personalverwaltung", 
      icon: Users, 
      path: "/employees", 
      color: "bg-indigo-500" 
    },
    { 
      title: "Telemedizin", 
      icon: Video, 
      path: "/telemedicine", 
      color: "bg-teal-500" 
    },
    { 
      title: "Transkription", 
      icon: Mic, 
      path: "/transcription", 
      color: "bg-pink-500" 
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">Praxismodul-Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {modules.map((module) => (
          <ModuleCard
            key={module.title}
            title={module.title}
            icon={module.icon}
            path={module.path}
            color={module.color}
          />
        ))}
      </div>
    </div>
  );
};

export default Index;
