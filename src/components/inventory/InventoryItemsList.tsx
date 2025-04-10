import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { 
  getInventoryItems, 
  getInventoryCategories,
  getInventoryUnits,
  createInventoryItem
} from "@/services/inventoryService";
import { MedikamentItem } from "@/types/inventory";
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
import { AlertTriangle, Plus, Search, Package2, CalendarRange } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const InventoryItemsList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { userInfo } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get("tab");
  const filterParam = queryParams.get("filter");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    sku: "",
    current_stock: 0,
    minimum_stock: 0,
    masseinheit: "",
    unit_price: undefined as number | undefined,
    location: "",
    expiry_date: "",
  });
  
  const { data: items, isLoading, refetch } = useQuery({
    queryKey: ["inventoryItems", userInfo?.praxisId],
    queryFn: ({ queryKey }) => getInventoryItems({ queryKey }),
    enabled: !!userInfo?.praxisId
  });
  
  const { data: categories = [] } = useQuery({
    queryKey: ["inventoryCategories"],
    queryFn: getInventoryCategories
  });
  
  const { data: units = [] } = useQuery({
    queryKey: ["inventoryUnits"],
    queryFn: getInventoryUnits
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "current_stock" || name === "minimum_stock") {
      setFormData({ ...formData, [name]: parseInt(value) || 0 });
    } else if (name === "unit_price") {
      setFormData({ ...formData, [name]: value ? parseFloat(value) : undefined });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.masseinheit) {
      toast({
        title: "Fehlende Informationen",
        description: "Name und Einheit sind erforderlich.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await createInventoryItem({
        name: formData.name,
        description: formData.description,
        sku: formData.sku,
        current_stock: formData.current_stock,
        minimum_stock: formData.minimum_stock,
        masseinheit: formData.masseinheit,
        unit_price: formData.unit_price,
        location: formData.location,
        expiry_date: formData.expiry_date,
        praxis_id: userInfo?.praxisId!
      });
      
      toast({
        title: "Artikel erstellt",
        description: `${formData.name} wurde erfolgreich hinzugefügt.`
      });
      
      setFormData({
        name: "",
        description: "",
        category: "",
        sku: "",
        current_stock: 0,
        minimum_stock: 0,
        masseinheit: "",
        unit_price: undefined,
        location: "",
        expiry_date: "",
      });
      setShowDialog(false);
      refetch();
    } catch (error) {
      console.error("Error creating inventory item:", error);
      toast({
        title: "Fehler",
        description: "Beim Erstellen des Artikels ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    }
  };
  
  const filteredItems = items?.filter(item => {
    const matchesSearch = searchTerm === "" || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    
    let matchesUrlFilter = true;
    if (filterParam === "low-stock") {
      matchesUrlFilter = item.current_stock <= item.minimum_stock;
    } else if (filterParam === "expiring") {
      if (!item.expiry_date) return false;
      
      const expiryDate = new Date(item.expiry_date);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);
      matchesUrlFilter = expiryDate <= futureDate;
    }
    
    return matchesSearch && matchesCategory && matchesUrlFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Suche nach Namen, Beschreibung oder SKU..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Kategorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kategorien</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Artikel hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Neuer Artikel</DialogTitle>
              <DialogDescription>
                Fügen Sie einen neuen Artikel zum Inventar hinzu.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="description">Beschreibung</Label>
                  <Input
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Kategorie</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => handleSelectChange("category", value)}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Sonstige</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="sku">Artikelnummer (SKU)</Label>
                  <Input
                    id="sku"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="current_stock">Aktueller Bestand</Label>
                  <Input
                    id="current_stock"
                    name="current_stock"
                    type="number"
                    min="0"
                    value={formData.current_stock}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="minimum_stock">Mindestbestand</Label>
                  <Input
                    id="minimum_stock"
                    name="minimum_stock"
                    type="number"
                    min="0"
                    value={formData.minimum_stock}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="masseinheit">Einheit *</Label>
                  <Select 
                    value={formData.masseinheit} 
                    onValueChange={(value) => handleSelectChange("masseinheit", value)}
                    required
                  >
                    <SelectTrigger id="masseinheit">
                      <SelectValue placeholder="Wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {units.length > 0 ? (
                        units.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="Stück">Stück</SelectItem>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="l">l</SelectItem>
                          <SelectItem value="mg">mg</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="Packung">Packung</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="unit_price">Preis pro Einheit (€)</Label>
                  <Input
                    id="unit_price"
                    name="unit_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_price}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="location">Lagerort</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="expiry_date">Ablaufdatum</Label>
                  <Input
                    id="expiry_date"
                    name="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={handleInputChange}
                  />
                </div>
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
      ) : filteredItems && filteredItems.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Bestand</TableHead>
              <TableHead>Mindestbestand</TableHead>
              <TableHead>Lagerort</TableHead>
              <TableHead>Ablaufdatum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow 
                key={item.id} 
                className="cursor-pointer"
                onClick={() => navigate(`/inventory/items/${item.id}`)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    {item.name}
                    {item.current_stock <= item.minimum_stock && (
                      <AlertTriangle className="h-4 w-4 ml-2 text-amber-500" />
                    )}
                  </div>
                  {item.sku && (
                    <span className="text-xs text-muted-foreground">SKU: {item.sku}</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.category && (
                    <Badge variant="outline">{item.category}</Badge>
                  )}
                </TableCell>
                <TableCell className={item.current_stock <= item.minimum_stock ? "text-amber-600 font-medium" : ""}>
                  {item.current_stock} {item.masseinheit}
                </TableCell>
                <TableCell>{item.minimum_stock} {item.masseinheit}</TableCell>
                <TableCell>{item.location || "-"}</TableCell>
                <TableCell>
                  {item.expiry_date ? (
                    <>
                      {format(new Date(item.expiry_date), "dd.MM.yyyy")}
                      {new Date(item.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                        <CalendarRange className="inline h-4 w-4 ml-1 text-red-500" />
                      )}
                    </>
                  ) : (
                    "-"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package2 className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h3 className="text-xl font-medium mb-2">Keine Artikel gefunden</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {searchTerm || categoryFilter !== "all" || filterParam
              ? "Keine Artikel entsprechen den Filterkriterien. Versuchen Sie, die Filter anzupassen."
              : "Es wurden noch keine Artikel hinzugefügt. Fügen Sie einen neuen Artikel hinzu, um zu beginnen."}
          </p>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Artikel hinzufügen
          </Button>
        </div>
      )}
    </div>
  );
};

export default InventoryItemsList;
