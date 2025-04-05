
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getInventoryStats } from "@/services/inventoryService";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, PackageOpen, AlertTriangle, Truck, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import InventoryItemsList from "@/components/inventory/InventoryItemsList";
import InventorySuppliersList from "@/components/inventory/InventorySuppliersList";
import InventoryOrdersList from "@/components/inventory/InventoryOrdersList";
import InventoryDashboard from "@/components/inventory/InventoryDashboard";

const Inventory = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { userInfo } = useAuth();
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["inventoryStats"],
    queryFn: getInventoryStats,
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

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
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
        ) : stats ? (
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
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Übersicht</TabsTrigger>
          <TabsTrigger value="items">Artikel</TabsTrigger>
          <TabsTrigger value="orders">Bestellungen</TabsTrigger>
          <TabsTrigger value="suppliers">Lieferanten</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-4">
          <InventoryDashboard />
        </TabsContent>
        
        <TabsContent value="items" className="space-y-4">
          <InventoryItemsList />
        </TabsContent>
        
        <TabsContent value="orders" className="space-y-4">
          <InventoryOrdersList />
        </TabsContent>
        
        <TabsContent value="suppliers" className="space-y-4">
          <InventorySuppliersList />
        </TabsContent>
      </Tabs>
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
