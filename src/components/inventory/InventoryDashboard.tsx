
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  getLowStockItems, 
  getExpiringItems,
  getOrders 
} from "@/services/inventoryService";
import { InventoryItem, InventoryOrder } from "@/types/inventory";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CalendarIcon, PackageCheck, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

const InventoryDashboard = () => {
  const navigate = useNavigate();
  
  const { data: lowStockItems, isLoading: lowStockLoading } = useQuery({
    queryKey: ["lowStockItems"],
    queryFn: getLowStockItems
  });
  
  const { data: expiringItems, isLoading: expiringLoading } = useQuery({
    queryKey: ["expiringItems"],
    queryFn: () => getExpiringItems(60) // Show items expiring in the next 60 days
  });
  
  const { data: pendingOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["pendingOrders"],
    queryFn: async () => {
      const allOrders = await getOrders();
      return allOrders.filter(order => ['pending', 'ordered'].includes(order.status));
    }
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
              Artikel mit niedrigem Bestand
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8"
              onClick={() => navigate("/inventory?tab=items&filter=low-stock")}
            >
              <ExternalLink className="h-4 w-4 mr-1" /> Alle anzeigen
            </Button>
          </div>
          <CardDescription>
            Artikel, die nachbestellt werden sollten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lowStockLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : lowStockItems && lowStockItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artikel</TableHead>
                  <TableHead>Aktueller Bestand</TableHead>
                  <TableHead>Min. Bestand</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.slice(0, 5).map((item) => (
                  <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" 
                    onClick={() => navigate(`/inventory/items/${item.id}`)}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <span className={item.current_stock === 0 ? "text-red-600 font-medium" : ""}>
                        {item.current_stock} {item.unit}
                      </span>
                    </TableCell>
                    <TableCell>{item.minimum_stock} {item.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {lowStockItems.length > 5 && (
                <TableCaption>
                  Zeigt 5 von {lowStockItems.length} Artikeln mit niedrigem Bestand.
                </TableCaption>
              )}
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <PackageCheck className="h-12 w-12 text-green-500 mb-2" />
              <p>Alle Artikel haben ausreichenden Bestand.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2 text-amber-500" />
              Ablaufende Artikel
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8"
              onClick={() => navigate("/inventory?tab=items&filter=expiring")}
            >
              <ExternalLink className="h-4 w-4 mr-1" /> Alle anzeigen
            </Button>
          </div>
          <CardDescription>
            Artikel, die in den nächsten 60 Tagen ablaufen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expiringLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : expiringItems && expiringItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artikel</TableHead>
                  <TableHead>Menge</TableHead>
                  <TableHead>Ablaufdatum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringItems.slice(0, 5).map((item) => {
                  const expiryDate = new Date(item.expiry_date!);
                  const today = new Date();
                  const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" 
                      onClick={() => navigate(`/inventory/items/${item.id}`)}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.current_stock} {item.unit}</TableCell>
                      <TableCell>
                        <span className={daysUntilExpiry <= 14 ? "text-red-600 font-medium" : ""}>
                          {format(expiryDate, "dd.MM.yyyy")}
                          {daysUntilExpiry <= 14 && (
                            <span className="ml-2 text-xs">
                              (in {daysUntilExpiry} Tagen)
                            </span>
                          )}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              {expiringItems.length > 5 && (
                <TableCaption>
                  Zeigt 5 von {expiringItems.length} ablaufenden Artikeln.
                </TableCaption>
              )}
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <PackageCheck className="h-12 w-12 text-green-500 mb-2" />
              <p>Keine Artikel laufen in den nächsten 60 Tagen ab.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center">
              <Loader2 className="h-5 w-5 mr-2 text-blue-500" />
              Offene Bestellungen
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8"
              onClick={() => navigate("/inventory?tab=orders")}
            >
              <ExternalLink className="h-4 w-4 mr-1" /> Alle anzeigen
            </Button>
          </div>
          <CardDescription>
            Ausstehende und in Bearbeitung befindliche Bestellungen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pendingOrders && pendingOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bestellnr.</TableHead>
                  <TableHead>Lieferant</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Lieferdatum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrders.slice(0, 5).map((order) => (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" 
                    onClick={() => navigate(`/inventory/orders/${order.id}`)}>
                    <TableCell>{order.order_number || order.id.substring(0, 8)}</TableCell>
                    <TableCell>{order.supplier?.name || "-"}</TableCell>
                    <TableCell>{format(new Date(order.order_date), "dd.MM.yyyy", { locale: de })}</TableCell>
                    <TableCell>
                      {order.expected_delivery_date 
                        ? format(new Date(order.expected_delivery_date), "dd.MM.yyyy", { locale: de })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {order.total_amount 
                        ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(order.total_amount)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {pendingOrders.length > 5 && (
                <TableCaption>
                  Zeigt 5 von {pendingOrders.length} offenen Bestellungen.
                </TableCaption>
              )}
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <PackageCheck className="h-12 w-12 text-green-500 mb-2" />
              <p>Keine offenen Bestellungen vorhanden.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const OrderStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-amber-50 text-amber-800">Ausstehend</Badge>;
    case "ordered":
      return <Badge variant="outline" className="bg-blue-50 text-blue-800">Bestellt</Badge>;
    case "delivered":
      return <Badge variant="outline" className="bg-green-50 text-green-800">Geliefert</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="bg-red-50 text-red-800">Storniert</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default InventoryDashboard;
