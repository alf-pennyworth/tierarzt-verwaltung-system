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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  veterinaryDrugPrices,
  calculateAVP,
  calculatePracticeCost,
  formatPrice,
  calculatePricePerUnit,
  type DrugPricing,
} from "@/lib/german-drug-pricing";
import {
  Euro,
  Calculator,
  Tag,
  Package,
  Search,
  Info,
  TrendingDown,
  Pill,
  FlaskConical,
} from "lucide-react";

interface DrugWithPricing extends DrugPricing {
  avp: ReturnType<typeof calculateAVP>;
  practiceCost: ReturnType<typeof calculatePracticeCost>;
  pricePerUnit: ReturnType<typeof calculatePricePerUnit>;
}

function parsePackSize(packungsGroesse: string): number {
  const match = packungsGroesse.match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
}

export default function DrugPricingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDrug, setSelectedDrug] = useState<DrugWithPricing | null>(null);
  const [discountPercent, setDiscountPercent] = useState(5);
  const [formFilter, setFormFilter] = useState<string>("all");

  const drugsWithPricing = useMemo(() => {
    return veterinaryDrugPrices.map((drug) => {
      const avp = calculateAVP(drug.herstellerAbgabePreis);
      const practiceCost = calculatePracticeCost(avp.bruttoPreis, discountPercent);
      const units = parsePackSize(drug.packungsGroesse);
      const pricePerUnit = calculatePricePerUnit(drug.drugName, units);
      return {
        ...drug,
        avp,
        practiceCost,
        pricePerUnit,
      };
    });
  }, [discountPercent]);

  const filteredDrugs = useMemo(() => {
    return drugsWithPricing.filter((drug) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        drug.drugName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drug.darreichungsform.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesForm =
        formFilter === "all" || drug.darreichungsform === formFilter;
      return matchesSearch && matchesForm;
    });
  }, [drugsWithPricing, searchQuery, formFilter]);

  const availableForms = useMemo(() => {
    const forms = new Set(veterinaryDrugPrices.map((d) => d.darreichungsform));
    return Array.from(forms).sort();
  }, []);

  const totalHAP = useMemo(
    () => filteredDrugs.reduce((sum, d) => sum + d.herstellerAbgabePreis, 0),
    [filteredDrugs]
  );
  const totalAVP = useMemo(
    () => filteredDrugs.reduce((sum, d) => sum + d.avp.bruttoPreis, 0),
    [filteredDrugs]
  );
  const totalPractice = useMemo(
    () => filteredDrugs.reduce((sum, d) => sum + d.practiceCost.endPreis, 0),
    [filteredDrugs]
  );

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Euro className="h-6 w-6" />
          Arzneimittelpreise — AMPreisV
        </h1>
        <p className="text-muted-foreground">
          Berechnung von Apothekenverkaufspreisen nach Arzneimittelpreisverordnung
        </p>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Medikament suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={formFilter} onValueChange={setFormFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Darreichungsform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Formen</SelectItem>
                {availableForms.map((form) => (
                  <SelectItem key={form} value={form}>
                    {form}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Discount Slider */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Praxis-Rabatt
              </label>
              <Badge variant="secondary">{discountPercent}%</Badge>
            </div>
            <Slider
              value={[discountPercent]}
              onValueChange={(v) => setDiscountPercent(v[0])}
              min={0}
              max={20}
              step={0.5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Typischer Tierarzt-Rabatt: 5% — Verschieben Sie den Regler, um den Praxiskosten anzupassen.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              Herstellerabgabepreis (HAP)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPrice(totalHAP)}</p>
            <p className="text-xs text-muted-foreground">
              Netto, zzgl. MwSt
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Calculator className="h-4 w-4" />
              Apothekenverkaufspreis (AVP)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPrice(totalAVP)}</p>
            <p className="text-xs text-muted-foreground">
              Inkl. 19% MwSt
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Tag className="h-4 w-4" />
              Praxiskosten (nach Rabatt)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPrice(totalPractice)}</p>
            <p className="text-xs text-muted-foreground">
              Mit {discountPercent}% Rabatt
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Drug List Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Medikamentenliste
          </CardTitle>
          <CardDescription>
            {filteredDrugs.length} von {veterinaryDrugPrices.length} Medikamenten
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medikament</TableHead>
                  <TableHead className="text-right">HAP</TableHead>
                  <TableHead className="text-right">AVP (Brutto)</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">
                    Praxiskosten
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Preis/Einheit
                  </TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrugs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      Keine Medikamente gefunden.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDrugs.map((drug) => (
                    <TableRow
                      key={drug.drugName}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedDrug(drug)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{drug.drugName}</p>
                          <p className="text-xs text-muted-foreground">
                            {drug.darreichungsform} · {drug.packungsGroesse}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatPrice(drug.herstellerAbgabePreis)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {formatPrice(drug.avp.bruttoPreis)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm hidden sm:table-cell">
                        <Badge variant="outline" className="font-mono">
                          {formatPrice(drug.practiceCost.endPreis)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {drug.pricePerUnit ? (
                          <span className="text-sm text-muted-foreground">
                            {formatPrice(drug.pricePerUnit.unitPrice)} /{" "}
                            {drug.pricePerUnit.unitType}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Info className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Selected Drug Detail */}
      {selectedDrug && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Preisaufstellung: {selectedDrug.drugName}
            </CardTitle>
            <CardDescription>
              {selectedDrug.darreichungsform} · Packung mit {selectedDrug.packungsGroesse}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* AMPreisV Breakdown */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                AMPreisV-Aufstellung
              </h3>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell>Herstellerabgabepreis (HAP)</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatPrice(selectedDrug.avp.breakdown.herstellerPreis)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>+ Apothekenmarge (3%)</TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        +{formatPrice(selectedDrug.avp.breakdown.margeProzent)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>+ Festzuschlag</TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        +{formatPrice(8.35)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>+ Notdienstfonds</TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        +{formatPrice(0.21)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>+ Pharma-Dienstleistung</TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        +{formatPrice(0.2)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell>Nettopreis (Summe)</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatPrice(selectedDrug.avp.nettoPreis)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>+ MwSt (19%)</TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        +{formatPrice(selectedDrug.avp.mwst)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-primary/5 font-bold">
                      <TableCell>Apothekenverkaufspreis (AVP)</TableCell>
                      <TableCell className="text-right font-mono text-lg">
                        {formatPrice(selectedDrug.avp.bruttoPreis)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Practice Cost */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Praxiskosten (mit {discountPercent}% Rabatt)
              </h3>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell>AVP (Brutto)</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatPrice(selectedDrug.avp.bruttoPreis)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>- Rabatt ({discountPercent}%)</TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        -{formatPrice(selectedDrug.practiceCost.rabattBetrag)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-primary/5 font-bold">
                      <TableCell>Praxiskosten (Endpreis)</TableCell>
                      <TableCell className="text-right font-mono text-lg">
                        {formatPrice(selectedDrug.practiceCost.endPreis)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Unit Price */}
            {selectedDrug.pricePerUnit && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Preis pro Einheit
                </h3>
                <div className="flex items-center gap-4 p-4 rounded-md border bg-muted/30">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Packungsgröße: {selectedDrug.packungsGroesse}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Darreichungsform: {selectedDrug.darreichungsform}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono">
                      {formatPrice(selectedDrug.pricePerUnit.unitPrice)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      pro {selectedDrug.pricePerUnit.unitType}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSelectedDrug(null)}
            >
              Schließen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
