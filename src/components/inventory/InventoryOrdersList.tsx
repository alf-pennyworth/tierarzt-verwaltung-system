
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  getOrders, 
  getSuppliers,
  getInventoryItems,
  createOrder
} from "@/services/inventoryService";
import { InventoryItem, Supplier } from "@/types/inventory";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Trash, CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";

const InventoryOrdersList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userInfo, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  
  // Form state for new order
  const [formData, setFormData] = useState({
    supplier_id: "",
    order_number: "",
    order_date: format(new Date(), "yyyy-MM-dd"),
    expected_delivery_date: "",
    notes: "",
  });
  
  // Order items state
  const [orderItems, setOrderItems] = useState<Array<{
    item_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>>([]);
  
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: getOrders
  });
  
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: getSuppliers
  });
  
  const { data: items = [] } = useQuery({
    queryKey: ["inventoryItems"],
    queryFn: getInventoryItems
  });
  
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleAddItem = () => {
    setOrderItems([
      ...orderItems, 
      { item_id: "", quantity: 1, unit_price: 0, total_price: 0 }
    ]);
  };
  
  const handleRemoveItem = (index: number) => {
    const newItems = [...orderItems];
    newItems.splice(index, 1);
    setOrderItems(newItems);
  };
  
  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...orderItems];
    
    // Type cast value based on field
    if (field === "quantity" || field === "unit_price") {
      value = parseFloat(value as string) || 0;
    }
    
    // @ts-ignore - We know the structure of our items
    newItems[index][field] = value;
    
    // Update total price when quantity or unit_price changes
    if (field === "quantity" || field === "unit_price") {
      const qty = field === "quantity" ? Number(value) : newItems[index].quantity;
      const price = field === "unit_price" ? Number(value) : newItems[index].unit_price;
      newItems[index].total_price = parseFloat((qty * price).toFixed(2));
    }
    
    // Update unit price when item changes
    if (field === "item_id" && value) {
      const selectedItem = items.find(item => item.id === value);
      if (selectedItem && selectedItem.unit_price) {
        newItems[index].unit_price = selectedItem.unit_price;
        newItems[index].total_price = parseFloat((newItems[index].quantity * selectedItem.unit_price).toFixed(2));
      }
    }
    
    setOrderItems(newItems);
  };
  
  const getOrderTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.total_price, 0);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplier_id) {
      toast({
        title: "Fehlende Informationen",
        description: "Bitte wählen Sie einen Lieferanten aus.",
        variant: "destructive",
      });
      return;
    }
    
    if (orderItems.length === 0) {
      toast({
        title: "Fehlende Informationen",
        description: "Bitte fügen Sie mindestens einen Artikel zur Bestellung hinzu.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate all items have an id, quantity > 0, and unit_price >= 0
    const invalidItem = orderItems.find(
      item => !item.item_id || item.quantity <= 0
    );
    
    if (invalidItem) {
      toast({
        title: "Fehlende Informationen",
        description: "Bitte füllen Sie alle Artikeldetails aus und stellen Sie sicher, dass die Menge größer als 0 ist.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await createOrder(
        {
          ...formData,
          praxis_id: userInfo?.praxisId!,
          created_by: user!.id,
          status: "pending",
          total_amount: getOrderTotal()
        },
        orderItems
      );
      
      toast({
        title: "Bestellung erstellt",
        description: "Die Bestellung wurde erfolgreich erstellt."
      });
      
      // Reset form and close dialog
      setFormData({
        supplier_id: "",
        order_number: "",
        order_date: format(new Date(), "yyyy-MM-dd"),
        expected_delivery_date: "",
        notes: "",
      });
      setOrderItems([]);
      setShowDialog(false);
      refetch();
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "Fehler",
        description: "Beim Erstellen der Bestellung ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    }
  };
  
  // Filter orders based on search term and status
  const filteredOrders = orders?.filter(order => {
    const matchesSearch = searchTerm === "" || 
      order.id.includes(searchTerm) ||
      (order.order_number && order.order_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.supplier && order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Suche nach Bestellnummer oder Lieferant..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Alle Status</SelectItem>
              <SelectItem value="pending">Ausstehend</SelectItem>
              <SelectItem value="ordered">Bestellt</SelectItem>
              <SelectItem value="delivered">Geliefert</SelectItem>
              <SelectItem value="cancelled">Storniert</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Bestellung erstellen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[650px]">
            <DialogHeader>
              <DialogTitle>Neue Bestellung</DialogTitle>
              <DialogDescription>
                Erstellen Sie eine neue Bestellung bei einem Lieferanten.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="supplier_id">Lieferant *</Label>
                  <Select 
                    value={formData.supplier_id} 
                    onValueChange={(value) => setFormData({...formData, supplier_id: value})}
                    required
                  >
                    <SelectTrigger id="supplier_id">
                      <SelectValue placeholder="Wählen Sie einen Lieferanten..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="order_number">Bestellnummer</Label>
                  <Input
                    id="order_number"
                    name="order_number"
                    value={formData.order_number}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="order_date">Bestelldatum *</Label>
                  <div className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    <Input
                      id="order_date"
                      name="order_date"
                      type="date"
                      value={formData.order_date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="expected_delivery_date">Erwartetes Lieferdatum</Label>
                  <div className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    <Input
                      id="expected_delivery_date"
                      name="expected_delivery_date"
                      type="date"
                      value={formData.expected_delivery_date}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <Label>Artikel</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="h-4 w-4 mr-1" /> Artikel hinzufügen
                  </Button>
                </div>
                
                {orderItems.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground border rounded-md mt-2">
                    Keine Artikel hinzugefügt. Klicken Sie auf "Artikel hinzufügen".
                  </div>
                ) : (
                  <div className="space-y-2 mt-2">
                    {orderItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                        <div className="flex-1">
                          <Select 
                            value={item.item_id} 
                            onValueChange={(value) => handleItemChange(index, "item_id", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Artikel wählen..." />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((invItem) => (
                                <SelectItem key={invItem.id} value={invItem.id}>
                                  {invItem.name} ({invItem.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="w-20">
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                            placeholder="Menge"
                          />
                        </div>
                        
                        <div className="w-24">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                            placeholder="Preis"
                          />
                        </div>
                        
                        <div className="w-24 text-right">
                          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(item.total_price)}
                        </div>
                        
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <div className="flex justify-end pt-2 border-t">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Gesamtsumme</div>
                        <div className="text-lg font-medium">
                          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(getOrderTotal())}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="notes">Notizen</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={2}
                />
              </div>
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setShowDialog(false)}>
                  Abbrechen
                </Button>
                <Button type="submit">Speichern</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Laden...</p>
          </div>
        </div>
      ) : filteredOrders && filteredOrders.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bestellnummer</TableHead>
              <TableHead>Lieferant</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Lieferdatum</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Betrag</TableHead>
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
                  {order.order_number || order.id.substring(0, 8)}
                </TableCell>
                <TableCell>{order.supplier?.name || "-"}</TableCell>
                <TableCell>{format(new Date(order.order_date), "dd.MM.yyyy", { locale: de })}</TableCell>
                <TableCell>
                  {order.status === "delivered" && order.actual_delivery_date
                    ? format(new Date(order.actual_delivery_date), "dd.MM.yyyy", { locale: de })
                    : order.expected_delivery_date 
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
        </Table>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarIcon className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h3 className="text-xl font-medium mb-2">Keine Bestellungen gefunden</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {searchTerm || statusFilter
              ? "Keine Bestellungen entsprechen den Filterkriterien."
              : "Es wurden noch keine Bestellungen erstellt. Erstellen Sie eine neue Bestellung, um zu beginnen."}
          </p>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Bestellung erstellen
          </Button>
        </div>
      )}
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

// Missing handleSubmit implementation
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!formData.supplier_id) {
    toast({
      title: "Fehlende Informationen",
      description: "Bitte wählen Sie einen Lieferanten aus.",
      variant: "destructive",
    });
    return;
  }
  
  if (orderItems.length === 0) {
    toast({
      title: "Fehlende Informationen",
      description: "Bitte fügen Sie mindestens einen Artikel zur Bestellung hinzu.",
      variant: "destructive",
    });
    return;
  }
  
  // Validate all items have an id, quantity > 0, and unit_price >= 0
  const invalidItem = orderItems.find(
    item => !item.item_id || item.quantity <= 0
  );
  
  if (invalidItem) {
    toast({
      title: "Fehlende Informationen",
      description: "Bitte füllen Sie alle Artikeldetails aus und stellen Sie sicher, dass die Menge größer als 0 ist.",
      variant: "destructive",
    });
    return;
  }
  
  try {
    await createOrder(
      {
        ...formData,
        praxis_id: userInfo?.praxisId!,
        created_by: user!.id,
        status: "pending",
        total_amount: getOrderTotal()
      },
      orderItems
    );
    
    toast({
      title: "Bestellung erstellt",
      description: "Die Bestellung wurde erfolgreich erstellt."
    });
    
    // Reset form and close dialog
    setFormData({
      supplier_id: "",
      order_number: "",
      order_date: format(new Date(), "yyyy-MM-dd"),
      expected_delivery_date: "",
      notes: "",
    });
    setOrderItems([]);
    setShowDialog(false);
    refetch();
  } catch (error) {
    console.error("Error creating order:", error);
    toast({
      title: "Fehler",
      description: "Beim Erstellen der Bestellung ist ein Fehler aufgetreten.",
      variant: "destructive",
    });
  }
};

// Filter orders based on search term and status
const filteredOrders = orders?.filter(order => {
  const matchesSearch = searchTerm === "" || 
    order.id.includes(searchTerm) ||
    (order.order_number && order.order_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (order.supplier && order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const matchesStatus = statusFilter === "" || order.status === statusFilter;
  
  return matchesSearch && matchesStatus;
});

export default InventoryOrdersList;
