
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, Plus, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInventoryItems, getSuppliers, createOrder } from "@/services/inventoryService";
import { MedikamentItem, Supplier } from "@/types/inventory";
import { format } from "date-fns";

type OrderItem = {
  item_id: string;
  item_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type OrderFormData = {
  supplier_id: string;
  order_date: string;
  expected_delivery_date?: string;
  notes?: string;
  order_number?: string;
};

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const CreateOrderDialog = ({ open, onOpenChange, onSuccess }: CreateOrderDialogProps) => {
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<OrderFormData>({
    defaultValues: {
      order_date: format(new Date(), 'yyyy-MM-dd')
    }
  });
  const { toast } = useToast();
  const { userInfo } = useAuth();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);

  const { data: medications = [] } = useQuery({
    queryKey: ["medications", userInfo?.praxisId],
    queryFn: ({ queryKey }) => getInventoryItems({ queryKey }),
    enabled: !!userInfo?.praxisId && open
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: getSuppliers,
    enabled: open
  });

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryOrders"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryStats"] });
      toast({
        title: "Erfolg",
        description: "Bestellung wurde erfolgreich erstellt",
      });
      resetForm();
      if (onSuccess) onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error creating order:", error);
      toast({
        title: "Fehler",
        description: "Beim Erstellen der Bestellung ist ein Fehler aufgetreten",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    reset({
      supplier_id: "",
      order_date: format(new Date(), 'yyyy-MM-dd'),
      expected_delivery_date: "",
      notes: "",
      order_number: ""
    });
    setItems([]);
    setSelectedItem("");
    setQuantity(1);
    setUnitPrice(0);
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItem(itemId);
    const item = medications.find(m => m.id === itemId);
    if (item) {
      setUnitPrice(item.unit_price || 0);
    } else {
      setUnitPrice(0);
    }
  };

  const handleAddItem = () => {
    if (!selectedItem || quantity <= 0) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie ein Medikament aus und geben Sie eine gültige Menge ein",
        variant: "destructive",
      });
      return;
    }

    const item = medications.find(m => m.id === selectedItem);
    if (!item) return;

    const totalPrice = unitPrice * quantity;

    const newItem: OrderItem = {
      item_id: selectedItem,
      item_name: item.name,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice
    };

    console.log("Adding item to order:", newItem);
    setItems(prev => [...prev, newItem]);
    setSelectedItem("");
    setQuantity(1);
    setUnitPrice(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: OrderFormData) => {
    if (!userInfo?.praxisId) {
      toast({
        title: "Fehler",
        description: "Keine Praxis-ID gefunden",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "Fehler",
        description: "Bitte fügen Sie mindestens ein Produkt zur Bestellung hinzu",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);

    // Ensure we have a valid UUID for created_by
    const userId = userInfo?.id || '';
    
    console.log("Submitting order with user ID:", userId);
    console.log("Items being ordered:", items);
    
    const orderData = {
      praxis_id: userInfo.praxisId,
      supplier_id: data.supplier_id,
      order_date: data.order_date,
      expected_delivery_date: data.expected_delivery_date || null,
      order_number: data.order_number || null,
      notes: data.notes || null,
      status: "pending" as const,
      total_amount: totalAmount,
      created_by: userId
    };

    const orderItems = items.map(item => ({
      item_id: item.item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price
    }));

    console.log("Creating order with data:", { order: orderData, items: orderItems });
    
    createOrderMutation.mutate({
      order: orderData,
      items: orderItems
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Neue Bestellung erstellen</DialogTitle>
          <DialogDescription>
            Erstellen Sie eine neue Bestellung für Ihre Praxis
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Lieferant</Label>
              <Select 
                onValueChange={(value) => setValue("supplier_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Lieferant auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier: Supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supplier_id && (
                <p className="text-sm text-red-500">{errors.supplier_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_number">Bestellnummer (optional)</Label>
              <Input
                id="order_number"
                {...register("order_number")}
                placeholder="Interne Bestellnummer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_date">Bestelldatum</Label>
              <Input
                id="order_date"
                type="date"
                {...register("order_date", { required: "Bestelldatum ist erforderlich" })}
              />
              {errors.order_date && (
                <p className="text-sm text-red-500">{errors.order_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_delivery_date">Erwartetes Lieferdatum (optional)</Label>
              <Input
                id="expected_delivery_date"
                type="date"
                {...register("expected_delivery_date")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notizen (optional)</Label>
            <Input
              id="notes"
              {...register("notes")}
              placeholder="Zusätzliche Informationen zur Bestellung"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-2">Bestellpositionen</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="md:col-span-2">
                <Label htmlFor="item">Medikament</Label>
                <Select value={selectedItem} onValueChange={handleSelectItem}>
                  <SelectTrigger>
                    <SelectValue placeholder="Medikament auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {medications.map((medication: MedikamentItem) => (
                      <SelectItem key={medication.id} value={medication.id}>
                        {medication.name} ({medication.masseinheit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="quantity">Menge</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div>
                <Label htmlFor="unitPrice">Preis/Einheit (€)</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleAddItem}
              className="mb-4"
            >
              <Plus className="h-4 w-4 mr-2" /> Artikel hinzufügen
            </Button>
            
            {items.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Artikel</th>
                      <th className="text-left p-2">Menge</th>
                      <th className="text-left p-2">Preis/Einheit</th>
                      <th className="text-left p-2">Gesamtpreis</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{item.item_name}</td>
                        <td className="p-2">{item.quantity}</td>
                        <td className="p-2">{item.unit_price.toFixed(2)} €</td>
                        <td className="p-2">{item.total_price.toFixed(2)} €</td>
                        <td className="p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50">
                    <tr>
                      <td colSpan={3} className="p-2 text-right font-medium">Gesamtbetrag:</td>
                      <td className="p-2 font-medium">
                        {items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)} €
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-4 border rounded-md bg-muted/20">
                <p className="text-muted-foreground">Keine Artikel hinzugefügt</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={createOrderMutation.isPending}>
              {createOrderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Speichern...
                </>
              ) : (
                'Bestellung erstellen'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrderDialog;
