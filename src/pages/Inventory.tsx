
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { getInventoryStats } from "@/services/inventoryService";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, PackageOpen, AlertTriangle, Truck, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import InventoryItemsList from "@/components/inventory/InventoryItemsList";
import InventorySuppliersList from "@/components/inventory/InventorySuppliersList";
import InventoryOrdersList from "@/components/inventory/InventoryOrdersList";
import InventoryDashboard from "@/components/inventory/InventoryDashboard";
import InventoryNavigation from "@/components/inventory/InventoryNavigation";
import InventoryMedicationsList from "@/components/inventory/InventoryMedicationsList";

const Inventory = () => {
  const { userInfo } = useAuth();
  const location = useLocation();
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["inventoryStats", userInfo?.praxisId],
    queryFn: ({ queryKey }) => getInventoryStats({ queryKey }),
    enabled: !!userInfo?.praxisId
  });

  if (!userInfo?.praxisId) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-40">
          <p className="text-muted-foreground">
            Sie müssen einer Praxis zugeordnet sein, um auf diese Funktion zugreifen zu können.
          </p>
        </div>
      </div>
    );
  }

  // Check if we're on the main inventory page
  const isMainPage = location.pathname === "/inventory";

  return (
    <div>
      <div className="py-8 bg-muted/30">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold">Bestandsverwaltung</h1>
              <p className="text-muted-foreground mt-1">
                Verwalten Sie Ihren Praxisbestand, Bestellungen und Lieferanten
              </p>
            </div>
            
            {statsLoading ? (
              <div className="flex items-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span>Daten werden geladen...</span>
              </div>
            ) : stats && isMainPage ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard 
                  title="Artikel"
                  value={stats.totalItems}
                  icon={<PackageOpen className="h-4 w-4" />}
                />
                <StatCard 
                  title="Niedriger Bestand"
                  value={stats.lowStockItems}
                  icon={<AlertTriangle className="h-4 w-4" />}
                  alert={stats.lowStockItems > 0}
                />
                <StatCard 
                  title="Offene Bestellungen"
                  value={stats.pendingOrders}
                  icon={<Truck className="h-4 w-4" />}
                />
                <StatCard 
                  title="Transaktionen (30d)"
                  value={stats.recentTransactions}
                  icon={<Activity className="h-4 w-4" />}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
      
      <InventoryNavigation />
      
      <div className="container py-4">
        <Routes>
          <Route path="/" element={<InventoryDashboard />} />
          <Route path="/items" element={<InventoryItemsList />} />
          <Route path="/medications" element={<InventoryMedicationsList />} />
          <Route path="/orders" element={<InventoryOrdersList />} />
          <Route path="/suppliers" element={<InventorySuppliersList />} />
          <Route path="*" element={<Navigate to="/inventory" replace />} />
        </Routes>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, alert = false }) => {
  return (
    <Card className={alert ? "border-red-200" : ""}>
      <CardContent className="p-3 flex justify-between items-center">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className={`text-xl font-medium ${alert ? "text-red-600" : ""}`}>{value}</p>
        </div>
        <div className={`rounded-full p-2 ${alert ? "bg-red-100" : "bg-muted"}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
};

export default Inventory;
