import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw, CloudOff, CloudCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SyncStatus {
  isOnline: boolean;
  wasOffline: boolean;
  syncInProgress: boolean;
  lastSyncedAt: Date | null;
}

export function useOfflineStatus() {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    wasOffline: false,
    syncInProgress: false,
    lastSyncedAt: null,
  });

  useEffect(() => {
    const handleOnline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: true,
        wasOffline: !prev.isOnline,
        syncInProgress: true,
      }));

      // Simulate brief sync period
      setTimeout(() => {
        setStatus((prev) => ({
          ...prev,
          syncInProgress: false,
          lastSyncedAt: new Date(),
        }));
      }, 1500);
    };

    const handleOffline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: false,
        wasOffline: false,
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return status;
}

export function OfflineIndicator() {
  const { isOnline, wasOffline, syncInProgress, lastSyncedAt } = useOfflineStatus();
  const [dismissed, setDismissed] = useState(false);

  // Auto-dismiss sync notification after 3 seconds
  useEffect(() => {
    if (!isOnline || !wasOffline || syncInProgress) return;
    const timer = setTimeout(() => setDismissed(true), 3000);
    return () => clearTimeout(timer);
  }, [isOnline, wasOffline, syncInProgress]);

  // Show again when going offline
  useEffect(() => {
    if (!isOnline) setDismissed(false);
  }, [isOnline]);

  // Don't show anything if online and nothing to report
  if (isOnline && !wasOffline && !syncInProgress) return null;

  // Don't show if dismissed after successful sync
  if (isOnline && dismissed && !syncInProgress) return null;

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
          <WifiOff className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Keine Internetverbindung</p>
            <p className="text-xs text-amber-600">
              Sie arbeiten offline. Änderungen werden synchronisiert, sobald die Verbindung wiederhergestellt ist.
            </p>
          </div>
          <CloudOff className="h-4 w-4 shrink-0 text-amber-400" />
        </div>
      </div>
    );
  }

  // Sync in progress
  if (syncInProgress) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
          <RefreshCw className="h-5 w-5 shrink-0 text-blue-600 animate-spin" />
          <div className="flex-1">
            <p className="font-medium text-sm">Verbindung wiederhergestellt</p>
            <p className="text-xs text-blue-600">Synchronisiere Daten...</p>
          </div>
        </div>
      </div>
    );
  }

  // Back online notification
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
      <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
        <Wifi className="h-5 w-5 shrink-0 text-green-600" />
        <div className="flex-1">
          <p className="font-medium text-sm">Wieder online</p>
          <p className="text-xs text-green-600">
            {lastSyncedAt
              ? `Synchronisiert um ${lastSyncedAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`
              : "Alle Daten sind auf dem neuesten Stand."}
          </p>
        </div>
        <CloudCheck className="h-4 w-4 shrink-0 text-green-500" />
        <Button
          variant="ghost"
          size="sm"
          className="h-auto py-1 px-2 text-xs text-green-700 hover:text-green-900 hover:bg-green-100"
          onClick={() => setDismissed(true)}
        >
          OK
        </Button>
      </div>
    </div>
  );
}
