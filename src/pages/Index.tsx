
import { useNavigate } from "react-router-dom";
import { CalendarClock, FileSpreadsheet, Pill, Stethoscope, User, FileAudio, Truck, Video, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const MODULES = [
  {
    name: "Transkription",
    icon: FileAudio,
    route: "/transcription",
    description: "Diktat und Transkription von Behandlungsnotizen",
  },
  {
    name: "Terminplanung",
    icon: CalendarClock,
    route: "/appointments",
    description: "Termine planen und verwalten",
  },
  {
    name: "Abrechnung",
    icon: FileSpreadsheet,
    route: "/dashboard",
    description: "Rechnungsstellung und Abrechnung",
    comingSoon: true,
  },
  {
    name: "Bestandsverwaltung",
    icon: Truck,
    route: "/inventory",
    description: "Bestände und Lieferungen verwalten",
  },
  {
    name: "Rezeptverwaltung",
    icon: Pill,
    route: "/dashboard",
    description: "Verschreibungen und Rezepte",
    comingSoon: true,
  },
  {
    name: "Personalverwaltung",
    icon: User,
    route: "/dashboard",
    description: "Mitarbeiter und Dienstpläne",
    comingSoon: true,
  },
  {
    name: "Telemedizin",
    icon: Video,
    route: "/telemedizin",
    description: "Virtuelle Sprechstunden und Patientenkommunikation",
  },
  {
    name: "Patientenmanagement",
    icon: Stethoscope,
    route: "/patients",
    description: "Patientendaten und Behandlungen",
  },
  {
    name: "Tierbesitzer Portal",
    icon: Users,
    route: "/owner",
    description: "Zugang zum Portal für Tierbesitzer",
    external: true,
  },
];

const Index = () => {
  const navigate = useNavigate();

  const handleModuleClick = (module: typeof MODULES[0]) => {
    if (module.comingSoon) return;
    
    if (module.external) {
      window.open(`${window.location.origin}/owner`, '_blank');
    } else {
      navigate(module.route);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Veterinary Management System</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {MODULES.map((module) => (
          <Card 
            key={module.name}
            className={`cursor-pointer hover:shadow-md transition-all ${
              module.comingSoon ? "opacity-60" : ""
            }`}
            onClick={() => handleModuleClick(module)}
          >
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <module.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">{module.name}</h3>
              <p className="text-sm text-muted-foreground">{module.description}</p>
              {module.comingSoon && (
                <span className="mt-3 px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                  Coming Soon
                </span>
              )}
              {module.external && (
                <span className="mt-3 px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Externes Portal
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Index;
