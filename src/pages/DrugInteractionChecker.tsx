import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  AlertTriangle,
  Search,
  Plus,
  X,
  Pill,
  AlertCircle,
  CheckCircle2,
  Info,
  BookOpen,
} from "lucide-react";
import {
  checkDrugInteractions,
  getDrugInfo,
  searchDrugs,
  DRUG_DATABASE,
  SEVERITY_COLORS,
  SEVERITY_LABELS,
  type DrugInteraction,
  type DrugInfo,
} from "@/lib/drug-interactions";

export default function DrugInteractionChecker() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const [showInfo, setShowInfo] = useState<DrugInfo | null>(null);

  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    return searchDrugs(searchQuery);
  }, [searchQuery]);

  const interactions = useMemo(() => {
    if (selectedDrugs.length < 2) return [];
    return checkDrugInteractions(selectedDrugs);
  }, [selectedDrugs]);

  const addDrug = (drugName: string) => {
    if (!selectedDrugs.includes(drugName)) {
      setSelectedDrugs((prev) => [...prev, drugName]);
    }
    setSearchQuery("");
  };

  const removeDrug = (drugName: string) => {
    setSelectedDrugs((prev) => prev.filter((d) => d !== drugName));
  };

  const clearAll = () => {
    setSelectedDrugs([]);
  };

  const hasSevereInteractions = interactions.some(
    (i) => i.severity === "contraindicated" || i.severity === "major"
  );

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Arzneimittel-Interaktionsprüfer
          </h1>
          <p className="text-muted-foreground">
            Überprüfen Sie Wechselwirkungen zwischen Medikamenten
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Drug Selection */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Medikamente auswählen
              </CardTitle>
              <CardDescription>
                Suchen und fügen Sie Medikamente zur Interaktionsprüfung hinzu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Medikament suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border rounded-lg divide-y">
                  {searchResults.map((drug) => (
                    <div
                      key={drug.name}
                      className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{drug.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {drug.category} • {drug.species.join(", ")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowInfo(drug)}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addDrug(drug.name)}
                          disabled={selectedDrugs.includes(drug.name)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Drugs */}
              {selectedDrugs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">
                      Ausgewählte Medikamente ({selectedDrugs.length})
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAll}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Alle entfernen
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedDrugs.map((drug) => (
                      <Badge
                        key={drug}
                        variant="secondary"
                        className="px-3 py-1 text-sm"
                      >
                        {drug}
                        <button
                          className="ml-2 hover:text-red-500"
                          onClick={() => removeDrug(drug)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interactions Results */}
          {selectedDrugs.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Interaktionsergebnisse
                </CardTitle>
                <CardDescription>
                  {interactions.length === 0
                    ? "Keine Wechselwirkungen gefunden"
                    : `${interactions.length} Wechselwirkung${interactions.length > 1 ? "en" : ""} gefunden`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {interactions.length === 0 ? (
                  <Alert variant="default" className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <AlertTitle className="text-green-800">
                      Keine Wechselwirkungen
                    </AlertTitle>
                    <AlertDescription className="text-green-700">
                      Zwischen den ausgewählten Medikamenten wurden keine bekannten Wechselwirkungen gefunden.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {hasSevereInteractions && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-5 w-5" />
                        <AlertTitle>Kritische Wechselwirkungen gefunden!</AlertTitle>
                        <AlertDescription>
                          Es wurden schwerwiegende oder kontraindizierte Wechselwirkungen festgestellt. Bitte überprüfen Sie die Empfehlungen sorgfältig.
                        </AlertDescription>
                      </Alert>
                    )}

                    {interactions.map((interaction, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={SEVERITY_COLORS[interaction.severity]}>
                              {SEVERITY_LABELS[interaction.severity]}
                            </Badge>
                            <span className="font-medium">
                              {interaction.drug1} + {interaction.drug2}
                            </span>
                          </div>
                        </div>

                        <div className="grid gap-2 text-sm">
                          <div>
                            <span className="font-medium">Mechanismus: </span>
                            {interaction.mechanism}
                          </div>
                          <div>
                            <span className="font-medium">Effekt: </span>
                            {interaction.effect}
                          </div>
                          <div className="bg-muted p-2 rounded">
                            <span className="font-medium">Empfehlung: </span>
                            {interaction.recommendation}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            Quelle: {interaction.source}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Drug Database */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Medikamenten-Datenbank
              </CardTitle>
              <CardDescription>
                {DRUG_DATABASE.length} Medikamente verfügbar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {DRUG_DATABASE.map((drug) => (
                    <div
                      key={drug.name}
                      className="p-2 border rounded hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setShowInfo(drug)}
                    >
                      <p className="font-medium text-sm">{drug.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {drug.category} • {drug.species.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Drug Info Dialog */}
      {showInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full max-h-[80vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{showInfo.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInfo(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                {showInfo.category} • {showInfo.species.join(", ")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Handelsnamen</h4>
                <div className="flex flex-wrap gap-1">
                  {showInfo.commonTradeNames.map((name) => (
                    <Badge key={name} variant="outline">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2 text-red-600">Kontraindikationen</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {showInfo.contraindications.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2 text-amber-600">Häufige Nebenwirkungen</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {showInfo.commonSideEffects.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>

              {showInfo.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Hinweise</h4>
                    <p className="text-sm text-muted-foreground">{showInfo.notes}</p>
                  </div>
                </>
              )}

              <Button
                className="w-full"
                onClick={() => {
                  addDrug(showInfo.name);
                  setShowInfo(null);
                }}
                disabled={selectedDrugs.includes(showInfo.name)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {selectedDrugs.includes(showInfo.name)
                  ? "Bereits hinzugefügt"
                  : "Zur Prüfung hinzufügen"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
