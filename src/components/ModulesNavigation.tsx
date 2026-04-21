import { useNavigate } from "react-router-dom";
import { LayoutDashboard, LayoutGrid, Users, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect } from "react";

const ModulesNavigation = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Add padding to body for mobile navbar
  useEffect(() => {
    const updateBodyPadding = () => {
      if (isMobile) {
        // Add padding to the bottom of the body to prevent content from being hidden by the navbar
        document.body.style.paddingBottom = "68px"; // Height of navbar + some extra space
      } else {
        // Add padding to the top for desktop
        document.body.style.paddingTop = "0";
        document.body.style.paddingBottom = "0";
      }
    };

    updateBodyPadding();
    window.addEventListener("resize", updateBodyPadding);

    return () => {
      document.body.style.paddingBottom = "0";
      document.body.style.paddingTop = "0";
      window.removeEventListener("resize", updateBodyPadding);
    };
  }, [isMobile]);

  // Consistent with main Navigation - logical vet practice flow
  const navigationItems = [
    {
      name: isMobile ? "Dashboard" : "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: isMobile ? "Patienten" : "Patienten",
      href: "/patients",
      icon: Users,
    },
    {
      name: isMobile ? "Module" : "Module",
      href: "/",
      icon: LayoutGrid,
    },
    {
      name: isMobile ? "Profil" : "Profil",
      href: "/profile",
      icon: UserCircle,
    },
  ];

  if (isMobile) {
    return (
      <>
        {/* No spacer needed for mobile - removed to fix white space issue */}
        <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-40">
          <div className="container flex items-center justify-between px-4 py-2">
            {navigationItems.map((item) => (
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
        </nav>
      </>
    );
  }

  return (
    <>
      <div className="h-16" /> {/* Spacer for content on desktop only */}
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

export default ModulesNavigation;
