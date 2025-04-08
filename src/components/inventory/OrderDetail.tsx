
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getOrder, 
  getOrderItems, 
  updateOrderStatus,
  receiveOrderItems
} from "@/services/inventoryService";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  CheckCircle2, 
  Package, 
  ArrowLeft, 
  Loader2, 
  X,
  Truck,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [receivedItems, setReceivedItems] = useState<{ [key: string]: number }>({});
  
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder(id!),
    enabled: !!id
  });
  
  const { data: orderItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["orderItems", id],
    queryFn: () => getOrderItems(id!),
    enabled: !!id
  });
  
  const updateStatusMutation = useMutation({
    mutationFn: ({ status, actualDeliveryDate }: { status: 'pending' | 'ordered' | 'delivered' | 'cancelled', actualDeliveryDate?: string }) => 
      updateOrderStatus(id!, status, actualDeliveryDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["inventoryOrders"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryStats"] });
      toast({
        title: "Status aktualisiert",
        description: "Der Bestellstatus wurde erfolgreich aktualisiert"
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Der Status konnte nicht aktualisiert werden",
        variant: "destructive"
      });
      console.error("Error updating order status:", error);
    }
  });
  
  const receiveItemsMutation = useMutation({
    mutationFn: (items: Array<{ id: string, received_quantity: number }>) => 
      receiveOrderItems(id!, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orderItems", id] });
      queryClient.invalidateQueries({ queryKey: ["inventoryOrders"] });
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryStats"] });
      setShowReceiveDialog(false);
      toast({
        title: "Artikel erhalten",
        description: "Die Artikel wurden erfolgreich als erhalten markiert"
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: "Die Artikel konnten nicht als erhalten markiert werden",
        variant: "destructive"
      });
      console.error("Error receiving order items:", error);
    }
  });
  
  // Initialize received quantities with existing values or ordered quantities
  useEffect(() => {
    if (orderItems.length > 0) {
      const initialItems = orderItems.reduce((acc, item) => {
        acc[item.id] = item.received_quantity || 0;
        return acc;
      }, {} as { [key: string]: number });
      
      setReceivedItems(initialItems);
    }
  }, [orderItems]);
  
  const handleReceiveQuantityChange = (id: string, value: number) => {
    setReceivedItems(prev => ({
      ...prev,
      [id]: value
    }));
  };
  
  const handleReceive = () => {
    const items = Object.entries(receivedItems).map(([id, received_quantity]) => ({
      id,
      received_quantity
    }));
    
    receiveItemsMutation.mutate(items);
  };
  
  const handleMarkAsOrdered = () => {
    updateStatusMutation.mutate({ status: 'ordered' });
  };
  
  const handleCancelOrder = () => {
    updateStatusMutation.mutate({ status: 'cancelled' });
    setShowCancelDialog(false);
  };
  
  const handleBack = () => {
    navigate("/inventory/orders");
  };
  
  if (orderLoading || itemsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!order) {
    return (
      <div className="text-center py-12">
        <p>Bestellung nicht gefunden</p>
        <Button variant="outline" className="mt-4" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
        </Button>
      </div>
    );
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Ausstehend</Badge>;
      case 'ordered':
        return <Badge variant="secondary">Bestellt</Badge>;
      case 'delivered':
        return <Badge>Geliefert</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Storniert</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const isCompleted = order.status === 'delivered' || order.status === 'cancelled';
  const isPending = order.status === 'pending';
  const isOrdered = order.status === 'ordered';
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
        </Button>
        
        {!isCompleted && (
          <div className="flex gap-2">
            {isPending && (
              <Button size="sm" onClick={handleMarkAsOrdered}>
                <Truck className="h-4 w-4 mr-2" /> Als bestellt markieren
              </Button>
            )}
            {isOrdered && (
              <Button size="sm" onClick={() => setShowReceiveDialog(true)}>
                <Package className="h-4 w-4 mr-2" /> Artikel erhalten
              </Button>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              className="text-red-500 hover:bg-red-50 border-red-200"
              onClick={() => setShowCancelDialog(true)}
            >
              <X className="h-4 w-4 mr-2" /> Stornieren
            </Button>
          </div>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                {order.order_number 
                  ? `Bestellung #${order.order_number}` 
                  : `Bestellung #${order.id.substring(0, 8)}`
                }
              </CardTitle>
              <CardDescription>
                Erstellt am {format(new Date(order.created_at), "dd.MM.yyyy")}
              </CardDescription>
            </div>
            {getStatusBadge(order.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Lieferant</p>
              <p>{order.supplier?.name || "Kein Lieferant angegeben"}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">Bestelldatum</p>
              <p className="flex items-center">
                <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                {format(new Date(order.order_date), "dd.MM.yyyy")}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">Erwartetes Lieferdatum</p>
              <p className="flex items-center">
                <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                {order.expected_delivery_date 
                  ? format(new Date(order.expected_delivery_date), "dd.MM.yyyy")
                  : "Nicht angegeben"
                }
              </p>
            </div>
            
            {order.actual_delivery_date && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Tatsächliches Lieferdatum</p>
                <p className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />
                  {format(new Date(order.actual_delivery_date), "dd.MM.yyyy")}
                </p>
              </div>
            )}
            
            {order.notes && (
              <div className="space-y-1 md:col-span-3">
                <p className="text-sm font-medium">Notizen</p>
                <p className="text-muted-foreground">{order.notes}</p>
              </div>
            )}
          </div>
          
          <div className="mt-6">
            <h3 className="font-medium mb-2">Bestellte Artikel</h3>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artikel</TableHead>
                    <TableHead>Einheit</TableHead>
                    <TableHead className="text-right">Menge</TableHead>
                    <TableHead className="text-right">Preis/Einheit</TableHead>
                    <TableHead className="text-right">Gesamtpreis</TableHead>
                    {isOrdered && <TableHead className="text-right">Erhalten</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.item.name}</TableCell>
                      <TableCell>{item.item.masseinheit}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.unit_price.toFixed(2)} €
                      </TableCell>
                      <TableCell className="text-right">
                        {item.total_price.toFixed(2)} €
                      </TableCell>
                      {isOrdered && (
                        <TableCell className="text-right">
                          <Badge variant={item.received_quantity ? "default" : "outline"}>
                            {item.received_quantity || 0} / {item.quantity}
                          </Badge>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={4} className="text-right font-medium">Gesamtbetrag</TableCell>
                  <TableCell className="text-right font-medium">
                    {orderItems.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)} €
                  </TableCell>
                  {isOrdered && <TableCell />}
                </TableRow>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Receive Dialog */}
      <AlertDialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <AlertDialogContent className="sm:max-w-[600px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Wareneingang</AlertDialogTitle>
            <AlertDialogDescription>
              Tragen Sie die erhaltenen Mengen ein. Dies wird automatisch den Lagerbestand erhöhen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="mt-4 max-h-[300px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artikel</TableHead>
                  <TableHead>Bestellt</TableHead>
                  <TableHead className="text-right">Erhalten</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.item.name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={receivedItems[item.id] || 0}
                        onChange={(e) => handleReceiveQuantityChange(
                          item.id, 
                          parseInt(e.target.value) || 0
                        )}
                        className="w-20 text-right ml-auto"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReceive}
              disabled={receiveItemsMutation.isPending}
            >
              {receiveItemsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Speichern...
                </>
              ) : (
                'Wareneingang bestätigen'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bestellung stornieren</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie diese Bestellung stornieren möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Stornieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrderDetail;
