
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Package, ListOrdered, Truck, BarChart3, Pills } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const InventoryNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activePath, setActivePath] = useState("");

  useEffect(() => {
    const path = location.pathname.split('/').pop();
    setActivePath(path || "");
  }, [location]);

  const navigationItems = [
    {
      name: "Übersicht",
      path: "",
      icon: BarChart3,
    },
    {
      name: "Artikel",
      path: "items",
      icon: Package,
    },
    {
      name: "Medikamente",
      path: "medications",
      icon: Pills,
    },
    {
      name: "Bestellungen",
      path: "orders",
      icon: ListOrdered,
    },
    {
      name: "Lieferanten",
      path: "suppliers",
      icon: Truck,
    },
  ];

  return (
    <div className="mb-6 border-b">
      <div className="container flex overflow-auto py-1">
        {navigationItems.map((item) => (
          <Button
            key={item.name}
            variant="ghost"
            className={cn(
              "flex items-center gap-2 rounded-none border-b-2 px-4",
              (
                activePath === item.path || 
                (activePath === "" && item.path === "" && location.pathname === "/inventory")
              ) 
                ? "border-primary text-primary" 
                : "border-transparent"
            )}
            onClick={() => navigate(`/inventory${item.path ? `/${item.path}` : ""}`)}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default InventoryNavigation;
