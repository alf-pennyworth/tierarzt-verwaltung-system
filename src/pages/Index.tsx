
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  CreditCard,
  Package2,
  Pill,
  Users,
  Video,
  Mic,
  FilePlus2,
  LayoutDashboard,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ModuleCard = ({
  title,
  icon: Icon,
  onClick,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) => {
  return (
    <Card
      className="hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center justify-center p-6 h-full">
        <Icon className="h-12 w-12 mb-4 text-primary" />
        <h3 className="text-lg font-medium text-center">{title}</h3>
      </CardContent>
    </Card>
  );
};

const Index = () => {
  const navigate = useNavigate();

  const modules = [
    {
      title: "Patientenverwaltung",
      icon: FilePlus2,
      path: "/",
    },
    {
      title: "Terminplanung",
      icon: Calendar,
      path: "/appointments",
    },
    {
      title: "Abrechnung",
      icon: CreditCard,
      path: "/billing",
    },
    {
      title: "Bestand & Vorräte",
      icon: Package2,
      path: "/inventory",
    },
    {
      title: "Rezeptverwaltung",
      icon: Pill,
      path: "/prescriptions",
    },
    {
      title: "Mitarbeiterverwaltung",
      icon: Users,
      path: "/employees",
    },
    {
      title: "Telemedizin",
      icon: Video,
      path: "/telemedicine",
    },
    {
      title: "Transkription",
      icon: Mic,
      path: "/transcription",
    },
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Praxis-Management-System</h1>
        <p className="text-muted-foreground">
          Wählen Sie ein Modul, um fortzufahren
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {modules.map((module) => (
          <ModuleCard
            key={module.title}
            title={module.title}
            icon={module.icon}
            onClick={() => navigate(module.path)}
          />
        ))}
      </div>
    </div>
  );
};

export default Index;
