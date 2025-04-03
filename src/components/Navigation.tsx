
import { useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Users,
  Grid,
  UserCircle,
  LayoutDashboard,
} from "lucide-react";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // Check if we're in a specific module
  const isInModule = location.pathname !== "/" && 
                     !location.pathname.includes("/auth") && 
                     !location.pathname.includes("/employees") && 
                     !location.pathname.includes("/profile");

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Module",
      href: "/",
      icon: Grid,
    },
    {
      name: isMobile ? "Mitarbeiter" : "Mitarbeiterverzeichnis",
      href: "/employees",
      icon: Users,
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
          <div className="container relative flex items-center justify-between px-4 py-2">
            <div className="flex gap-2 mx-auto">
              {navigationItems.map((item) => (
                <Button
                  key={item.name}
                  variant={location.pathname === item.href ? "default" : "ghost"}
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
            className="p-2 mr-4 font-bold text-lg flex items-center gap-2"
            onClick={() => navigate("/")}
          >
            <LayoutDashboard className="h-5 w-5" />
            VetApp
          </Button>
          <div className="flex items-center gap-2">
            {navigationItems.slice(1).map((item) => (
              <Button
                key={item.name}
                variant={location.pathname === item.href ? "default" : "ghost"}
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
