import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calculator,
  Plus,
  Minus,
  Trash2,
  FileText,
  Save,
  Search,
  ChevronRight,
  Euro,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GOAEV_POSITIONS,
  GOAEV_CATEGORIES,
  COMMON_BILLING_SCENARIOS,
  calculateGOAEVFee,
  calculateInvoiceTotal,
  getCategoryName,
  getFactorExplanation,
  searchPositions,
  type GOAEVPosition,
  type GOAEVCalculation,
} from "@/lib/goae-v-data";
import { format } from "date-fns";

export default function GOAEVBillingPage() {
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<GOAEVCalculation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState>string | null>(null);
  const [showScenarioDialog, setShowScenarioDialog] = useState(false);
  const [invoiceDialog, setInvoiceDialog] = useState(false);

  const filteredPositions = useMemo(() => {
    if (searchQuery) {
      return searchPositions(searchQuery);
    }
    if (activeCategory) {
      return GOAEV_POSITIONS.filter((p) => p.category === activeCategory);
    }
    return GOAEV_POSITIONS;
  }, [searchQuery, activeCategory]);

  const { subtotal, vatAmount, total } = useMemo(() => {
    return calculateInvoiceTotal(selectedItems, 0); // Veterinary services are typically VAT-exempt
  }, [selectedItems]);

  const addPosition = (position: GOAEVPosition) => {
    const newItem: GOAEVCalculation = {
      position,
      factor: position.typicalFactor,
      calculatedFee: calculateGOAEVFee(position, position.typicalFactor),
      notes: "",
    };
    setSelectedItems((prev) => [...prev, newItem]);
  };

  const removeItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFactor = (index: number, newFactor: number) => {
    setSelectedItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          factor: newFactor,
          calculatedFee: calculateGOAEVFee(item.position, newFactor),
        };
      })
    );
  };

  const updateNotes = (index: number, notes: string) => {
    setSelectedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, notes } : item))
    );
  };

  const applyScenario = (scenarioIndex: number) => {
    const scenario = COMMON_BILLING_SCENARIOS[scenarioIndex];
    const newItems: GOAEVCalculation[] = scenario.items
      .map((item) => {
        const position = GOAEV_POSITIONS.find((p) => p.number === item.position);
        if (!position) return null;
        return {
          position,
          factor: item.factor,
          calculatedFee: calculateGOAEVFee(position, item.factor),
          notes: item.notes,
        };
      })
      .filter((item): item is GOAEVCalculation => item !== null);

    setSelectedItems(newItems);
    setShowScenarioDialog(false);
  };

  const clearAll = () => {
    setSelectedItems([]);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            GOÄ-V Abrechnung
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gebührenordnung für Tierärzte - Leistungen abrechnen
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowScenarioDialog(true)}
          >
            <FileText className="h-4 w-4 mr-1" />
            Szenario laden
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            disabled={selectedItems.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Leeren
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Position Catalog */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Leistungskatalog</CardTitle>
            <CardDescription>
              Suchen Sie nach Positionsnummer oder Beschreibung
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suche nach Position oder Beschreibung..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveCategory(null);
                }}
                className="pl-9"
              />
            </div>

            {/* Category Filter */}
            {!searchQuery && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(null)}
                >
                  Alle
                </Button>
                {Object.entries(GOAEV_CATEGORIES).map(([key, cat]) => (
                  <Button
                    key={key}
                    variant={activeCategory === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory(key)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            )}

            {/* Positions List */}
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {filteredPositions.map((position) => (
                  <div
                    key={position.number}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">{position.number}</Badge>
                          <Badge variant="outline">{position.category}</Badge>
                          {position.isTimeBased && (
                            <Badge variant="outline" className="text-blue-600">
                              <Clock className="h-3 w-3 mr-1" />
                              Zeitbasiert
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">
                          {position.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Basis: {position.baseFee.toFixed(2)} € | Faktor: {position.minFactor}-{position.maxFactor} | Typisch: {position.typicalFactor}x
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={() => addPosition(position)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Panel - Invoice Builder */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Abrechnung</CardTitle>
            <CardDescription>
              {selectedItems.length} Positionen ausgewählt
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {selectedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Keine Positionen</h3>
                <p className="text-muted-foreground max-w-sm">
                  Wählen Sie Positionen aus dem Katalog aus oder laden Sie ein Szenario
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {selectedItems.map((item, index) => (
                    <div key={index} className="p-3 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge>{item.position.number}</Badge>
                            <span className="text-sm font-medium">
                              {item.position.description}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 text-red-600"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Factor Slider */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Faktor: {item.factor.toFixed(1)}x
                          </span>
                          <span className="text-muted-foreground">
                            {getFactorExplanation(item.factor)}
                          </span>
                        </div>
                        <Slider
                          value={[item.factor]}
                          min={item.position.minFactor}
                          max={item.position.maxFactor}
                          step={0.1}
                          onValueChange={([v]) => updateFactor(index, v)}
                        />
                      </div>

                      {/* Fee Display */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {item.position.baseFee.toFixed(2)} € × {item.factor.toFixed(1)} =
                        </span>
                        <span className="text-lg font-bold">
                          {item.calculatedFee.toFixed(2)} €
                        </span>
                      </div>

                      {/* Notes */}
                      <Input
                        placeholder="Notizen (optional)"
                        value={item.notes}
                        onChange={(e) => updateNotes(index, e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>

          {/* Total Section */}
          <CardFooter className="flex-col gap-4 border-t pt-4">
            <div className="w-full space-y-2">
              <div className="flex justify-between text-sm">
                <span>Zwischensumme</span>
                <span>{subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>MwSt. (0%, tierärztliche Leistungen)</span>
                <span>{vatAmount.toFixed(2)} €</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xl font-bold">
                <span>Gesamtsumme</span>
                <span>{total.toFixed(2)} €</span>
              </div>
            </div>

            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                disabled={selectedItems.length === 0}
                onClick={() => setInvoiceDialog(true)}
              >
                <FileText className="h-4 w-4 mr-1" />
                Vorschau
              </Button>
              <Button
                className="flex-1"
                disabled={selectedItems.length === 0}
                onClick={() => {
                  // TODO: Save to database
                  setInvoiceDialog(true);
                }}
              >
                <Save className="h-4 w-4 mr-1" />
                Speichern
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Scenario Dialog */}
      <Dialog open={showScenarioDialog} onOpenChange={setShowScenarioDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Häufige Szenarien</DialogTitle>
            <DialogDescription>
              Wählen Sie ein vorberechnetes Szenario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {COMMON_BILLING_SCENARIOS.map((scenario, index) => {
              const estimatedTotal = scenario.items.reduce((sum, item) => {
                const pos = GOAEV_POSITIONS.find((p) => p.number === item.position);
                return sum + (pos ? calculateGOAEVFee(pos, item.factor) : 0);
              }, 0);

              return (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-between h-auto py-3"
                  onClick={() => applyScenario(index)}
                >
                  <div className="text-left">
                    <p className="font-medium">{scenario.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {scenario.items.length} Positionen
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">~{estimatedTotal.toFixed(2)} €</p>
                    <ChevronRight className="h-4 w-4 inline" />
                  </div>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Preview Dialog */}
      <Dialog open={invoiceDialog} onOpenChange={setInvoiceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rechnungsvorschau</DialogTitle>
            <DialogDescription>
              GOÄ-V Abrechnung - {format(new Date(), "dd.MM.yyyy")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Invoice Items */}
            <div className="border rounded-lg divide-y">
              {selectedItems.map((item, index) => (
                <div key={index} className="p-3 flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {item.position.number} - {item.position.description}
                    </p>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground">{item.notes}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Faktor: {item.factor.toFixed(1)}x
                    </p>
                  </div>
                  <span className="font-bold whitespace-nowrap ml-4">
                    {item.calculatedFee.toFixed(2)} €
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span>Zwischensumme</span>
                <span>{subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>MwSt. (0%)</span>
                <span>{vatAmount.toFixed(2)} €</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xl font-bold">
                <span>Gesamtsumme</span>
                <span>{total.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialog(false)}>
              Schließen
            </Button>
            <Button
              onClick={() => {
                // TODO: Generate PDF
                setInvoiceDialog(false);
              }}
            >
              <FileText className="h-4 w-4 mr-1" />
              Als PDF speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
