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
  Menu,
  X,
  CalendarClock,
  FileSpreadsheet,
  Pill,
  Stethoscope,
  Video,
  FileAudio,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

const Navigation = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isMenuMounted, setIsMenuMounted] = useState(false);

  // Close menu when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Skip if clicking the menu toggle button
      if (buttonRef.current && buttonRef.current.contains(event.target as Node)) {
        return;
      }
      // Close menu if clicking outside the menu
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Add event listener to body to prevent scrolling when menu is open on mobile
  useEffect(() => {
    if (isMobile && isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, isMenuOpen]);

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

  // Manage animation state - ensure menu is mounted before opening
  useEffect(() => {
    if (isMenuOpen) {
      setIsMenuMounted(true);
    } else {
      // Keep menu mounted during transition
      const timer = setTimeout(() => {
        setIsMenuMounted(false);
      }, 300); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [isMenuOpen]);

  // Mobile navigation items (rearranged as requested)
  const mobileNavigationItems = [
    {
      name: "Patienten",
      href: "/patients",
      icon: ClipboardList,
    },
    {
      name: "Mitarbeiter",
      href: "/employees",
      icon: Users,
    },
    {
      name: "Module",
      href: "/",
      icon: LayoutGrid,
    },
    {
      name: "Profil",
      href: "/profile",
      icon: UserCircle,
    },
  ];

  // Full navigation items for the burger menu
  const fullNavigationItems = [
    {
      name: "Patientenliste",
      href: "/patients",
      icon: ClipboardList,
    },
    {
      name: "Besitzerverzeichnis", 
      href: "/owners",
      icon: Users,
    },
    {
      name: "Module",
      href: "/",
      icon: LayoutGrid,
    },
    {
      name: "Mitarbeiterverzeichnis",
      href: "/employees",
      icon: Users,
    },
    {
      name: "Bestandsverwaltung",
      href: "/inventory",
      icon: Truck,
    },
    {
      name: "Terminplanung",
      href: "/appointments",
      icon: CalendarClock,
    },
    {
      name: "Berichte",
      href: "/reports",
      icon: FileBarChart,
    },
    {
      name: "Transkription",
      href: "/transcription",
      icon: FileAudio,
    },
    {
      name: "Telemedizin",
      href: "/telemedizin",
      icon: Video,
    },
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Profil",
      href: "/profile",
      icon: UserCircle,
    },
  ];

  const toggleMenu = () => {
    if (!isMenuOpen) {
      // First mount the menu, then after a tiny delay set it to open to ensure animation works
      setIsMenuMounted(true);
      setTimeout(() => {
        setIsMenuOpen(true);
      }, 10);
    } else {
      setIsMenuOpen(false);
    }
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const navigateAndCloseMenu = (href: string) => {
    navigate(href);
    closeMenu();
  };

  if (isMobile) {
    return (
      <>
        {/* No spacer needed for mobile - removed to fix white space issue */}
        
        {/* Mobile burger menu overlay - now with proper animations */}
        <div 
          className={cn(
            "fixed inset-0 bottom-16 bg-background z-40 transform transition-transform duration-300 ease-in-out",
            isMenuOpen ? "translate-y-0" : "translate-y-full",
            isMenuMounted ? "block" : "hidden" // Only hide when not mounted
          )}
        >
          <div className="container p-4 pb-16 overflow-y-auto h-full">
            <div className="grid grid-cols-2 gap-4">
              {fullNavigationItems.map((item) => (
                <Button
                  key={item.name}
                  variant="ghost"
                  className="flex items-center justify-start gap-2 w-full p-4 h-auto"
                  onClick={() => navigateAndCloseMenu(item.href)}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Semi-transparent overlay for mobile */}
        <div 
          className={cn(
            "fixed inset-0 bottom-16 bg-black/50 z-30 transition-opacity duration-300", 
            isMenuOpen ? "opacity-100" : "opacity-0",
            isMenuMounted ? "block" : "hidden" // Only hide when not mounted
          )}
          onClick={closeMenu}
        />
        
        <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-50">
          <div className="absolute left-1/2 -translate-x-1/2 -top-8 h-16 w-16 bg-[hsl(var(--background))] rounded-full border-b border-[hsl(var(--border))]" />
          <Button
            ref={buttonRef}
            className="absolute left-1/2 -translate-x-1/2 -top-6 rounded-full w-12 h-12 p-0 shadow-lg z-50"
            onClick={toggleMenu}
          >
            <div className="relative w-5 h-5">
              <Menu className={cn(
                "absolute inset-0 h-5 w-5 transition-all duration-300 ease-in-out",
                isMenuOpen ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
              )} />
              <X className={cn(
                "absolute inset-0 h-5 w-5 transition-all duration-300 ease-in-out",
                isMenuOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-0"
              )} />
            </div>
          </Button>
          <div className="container relative flex items-center justify-between px-4 py-2">
            {mobileNavigationItems.map((item) => (
              <Button
                key={item.name}
                variant="ghost"
                className="flex-col gap-1 h-auto py-2"
                onClick={() => navigateAndCloseMenu(item.href)}
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
      
      {/* Semi-transparent overlay for desktop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-30 transition-opacity duration-300", 
          isMenuOpen ? "opacity-100" : "opacity-0",
          isMenuMounted ? "block" : "hidden" // Only hide when not mounted
        )}
        onClick={closeMenu}
      />
      
      <nav className="fixed top-0 left-0 right-0 bg-background border-b z-50">
        <div className="container flex items-center justify-between h-16 px-4">
          <Button
            ref={buttonRef}
            variant="ghost"
            className="p-2 mr-4"
            onClick={toggleMenu}
            aria-label="Menu"
          >
            <div className="relative w-6 h-6">
              <Menu className={cn(
                "absolute inset-0 h-6 w-6 transition-all duration-300 ease-in-out",
                isMenuOpen ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
              )} />
              <X className={cn(
                "absolute inset-0 h-6 w-6 transition-all duration-300 ease-in-out",
                isMenuOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-0"
              )} />
            </div>
          </Button>
          <div className="flex items-center gap-2">
            {/* Display a few important navigation items directly in the top bar */}
            <Button variant="ghost" className="gap-2" onClick={() => navigate("/patients")}>
              <ClipboardList className="h-5 w-5" />
              Patientenliste
            </Button>
            <Button variant="ghost" className="gap-2" onClick={() => navigate("/employees")}>
              <Users className="h-5 w-5" />
              Mitarbeiter
            </Button>
            <Button variant="ghost" className="gap-2" onClick={() => navigate("/profile")}>
              <UserCircle className="h-5 w-5" />
              Profil
            </Button>
          </div>
        </div>
        
        {/* Burger menu dropdown for desktop - with proper animation */}
        <div 
          ref={menuRef}
          className={cn(
            "absolute top-16 left-0 w-64 bg-background border-r shadow-lg h-[calc(100vh-4rem)] overflow-y-auto z-40 transform transition-transform duration-300 ease-in-out",
            isMenuOpen ? "translate-x-0" : "-translate-x-full",
            isMenuMounted ? "block" : "hidden" // Only hide when not mounted
          )}
        >
          <div className="py-2">
            {fullNavigationItems.map((item) => (
              <Button
                key={item.name}
                variant="ghost"
                className="flex items-center justify-start gap-2 w-full px-4 py-3 rounded-none"
                onClick={() => navigateAndCloseMenu(item.href)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Button>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
