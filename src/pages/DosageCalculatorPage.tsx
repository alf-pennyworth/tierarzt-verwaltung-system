import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  dosageDatabase,
  calculateDose,
  findDosageByDrug,
  searchDrugs,
  type DosageEntry,
} from "@/lib/vet-dosage-data";
import {
  Calculator,
  Search,
  Pill,
  AlertTriangle,
  Weight,
  Clock,
  Syringe,
  HeartPulse,
  Baby,
  FlaskConical,
  Info,
  ChevronRight,
  Dog,
  Cat,
  Rabbit,
} from "lucide-react";

const SPECIES_ICONS: Record<string, React.ReactNode> = {
  dog: <Dog className="h-4 w-4" />,
  cat: <Cat className="h-4 w-4" />,
  rabbit: <Rabbit className="h-4 w-4" />,
  "guinea pig": <HeartPulse className="h-4 w-4" />,
  horse: <HeartPulse className="h-4 w-4" />,
};

export default function DosageCalculatorPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDrug, setSelectedDrug] = useState<DosageEntry | null>(null);
  const [species, setSpecies] = useState<string>("");
  const [weight, setWeight] = useState<number>(10);
  const [activeTab, setActiveTab] = useState("calculator");

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchDrugs(searchQuery).slice(0, 10);
  }, [searchQuery]);

  const selectedSpeciesDosage = useMemo(() => {
    if (!selectedDrug || !species) return null;
    return selectedDrug.dosages.find(
      (d) => d.species === species.toLowerCase()
    );
  }, [selectedDrug, species]);

  const calculatedDose = useMemo(() => {
    if (!selectedDrug || !species || weight <= 0) return null;
    return calculateDose(selectedDrug.drugName, species, weight);
  }, [selectedDrug, species, weight]);

  const availableSpecies = useMemo(() => {
    if (!selectedDrug) return [];
    return selectedDrug.dosages.map((d) => d.species);
  }, [selectedDrug]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Dosierungsrechner
        </h1>
        <p className="text-muted-foreground">
          Art-, gewichts- und indikationsbasierte Dosierung nach EU-Richtlinien
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Medikament suchen..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedDrug(null);
              }}
              className="pl-9"
            />
          </div>

          {searchResults.length > 0 && !selectedDrug && (
            <div className="border rounded-md overflow-hidden">
              {searchResults.map((drug) => (
                <button
                  key={drug.drugName}
                  className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0 flex items-center justify-between"
                  onClick={() => {
                    setSelectedDrug(drug);
                    setSearchQuery(drug.drugName);
                    setSpecies("");
                  }}
                >
                  <div>
                    <p className="font-medium">{drug.drugName}</p>
                    <p className="text-sm text-muted-foreground">
                      {drug.activeIngredient}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedDrug && (
        <>
          {/* Drug Info Card */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    {selectedDrug.drugName}
                  </CardTitle>
                  <CardDescription>{selectedDrug.activeIngredient}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedDrug(null);
                    setSearchQuery("");
                    setSpecies("");
                  }}
                >
                  Ändern
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Indications */}
              <div>
                <h4 className="text-sm font-medium mb-2">Indikationen</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedDrug.indications.map((ind) => (
                    <Badge key={ind} variant="secondary">
                      {ind}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Contraindications */}
              {selectedDrug.contraindications.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Kontraindikationen</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-1">
                      {selectedDrug.contraindications.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Species Selector */}
              <div>
                <h4 className="text-sm font-medium mb-2">Tierart wählen</h4>
                <div className="flex flex-wrap gap-2">
                  {availableSpecies.map((s) => (
                    <Button
                      key={s}
                      variant={species === s ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSpecies(s)}
                      className="flex items-center gap-1"
                    >
                      {SPECIES_ICONS[s] || <HeartPulse className="h-4 w-4" />}
                      {s === "dog"
                        ? "Hund"
                        : s === "cat"
                        ? "Katze"
                        : s === "rabbit"
                        ? "Kaninchen"
                        : s === "guinea pig"
                        ? "Meerschweinchen"
                        : s}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Weight Input */}
              {species && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Weight className="h-4 w-4" />
                      Gewicht
                    </label>
                    <Badge variant="secondary">{weight} kg</Badge>
                  </div>
                  <Slider
                    value={[weight]}
                    onValueChange={(v) => setWeight(v[0])}
                    min={0.5}
                    max={80}
                    step={0.5}
                    className="w-full"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                      className="w-24"
                      step={0.1}
                    />
                    <span className="text-sm text-muted-foreground">kg</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dosage Result */}
          {calculatedDose && (
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Syringe className="h-5 w-5" />
                  Dosierungsempfehlung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Einzeldosis
                    </p>
                    <p className="text-2xl font-bold">
                      {calculatedDose.minDose === calculatedDose.maxDose
                        ? `${calculatedDose.minDose} ${calculatedDose.unit}`
                        : `${calculatedDose.minDose} - ${calculatedDose.maxDose} ${calculatedDose.unit}`}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Häufigkeit
                    </p>
                    <p className="text-2xl font-bold">{calculatedDose.frequency}</p>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">
                    Behandlungsdauer
                  </p>
                  <p className="text-lg font-semibold">{calculatedDose.duration}</p>
                </div>

                {calculatedDose.notes && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>{calculatedDose.notes}</AlertDescription>
                  </Alert>
                )}

                {/* Route */}
                {selectedSpeciesDosage && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Syringe className="h-4 w-4" />
                    <span className="capitalize">{selectedSpeciesDosage.route}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Additional Info Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="calculator">Rechner</TabsTrigger>
              <TabsTrigger value="formulations">Darreichungsformen</TabsTrigger>
              <TabsTrigger value="safety">Sicherheit</TabsTrigger>
            </TabsList>

            <TabsContent value="formulations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    Verfügbare Darreichungsformen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedDrug.formulations.map((form, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{form.strength}</p>
                        <Badge variant="outline">{form.form}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Größen: {form.sizes.join(", ")}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="safety" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Sicherheitsinformationen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedDrug.safetyMargins.toxicDose && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Toxische Dosis</AlertTitle>
                      <AlertDescription>
                        {selectedDrug.safetyMargins.toxicDose}
                      </AlertDescription>
                    </Alert>
                  )}

                  {selectedDrug.safetyMargins.overdoseSymptoms && (
                    <div>
                      <h4 className="font-medium mb-2">Überdosierungssymptome</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {selectedDrug.safetyMargins.overdoseSymptoms.map(
                          (symptom) => (
                            <li key={symptom} className="text-sm">
                              {symptom}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  {Object.entries(selectedDrug.specialPopulations).length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Baby className="h-4 w-4" />
                        Besondere Populationen
                      </h4>
                      <div className="space-y-2">
                        {selectedDrug.specialPopulations.puppiesKittens && (
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-sm font-medium">Welpen/Junge Tiere</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedDrug.specialPopulations.puppiesKittens}
                            </p>
                          </div>
                        )}
                        {selectedDrug.specialPopulations.pregnant && (
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-sm font-medium">Trächtigkeit</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedDrug.specialPopulations.pregnant}
                            </p>
                          </div>
                        )}
                        {selectedDrug.specialPopulations.renal && (
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-sm font-medium">Niereninsuffizienz</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedDrug.specialPopulations.renal}
                            </p>
                          </div>
                        )}
                        {selectedDrug.specialPopulations.hepatic && (
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-sm font-medium">Leberinsuffizienz</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedDrug.specialPopulations.hepatic}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {!selectedDrug && !searchQuery && (
        <Card>
          <CardContent className="p-8 text-center"
          >
            <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Medikament suchen</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Geben Sie den Namen eines Medikaments ein, um die art- und gewichtsspezifische Dosierung zu berechnen.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
