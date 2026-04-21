import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Search, Plus, Stethoscope, CalendarDays, Pill, Users,
  Settings, FileText, Truck, Video, Activity, Clock, ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PatientResult {
  id: string;
  name: string;
  spezies: string;
}

interface TreatmentResult {
  id: string;
  diagnose: string;
  patient_name: string;
}

interface RecentItem {
  id: string;
  type: "patient" | "treatment" | "page";
  title: string;
  subtitle?: string;
  route: string;
  icon: React.ReactNode;
}

const QUICK_ACTIONS = [
  {
    id: "add-patient",
    title: "Patient anlegen",
    route: "/patients?add=true",
    icon: <Plus className="h-4 w-4" />,
  },
  {
    id: "new-treatment",
    title: "Neue Behandlung",
    route: "/patients",
    icon: <Stethoscope className="h-4 w-4" />,
  },
  {
    id: "appointments",
    title: "Termine",
    route: "/appointments",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    id: "tamg",
    title: "TAMG / Antibiotika",
    route: "/tamg",
    icon: <Pill className="h-4 w-4" />,
  },
  {
    id: "inventory",
    title: "Bestandsverwaltung",
    route: "/inventory",
    icon: <Truck className="h-4 w-4" />,
  },
  {
    id: "telemedizin",
    title: "Telemedizin",
    route: "/telemedizin",
    icon: <Video className="h-4 w-4" />,
  },
  {
    id: "dashboard",
    title: "Dashboard",
    route: "/dashboard",
    icon: <Activity className="h-4 w-4" />,
  },
  {
    id: "settings",
    title: "Einstellungen",
    route: "/settings",
    icon: <Settings className="h-4 w-4" />,
  },
];

const PAGES = [
  { title: "Patientenliste", route: "/patients", icon: <Users className="h-4 w-4" /> },
  { title: "Besitzer", route: "/owners", icon: <Users className="h-4 w-4" /> },
  { title: "Mitarbeiter", route: "/employees", icon: <Users className="h-4 w-4" /> },
  { title: "Berichte", route: "/reports", icon: <FileText className="h-4 w-4" /> },
  { title: "Profil", route: "/profile", icon: <Users className="h-4 w-4" /> },
];

const RECENT_STORAGE_KEY = "vet-app-recent-commands";

function loadRecentItems(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveRecentItem(item: RecentItem) {
  try {
    const existing = loadRecentItems();
    const filtered = existing.filter((i) => i.id !== item.id);
    const updated = [item, ...filtered].slice(0, 6);
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return { open, setOpen };
}

export function CommandPalette() {
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<PatientResult[]>([]);
  const [treatments, setTreatments] = useState<TreatmentResult[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent items on open
  useEffect(() => {
    if (open) {
      setRecentItems(loadRecentItems());
      setSearch("");
      setPatients([]);
      setTreatments([]);
    }
  }, [open]);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search patients and treatments
  useEffect(() => {
    if (!open || !userInfo?.praxisId || !search.trim()) {
      setPatients([]);
      setTreatments([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      const q = search.trim();

      // Search patients
      const { data: patientData } = await supabase
        .from("patient")
        .select("id, name, spezies")
        .eq("praxis_id", userInfo.praxisId)
        .is("deleted_at", null)
        .ilike("name", `%${q}%`)
        .order("name")
        .limit(5);

      setPatients((patientData || []) as PatientResult[]);

      // Search treatments by diagnosis
      const { data: treatmentData } = await supabase
        .from("behandlungen")
        .select("id, diagnose_fallback, patient:patient_id(name)")
        .eq("praxis_id", userInfo.praxisId)
        .is("deleted_at", null)
        .ilike("diagnose_fallback", `%${q}%`)
        .order("untersuchung_datum", { ascending: false })
        .limit(5);

      setTreatments(
        (treatmentData || []).map((t: any) => ({
          id: t.id,
          diagnose: t.diagnose_fallback || "Keine Diagnose",
          patient_name: t.patient?.name || "Unbekannt",
        }))
      );
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, open, userInfo?.praxisId]);

  const handleNavigate = useCallback(
    (route: string, item?: RecentItem) => {
      setOpen(false);
      if (item) {
        saveRecentItem(item);
      }
      navigate(route);
    },
    [navigate]
  );

  const handleQuickAction = useCallback(
    (action: typeof QUICK_ACTIONS[0]) => {
      const recent: RecentItem = {
        id: action.id,
        type: "page",
        title: action.title,
        route: action.route,
        icon: action.icon,
      };
      handleNavigate(action.route, recent);
    },
    [handleNavigate]
  );

  const handlePatientClick = useCallback(
    (patient: PatientResult) => {
      const recent: RecentItem = {
        id: `patient-${patient.id}`,
        type: "patient",
        title: patient.name,
        subtitle: patient.spezies,
        route: `/patient/${patient.id}`,
        icon: <Users className="h-4 w-4" />,
      };
      handleNavigate(recent.route, recent);
    },
    [handleNavigate]
  );

  const handleTreatmentClick = useCallback(
    (treatment: TreatmentResult) => {
      const recent: RecentItem = {
        id: `treatment-${treatment.id}`,
        type: "treatment",
        title: treatment.diagnose,
        subtitle: treatment.patient_name,
        route: `/treatment/${treatment.id}`,
        icon: <Stethoscope className="h-4 w-4" />,
      };
      handleNavigate(recent.route, recent);
    },
    [handleNavigate]
  );

  const handlePageClick = useCallback(
    (page: typeof PAGES[0]) => {
      const recent: RecentItem = {
        id: `page-${page.route}`,
        type: "page",
        title: page.title,
        route: page.route,
        icon: page.icon,
      };
      handleNavigate(page.route, recent);
    },
    [handleNavigate]
  );

  const hasResults =
    patients.length > 0 ||
    treatments.length > 0 ||
    QUICK_ACTIONS.some((a) =>
      a.title.toLowerCase().includes(search.toLowerCase())
    ) ||
    PAGES.some((p) => p.title.toLowerCase().includes(search.toLowerCase()));

  const filteredQuickActions = search.trim()
    ? QUICK_ACTIONS.filter((a) =>
        a.title.toLowerCase().includes(search.toLowerCase())
      )
    : QUICK_ACTIONS;

  const filteredPages = search.trim()
    ? PAGES.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase())
      )
    : PAGES;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Suchen... (Patienten, Behandlungen, Aktionen)"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>

        {/* Recent items */}
        {!search.trim() && recentItems.length > 0 && (
          <React.Fragment>
            <CommandGroup heading="Zuletzt verwendet">
              {recentItems.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleNavigate(item.route, item)}
                >
                  <span className="mr-2 text-muted-foreground">
                    {item.icon || <Clock className="h-4 w-4" />}
                  </span>
                  <span className="flex-1">{item.title}</span>
                  {item.subtitle && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {item.subtitle}
                    </span>
                  )}
                  <ArrowRight className="h-3 w-3 text-muted-foreground ml-2" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </React.Fragment>
        )}

        {/* Patient search results */}
        {patients.length > 0 && (
          <CommandGroup heading="Patienten">
            {patients.map((patient) => (
              <CommandItem
                key={patient.id}
                onSelect={() => handlePatientClick(patient)}
              >
                <Users className="h-4 w-4 mr-2 text-green-500" />
                <span className="flex-1">{patient.name}</span>
                <span className="text-xs text-muted-foreground">
                  {patient.spezies}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Treatment search results */}
        {treatments.length > 0 && (
          <CommandGroup heading="Behandlungen">
            {treatments.map((treatment) => (
              <CommandItem
                key={treatment.id}
                onSelect={() => handleTreatmentClick(treatment)}
              >
                <Stethoscope className="h-4 w-4 mr-2 text-purple-500" />
                <span className="flex-1">{treatment.diagnose}</span>
                <span className="text-xs text-muted-foreground">
                  {treatment.patient_name}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Quick actions */}
        {filteredQuickActions.length > 0 && (
          <React.Fragment>
            <CommandGroup heading="Schnellaktionen">
              {filteredQuickActions.map((action) => (
                <CommandItem
                  key={action.id}
                  onSelect={() => handleQuickAction(action)}
                >
                  <span className="mr-2 text-muted-foreground">
                    {action.icon}
                  </span>
                  <span>{action.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        )}

        {/* Pages */}
        {filteredPages.length > 0 && (
          <React.Fragment>
            <CommandSeparator />
            <CommandGroup heading="Seiten">
              {filteredPages.map((page) => (
                <CommandItem
                  key={page.route}
                  onSelect={() => handlePageClick(page)}
                >
                  <span className="mr-2 text-muted-foreground">
                    {page.icon}
                  </span>
                  <span>{page.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        )}

        {/* Keyboard hint */}
        {!search.trim() && (
          <React.Fragment>
            <CommandSeparator />
            <div className="px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
              <span>Tippe um zu suchen</span>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">
                  ↑↓
                </kbd>
                <span>navigieren</span>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">
                  ↵
                </kbd>
                <span>auswählen</span>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">
                  esc
                </kbd>
                <span>schließen</span>
              </div>
            </div>
          </React.Fragment>
        )}
      </CommandList>
    </CommandDialog>
  );
}
