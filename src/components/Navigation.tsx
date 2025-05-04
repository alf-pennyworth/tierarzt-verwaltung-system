
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Users,
  ClipboardList,
  FileBarChart,
  UserCircle,
  LayoutDashboard,
  LayoutGrid,
  Truck,
} from "lucide-react";

const Navigation = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const navigationItems = [
    {
      name: isMobile ? "Patienten" : "Patientenliste",
      href: "/patients",
      icon: ClipboardList,
    },
    {
      name: isMobile ? "Besitzer" : "Besitzerverzeichnis", 
      href: "/owners",
      icon: Users,
    },
    {
      name: isMobile ? "Module" : "Module",
      href: "/",
      icon: LayoutGrid,
    },
    {
      name: isMobile ? "Mitarbeiter" : "Mitarbeiterverzeichnis",
      href: "/employees",
      icon: Users,
    },
    {
      name: isMobile ? "Bestand" : "Bestandsverwaltung",
      href: "/inventory",
      icon: Truck,
    },
    {
      name: "Berichte",
      href: "/reports",
      icon: FileBarChart,
    },
    {
      name: "Profil",
      href: "/profile",
      icon: UserCircle,
    },
  ];

  if (isMobile) {
    return (
      <>
        <div className="h-16" /> {/* Spacer for content */}
        <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-40">
          <div className="absolute left-1/2 -translate-x-1/2 -top-8 h-16 w-16 bg-[hsl(var(--background))] rounded-full border-b border-[hsl(var(--border))]" />
          <Button
            className="absolute left-1/2 -translate-x-1/2 -top-6 rounded-full w-12 h-12 p-0 shadow-lg z-50"
            onClick={() => navigate("/dashboard")}
          >
            <LayoutDashboard className="h-5 w-5" />
          </Button>
          <div className="container relative flex items-center justify-between px-4 py-2">
            <div className="flex gap-2">
              {navigationItems.slice(0, 3).map((item) => (
                <Button
                  key={item.name}
                  variant="ghost"
                  className="flex-col gap-1 h-auto py-2"
                  onClick={() => navigate(item.href)}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs">{item.name}</span>
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              {navigationItems.slice(3).map((item) => (
                <Button
                  key={item.name}
                  variant="ghost"
                  className="flex-col gap-1 h-auto py-2"
                  onClick={() => navigate(item.href)}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs">{item.name}</span>
                </Button>
              ))}
            </div>
          </div>
        </nav>
      </>
    );
  }

  return (
    <>
      <div className="h-16" /> {/* Spacer for content */}
      <nav className="fixed top-0 left-0 right-0 bg-background border-b z-50">
        <div className="container flex items-center justify-between h-16 px-4">
          <Button
            variant="ghost"
            className="p-2 mr-4"
            onClick={() => navigate("/dashboard")}
          >
            <LayoutDashboard className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-2">
            {navigationItems.map((item) => (
              <Button
                key={item.name}
                variant="ghost"
                className="gap-2"
                onClick={() => navigate(item.href)}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Button>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
