import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  searchUPDDrugs,
  getUPDDrug,
  searchByActiveSubstance,
  getWithdrawalPeriod,
  formatUPDDrug,
  type UPDDrug,
} from "@/lib/upd-api";
import {
  Database,
  Search,
  Pill,
  AlertCircle,
  Clock,
  Beef,
  Milk,
  Egg,
  Package,
  Shield,
  CheckCircle2,
  X,
  ExternalLink,
  Download,
  Filter,
} from "lucide-react";

export default function DrugDatabasePage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UPDDrug[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<UPDDrug | null>(null);
  const [searchType, setSearchType] = useState<"name" | "substance" | "all">("all");
  const [totalResults, setTotalResults] = useState(0);

  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      let response;
      if (searchType === "substance") {
        response = await searchByActiveSubstance(searchQuery);
      } else {
        response = await searchUPDDrugs(searchQuery);
      }
      
      setResults(response.drugs || []);
      setTotalResults(response.total || 0);

      if (response.drugs?.length === 0) {
        toast({
          title: "Keine Ergebnisse",
          description: "Keine Medikamente für diese Suche gefunden.",
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Fehler",
        description: "Suche fehlgeschlagen. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, searchType, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      performSearch();
    }
  };

  const getPrescriptionBadge = (status: string) => {
    switch (status) {
      case "VetRx":
        return (
          <Badge variant="destructive" className="text-xs">
            <Shield className="h-3 w-3 mr-1" />
            Verschreibungspflichtig
          </Badge>
        );
      case "OTV":
        return (
          <Badge variant="default" className="text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Tierarzneimittel
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            Freiverkäuflich
          </Badge>
        );
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Arzneimittel-Datenbank (EU UPD)
          </h1>
          <p className="text-muted-foreground">
            Offizielle EU-Datenbank für Tierarzneimittel — kostenlos und aktuell
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Medikament suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
              />
            </div>
            <Button onClick={performSearch} disabled={loading}>
              {loading ? "Suchen..." : "Suchen"}
            </Button>
          </div>

          <Tabs value={searchType} onValueChange={(v) => setSearchType(v as any)}>
            <TabsList>
              <TabsTrigger value="all">Alle</TabsTrigger>
              <TabsTrigger value="name">Produktname</TabsTrigger>
              <TabsTrigger value="substance">Wirkstoff</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {results.length} von {totalResults} Ergebnissen
          </p>
          {results.map((drug) => (
            <Card
              key={drug.productNumber}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedDrug(drug)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{drug.productNumber}</Badge>
                      {getPrescriptionBadge(drug.prescriptionStatus)}
                    </div>
                    <h3 className="font-semibold">{drug.productName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {drug.activeSubstances.join(", ")}
                    </p>
                    <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{drug.pharmaceuticalForm}</span>
                      <span>•</span>
                      <span>{drug.targetSpecies.join(", ")}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : searchQuery ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Keine Ergebnisse</h3>
            <p className="text-muted-foreground">
              Versuchen Sie einen anderen Suchbegriff oder wählen Sie einen anderen Suchtyp.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Drug Detail Dialog */}
      {selectedDrug && (
        <Dialog open={!!selectedDrug} onOpenChange={() => setSelectedDrug(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{selectedDrug.productName}</DialogTitle>
              <DialogDescription>
                {selectedDrug.productNumber} • {selectedDrug.pharmaceuticalForm}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm mb-1">Wirkstoffe</h4>
                  <p className="text-sm">{selectedDrug.activeSubstances.join(", ")}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Zulassung</h4>
                  <Badge>{selectedDrug.authorisationStatus}</Badge>
                </div>
              </div>

              {/* Target Species */}
              <div>
                <h4 className="font-medium text-sm mb-2">Zieltierarten</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedDrug.targetSpecies.map((species) => (
                    <Badge key={species} variant="secondary">
                      {species}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Withdrawal Periods */}
              {selectedDrug.withdrawalPeriods && selectedDrug.withdrawalPeriods.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Wartezeiten
                  </h4>
                  <div className="space-y-2">
                    {selectedDrug.withdrawalPeriods.map((wp, idx) => (
                      <div key={idx} className="flex items-center gap-4 text-sm">
                        <span className="font-medium w-24">{wp.species}</span>
                        <div className="flex gap-2">
                          {wp.meat && (
                            <Badge variant="outline">
                              <Beef className="h-3 w-3 mr-1" />
                              Fleisch: {wp.meat}
                            </Badge>
                          )}
                          {wp.milk && (
                            <Badge variant="outline">
                              <Milk className="h-3 w-3 mr-1" />
                              Milch: {wp.milk}
                            </Badge>
                          )}
                          {wp.eggs && (
                            <Badge variant="outline">
                              <Egg className="h-3 w-3 mr-1" />
                              Eier: {wp.eggs}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dosage */}
              {selectedDrug.dosage && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Dosierung</h4>
                  <p className="text-sm bg-muted p-2 rounded">{selectedDrug.dosage}</p>
                </div>
              )}

              {/* Contraindications */}
              {selectedDrug.contraindications && selectedDrug.contraindications.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-1 text-red-600">Kontraindikationen</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {selectedDrug.contraindications.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Side Effects */}
              {selectedDrug.sideEffects && selectedDrug.sideEffects.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-1 text-amber-600">Nebenwirkungen</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {selectedDrug.sideEffects.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Package Sizes */}
              {selectedDrug.packageSizes && selectedDrug.packageSizes.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-1 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Packungsgrößen
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedDrug.packageSizes.map((size, idx) => (
                      <Badge key={idx} variant="outline">{size}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* External Link */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.open(
                    `https://medicines.health.europa.eu/veterinary/en/product/${selectedDrug.productNumber}`,
                    "_blank"
                  );
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                In EU UPD anzeigen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
