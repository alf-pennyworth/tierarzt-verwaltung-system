
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOrders } from "@/services/inventoryService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { InventoryOrder } from "@/types/inventory";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { 
  ShoppingCart, ChevronRight, Plus, 
  CalendarClock, RefreshCw 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const InventoryOrdersList = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["inventoryOrders"],
    queryFn: getOrders
  });
  
  // Filter orders based on status
  const filteredOrders = orders.filter(order => {
    if (filter === "all") return true;
    return order.status === filter;
  });
  
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending": return "outline";
      case "ordered": return "secondary";
      case "delivered": return "default";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={filter === "all" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("all")}
          >
            Alle
          </Button>
          <Button 
            variant={filter === "pending" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("pending")}
          >
            Ausstehend
          </Button>
          <Button 
            variant={filter === "ordered" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("ordered")}
          >
            Bestellt
          </Button>
          <Button 
            variant={filter === "delivered" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("delivered")}
          >
            Geliefert
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => navigate("/inventory/orders/new")}>
            <Plus className="h-4 w-4 mr-2" /> Neue Bestellung
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="grid gap-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bestell-Nr.</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Lieferant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Betrag</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow 
                      key={order.id} 
                      className="cursor-pointer"
                      onClick={() => navigate(`/inventory/orders/${order.id}`)}
                    >
                      <TableCell className="font-medium">
                        {order.order_number || `Bestellung #${order.id.substring(0, 8)}`}
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.order_date), "dd.MM.yyyy")}
                      </TableCell>
                      <TableCell>
                        {order.supplier?.name || "Kein Lieferant"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {order.status === "pending" && "Ausstehend"}
                          {order.status === "ordered" && "Bestellt"}
                          {order.status === "delivered" && "Geliefert"}
                          {order.status === "cancelled" && "Storniert"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.total_amount 
                          ? `${order.total_amount.toFixed(2)} €` 
                          : "-"
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingCart className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h3 className="text-xl font-medium mb-2">Keine Bestellungen gefunden</h3>
          <p className="text-muted-foreground mb-6">
            {filter !== "all" 
              ? `Es gibt keine Bestellungen mit dem Status "${filter}"`
              : "Es wurden noch keine Bestellungen aufgezeichnet"
            }
          </p>
          <Button onClick={() => navigate("/inventory/orders/new")}>
            <Plus className="h-4 w-4 mr-2" /> Neue Bestellung erstellen
          </Button>
        </div>
      )}
    </div>
  );
};

export default InventoryOrdersList;
