import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { PatientDialog } from "@/components/patient";
import { AddPatientDialog } from "@/components/patient";
import { PawPrint, Search, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface Patient {
  id: string;
  name: string;
  spezies: string;
  rasse: string | null;
  geburtsdatum: string | null;
  created_at: string;
  besitzer: {
    id: string;
    name: string;
  };
}

type SortField = 'name' | 'created_at' | 'owner';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

const PatientList = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [speciesList, setSpeciesList] = useState<string[]>([]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial values from URL params
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
  const [speciesFilter, setSpeciesFilter] = useState(() => searchParams.get('species') || 'all');
  const [sortConfig, setSortConfig] = useState<SortConfig>(() => {
    const field = (searchParams.get('sort') as SortField) || 'name';
    const direction = (searchParams.get('dir') as SortDirection) || 'asc';
    return { field, direction };
  });

  // Update URL params when filters change
  const updateUrlParams = useCallback((search: string, species: string, sort: SortConfig) => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (species && species !== 'all') params.set('species', species);
    if (sort.field !== 'name' || sort.direction !== 'asc') {
      params.set('sort', sort.field);
      params.set('dir', sort.direction);
    }
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    updateUrlParams(value, speciesFilter, sortConfig);
  };

  const handleSpeciesChange = (value: string) => {
    setSpeciesFilter(value);
    updateUrlParams(searchTerm, value, sortConfig);
  };

  const handleSortChange = (field: SortField) => {
    const newConfig: SortConfig = {
      field,
      direction: sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    };
    setSortConfig(newConfig);
    updateUrlParams(searchTerm, speciesFilter, newConfig);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSpeciesFilter('all');
    setSortConfig({ field: 'name', direction: 'asc' });
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const hasActiveFilters = searchTerm || (speciesFilter && speciesFilter !== 'all');

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No authenticated user");
        return;
      }

      // Get user's praxis_id from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("praxis_id")
        .eq("id", user.id)
        .single();

      const praxisId = profile?.praxis_id;
      if (!praxisId) {
        console.error("No praxis_id found for user");
        return;
      }

      const { data, error } = await supabase
        .from("patient")
        .select(`
          id,
          name,
          spezies,
          rasse,
          geburtsdatum,
          created_at,
          besitzer (
            id,
            name
          )
        `)
        .eq("praxis_id", praxisId)
        .is("deleted_at", null);

      if (error) {
        console.error("Error fetching patients:", error);
        return;
      }

      if (data) {
        setPatients(data);
        // Extract unique species for filter dropdown
        const uniqueSpecies = [...new Set(data.map(p => p.spezies).filter(Boolean))].sort();
        setSpeciesList(uniqueSpecies);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Filter patients by search term and species
  const filteredPatients = useMemo(() => {
    let result = patients.filter((patient) => {
      const matchesSearch = !searchTerm ||
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.besitzer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.spezies.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSpecies = !speciesFilter || speciesFilter === 'all' ||
        patient.spezies === speciesFilter;

      return matchesSearch && matchesSpecies;
    });

    // Sort patients
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortConfig.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'de');
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'owner':
          comparison = a.besitzer.name.localeCompare(b.besitzer.name, 'de');
          break;
      }

      return sortConfig.direction === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [patients, searchTerm, speciesFilter, sortConfig]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Patientenliste</CardTitle>
          <AddPatientDialog onSuccess={fetchPatients} />
        </CardHeader>
        <CardContent>
          {/* Filter Controls */}
          {patients.length > 0 && (
            <div className="mb-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nach Name, Besitzer oder Spezies suchen..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Species Filter */}
                <Select value={speciesFilter} onValueChange={handleSpeciesChange}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Spezies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Spezies</SelectItem>
                    {speciesList.map((species) => (
                      <SelectItem key={species} value={species}>
                        {species}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Active Filters & Clear */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Aktive Filter:</span>
                  {searchTerm && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary rounded-md text-sm">
                      Suche: "{searchTerm}"
                    </span>
                  )}
                  {speciesFilter && speciesFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary rounded-md text-sm">
                      Spezies: {speciesFilter}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Filter löschen
                  </Button>
                </div>
              )}
            </div>
          )}

          {loading ? (
            /* Loading Skeleton */
            <div className="space-y-4" role="status" aria-live="polite" aria-label="Patienten werden geladen">
              {/* Filter skeleton */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-full sm:w-[180px]" />
              </div>
              
              {/* Table skeleton */}
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3"><Skeleton className="h-5 w-20" /></th>
                      <th className="text-left py-3"><Skeleton className="h-5 w-20" /></th>
                      <th className="text-left py-3 hidden sm:table-cell"><Skeleton className="h-5 w-16" /></th>
                      <th className="text-left py-3 hidden sm:table-cell"><Skeleton className="h-5 w-16" /></th>
                      <th className="text-left py-3 hidden md:table-cell"><Skeleton className="h-5 w-12" /></th>
                      <th className="text-left py-3"><Skeleton className="h-5 w-24" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="border-b">
                        <TableCell className="whitespace-nowrap"><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="whitespace-nowrap"><Skeleton className="h-5 w-28" /></TableCell>
                        <TableCell className="hidden sm:table-cell whitespace-nowrap"><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="whitespace-nowrap"><Skeleton className="h-5 w-24" /></TableCell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <span className="sr-only">Patienten werden geladen...</span>
            </div>
          ) : patients.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <PawPrint className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Keine Patienten vorhanden</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Sie haben noch keine Patienten angelegt. Klicken Sie auf "Patient hinzufügen", um Ihren ersten Patienten anzulegen.
              </p>
              <AddPatientDialog onSuccess={fetchPatients} buttonVariant="outline" />
            </div>
          ) : filteredPatients.length === 0 ? (
            /* No Search Results */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Keine Ergebnisse gefunden</h3>
              <p className="text-muted-foreground">
                Kein Patient gefunden f&uuml;r "{searchTerm}".
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <Table>
                <caption className="sr-only">
                  Patientenliste mit {filteredPatients.length} Patienten, sortierbar nach Name, Besitzer und Erstelldatum
                </caption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap" aria-sort={sortConfig.field === 'name' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSortChange('name')}
                        className="-ml-3 h-8 data-[state=on]:bg-accent"
                        data-state={sortConfig.field === 'name' ? 'on' : 'off'}
                        aria-label="Nach Name sortieren"
                      >
                        Name
                        <SortIcon field="name" />
                      </Button>
                    </TableHead>
                    <TableHead className="whitespace-nowrap" aria-sort={sortConfig.field === 'owner' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSortChange('owner')}
                        className="-ml-3 h-8 data-[state=on]:bg-accent"
                        data-state={sortConfig.field === 'owner' ? 'on' : 'off'}
                        aria-label="Nach Besitzer sortieren"
                      >
                        Besitzer
                        <SortIcon field="owner" />
                      </Button>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell whitespace-nowrap" aria-sort={sortConfig.field === 'created_at' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSortChange('created_at')}
                        className="-ml-3 h-8 data-[state=on]:bg-accent"
                        data-state={sortConfig.field === 'created_at' ? 'on' : 'off'}
                        aria-label="Nach Erstelldatum sortieren"
                      >
                        Erstellt
                        <SortIcon field="created_at" />
                      </Button>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell whitespace-nowrap">Spezies</TableHead>
                    <TableHead className="hidden md:table-cell whitespace-nowrap">Rasse</TableHead>
                    <TableHead className="whitespace-nowrap">Geburtsdatum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow
                      key={patient.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/patient/${patient.id}`)}
                    >
                      <TableCell className="whitespace-nowrap">{patient.name}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className="cursor-pointer hover:underline text-primary"
                          role="button"
                          tabIndex={0}
                          aria-label={`Besitzer ${patient.besitzer.name} anzeigen`}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/owner/${patient.besitzer.id}`);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/owner/${patient.besitzer.id}`);
                            }
                          }}
                        >
                          {patient.besitzer.name}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell whitespace-nowrap">
                        {format(new Date(patient.created_at), "dd.MM.yyyy")}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{patient.spezies}</TableCell>
                      <TableCell className="hidden md:table-cell">{patient.rasse || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {patient.geburtsdatum
                          ? format(new Date(patient.geburtsdatum), "dd.MM.yyyy")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientList;