
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSuppliers, createSupplier } from "@/services/inventoryService";
import { Supplier } from "@/types/inventory";
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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Building, Phone, Mail, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const InventorySuppliersList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userInfo } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  
  // Form state for new supplier
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    notes: ""
  });
  
  const { data: suppliers, isLoading, refetch } = useQuery({
    queryKey: ["suppliers"],
    queryFn: getSuppliers
  });
  
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: "Fehlende Informationen",
        description: "Name des Lieferanten ist erforderlich.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await createSupplier({
        ...formData,
        praxis_id: userInfo?.praxisId!
      });
      
      toast({
        title: "Lieferant erstellt",
        description: `${formData.name} wurde erfolgreich hinzugefügt.`
      });
      
      // Reset form and close dialog
      setFormData({
        name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
        website: "",
        notes: ""
      });
      setShowDialog(false);
      refetch();
    } catch (error) {
      console.error("Error creating supplier:", error);
      toast({
        title: "Fehler",
        description: "Beim Erstellen des Lieferanten ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    }
  };
  
  // Filter suppliers based on search term
  const filteredSuppliers = suppliers?.filter(supplier => 
    searchTerm === "" || 
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Suche nach Namen, Kontaktperson oder E-Mail..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Lieferant hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Neuer Lieferant</DialogTitle>
              <DialogDescription>
                Fügen Sie einen neuen Lieferanten hinzu.
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
                  <Label htmlFor="contact_person">Ansprechpartner</Label>
                  <Input
                    id="contact_person"
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="notes">Notizen</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
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
      ) : filteredSuppliers && filteredSuppliers.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Kontaktperson</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Website</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.map((supplier) => (
              <TableRow 
                key={supplier.id} 
                className="cursor-pointer"
                onClick={() => navigate(`/inventory/suppliers/${supplier.id}`)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                    {supplier.name}
                  </div>
                </TableCell>
                <TableCell>{supplier.contact_person || "-"}</TableCell>
                <TableCell>
                  {supplier.email ? (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-1 text-muted-foreground" />
                      {supplier.email}
                    </div>
                  ) : "-"}
                </TableCell>
                <TableCell>
                  {supplier.phone ? (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-1 text-muted-foreground" />
                      {supplier.phone}
                    </div>
                  ) : "-"}
                </TableCell>
                <TableCell>
                  {supplier.website ? (
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-1 text-muted-foreground" />
                      {supplier.website}
                    </div>
                  ) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h3 className="text-xl font-medium mb-2">Keine Lieferanten gefunden</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {searchTerm
              ? "Keine Lieferanten entsprechen den Suchkriterien."
              : "Es wurden noch keine Lieferanten hinzugefügt. Fügen Sie einen Lieferanten hinzu, um zu beginnen."}
          </p>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Lieferant hinzufügen
          </Button>
        </div>
      )}
    </div>
  );
};

export default InventorySuppliersList;
