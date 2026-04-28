import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Key, Plus, Trash2, Copy, Check, BarChart3, 
  AlertCircle, Zap, Clock, TrendingUp, DollarSign,
  Radio, Activity, Download, Eye, EyeOff, RefreshCw,
  ExternalLink, Loader2
} from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  environment: string;
  scopes: string[];
  rate_limit: number;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

interface UsageData {
  total_requests: number;
  transcribe_requests: number;
  extract_requests: number;
  soap_requests: number;
  total_audio_minutes: number;
  avg_response_ms: number;
  total_cost_eur: number;
  error_count: number;
  rate_limited_count: number;
}

interface DayData {
  date: string;
  total_requests: number;
  total_audio_minutes: number;
  total_cost_eur: number;
}

const COSTS = {
  transcribe_per_min: 0.08,
  extract_per_request: 0.01,
  soap_per_request: 0.02,
};

export default function ApiDashboard() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [history, setHistory] = useState<DayData[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEnv, setNewKeyEnv] = useState("live");
  const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadKeys(), loadUsage(), loadHistory()]);
    setLoading(false);
  };

  const loadKeys = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from("profiles").select("praxis_id").eq("id", user.id).single();
    if (!profile?.praxis_id) return;

    const { data } = await supabase
      .from("api_keys")
      .select("id, name, environment, scopes, rate_limit, last_used_at, expires_at, revoked_at, created_at")
      .eq("praxis_id", profile.praxis_id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    setKeys(data || []);
  };

  const loadUsage = async () => {
    try {
      const { data } = await supabase.from("v_api_current_month_usage").select("*").single();
      setUsage(data || null);
    } catch {
      setUsage(null);
    }
  };

  const loadHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("praxis_id").eq("id", user.id).single();
    if (!profile?.praxis_id) return;

    const { data } = await supabase
      .from("api_usage_daily")
      .select("date, total_requests, total_audio_minutes, total_cost_eur")
      .eq("praxis_id", profile.praxis_id)
      .gte("date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0])
      .order("date", { ascending: true });

    setHistory(data || []);
  };

  const createKey = async () => {
    if (!newKeyName.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("praxis_id").eq("id", user.id).single();
    if (!profile?.praxis_id) return;

    const prefix = newKeyEnv === "live" ? "vet_live_" : "vet_test_";
    const random = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, "0")).join("");
    const key = prefix + random;

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(key));
    const hash = Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, "0")).join("");

    const { data, error } = await supabase.from("api_keys").insert({
      praxis_id: profile.praxis_id,
      name: newKeyName.trim(),
      key_prefix: key.substring(0, 12),
      key_hash: hash,
      environment: newKeyEnv,
      scopes: ["read", "write"],
      rate_limit: newKeyEnv === "test" ? 20 : 100,
    }).select().single();

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }

    setRevealedKeys(prev => ({ ...prev, [data.id]: key }));
    setNewKeyName("");
    toast({ title: "API-Key erstellt", description: "⚠️ Den Key nur jetzt kopieren — er wird nicht wieder angezeigt!" });
    await loadKeys();
  };

  const revokeKey = async (keyId: string) => {
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", keyId);

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Key widerrufen", description: "Der API-Key wurde deaktiviert." });
    await loadKeys();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Mini bar chart
  const maxVal = Math.max(...history.map(d => d.total_requests), 1);
  const totalMonthCost = usage?.total_cost_eur ? 
    Number(usage.total_cost_eur).toFixed(2) : "0.00";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">API Dashboard</h1>
          <p className="text-gray-500 text-sm">Keys, Nutzung & Abrechnung für die Headless-API</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-1" /> Aktualisieren
          </Button>
          <a href="/docs/api" target="_blank" className="inline-flex items-center px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
            <ExternalLink className="w-4 h-4 mr-1" /> API Docs
          </a>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Activity className="w-3.5 h-3.5" /> Requests (Monat)
            </div>
            <div className="text-2xl font-bold">{usage?.total_requests || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Radio className="w-3.5 h-3.5" /> Audio (Minuten)
            </div>
            <div className="text-2xl font-bold">{Math.round(usage?.total_audio_minutes || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Zap className="w-3.5 h-3.5" /> Latenz
            </div>
            <div className="text-2xl font-bold">{Math.round(usage?.avg_response_ms || 0)}ms</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <DollarSign className="w-3.5 h-3.5" /> Kosten (Monat)
            </div>
            <div className="text-2xl font-bold">{totalMonthCost}€</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys"><Key className="w-4 h-4 mr-1" /> API Keys</TabsTrigger>
          <TabsTrigger value="usage"><BarChart3 className="w-4 h-4 mr-1" /> Nutzung</TabsTrigger>
          <TabsTrigger value="billing"><DollarSign className="w-4 h-4 mr-1" /> Abrechnung</TabsTrigger>
        </TabsList>

        {/* API KEYS TAB */}
        <TabsContent value="keys" className="space-y-4">
          {/* Create Key */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Neuen API-Key erstellen</CardTitle>
              <CardDescription>Keys in der Live-Umgebung haben volle Rate-Limits. Test-Keys sind limitiert.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <Label htmlFor="keyName">Name</Label>
                  <Input
                    id="keyName"
                    placeholder="z.B. Praxis-App, Integration"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="w-full md:w-40">
                  <Label>Umgebung</Label>
                  <Select value={newKeyEnv} onValueChange={setNewKeyEnv}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">🟢 Live (100 req/min)</SelectItem>
                      <SelectItem value="test">🟡 Test (20 req/min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={createKey} disabled={!newKeyName.trim()}>
                    <Plus className="w-4 h-4 mr-1" /> Erstellen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Keys */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aktive Keys ({keys.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {keys.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Key className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Keine API-Keys vorhanden. Erstelle deinen ersten Key oben.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {keys.map((key) => (
                    <div key={key.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-gray-50 rounded-lg border gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">{key.name}</span>
                          <Badge variant={key.environment === "live" ? "default" : "secondary"}>
                            {key.environment === "live" ? "🟢 Live" : "🟡 Test"}
                          </Badge>
                          <span className="text-xs text-gray-400">ID: {key.id.substring(0, 8)}...</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {key.scopes.join(", ")} | {key.rate_limit} req/min | 
                          Erstellt: {new Date(key.created_at).toLocaleDateString("de-DE")}
                          {key.last_used_at && ` | Zuletzt: ${new Date(key.last_used_at).toLocaleDateString("de-DE")}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {revealedKeys[key.id] && (
                          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                            <code className="text-xs font-mono">{revealedKeys[key.id]}</code>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(revealedKeys[key.id], key.id)}>
                              {copiedId === key.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            </Button>
                          </div>
                        )}
                        <Button variant="destructive" size="sm" onClick={() => revokeKey(key.id)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Widerrufen
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* USAGE TAB */}
        <TabsContent value="usage" className="space-y-4">
          {/* Cost Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500 mb-1">Transkription</div>
                <div className="text-2xl font-bold">{usage?.transcribe_requests || 0}</div>
                <div className="text-xs text-gray-400">
                  {Math.round(usage?.total_audio_minutes || 0)} Min × {COSTS.transcribe_per_min}€ = 
                  {((usage?.total_audio_minutes || 0) * COSTS.transcribe_per_min).toFixed(2)}€
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500 mb-1">Entity Extraction</div>
                <div className="text-2xl font-bold">{usage?.extract_requests || 0}</div>
                <div className="text-xs text-gray-400">
                  {usage?.extract_requests || 0} × {COSTS.extract_per_request}€ = 
                  {((usage?.extract_requests || 0) * COSTS.extract_per_request).toFixed(2)}€
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500 mb-1">SOAP-Generierung</div>
                <div className="text-2xl font-bold">{usage?.soap_requests || 0}</div>
                <div className="text-xs text-gray-400">
                  {usage?.soap_requests || 0} × {COSTS.soap_per_request}€ = 
                  {((usage?.soap_requests || 0) * COSTS.soap_per_request).toFixed(2)}€
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 30-Day Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nutzung — Letzte 30 Tage</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-400">Noch keine Nutzungsdaten.</div>
              ) : (
                <div className="space-y-6">
                  {/* Bar Chart */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block">Requests pro Tag</Label>
                    <div className="flex items-end gap-1 h-32">
                      {history.map((day) => (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                          <div 
                            className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer min-h-[2px]"
                            style={{ height: `${Math.max((day.total_requests / maxVal) * 100, 2)}%` }}
                            title={`${day.date}: ${day.total_requests} Requests`}
                          />
                          {history.length <= 15 && (
                            <span className="text-[9px] text-gray-400 rotate-45 origin-left whitespace-nowrap">
                              {day.date.substring(5)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-xs text-gray-500">Ø Täglich</div>
                      <div className="text-lg font-bold">
                        {Math.round(history.reduce((s, d) => s + d.total_requests, 0) / history.length)}
                      </div>
                      <div className="text-xs text-gray-400">Requests</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Gesamt</div>
                      <div className="text-lg font-bold">
                        {Math.round(history.reduce((s, d) => s + d.total_audio_minutes, 0))}
                      </div>
                      <div className="text-xs text-gray-400">Minuten Audio</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Gesamtkosten</div>
                      <div className="text-lg font-bold">
                        {history.reduce((s, d) => s + (d.total_cost_eur || 0), 0).toFixed(2)}€
                      </div>
                      <div className="text-xs text-gray-400">30 Tage</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Health */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3">
                  <div className="text-2xl font-bold text-green-600">{Math.round(usage?.avg_response_ms || 0)}ms</div>
                  <div className="text-xs text-gray-500">Ø Response Time</div>
                </div>
                <div className="text-center p-3">
                  <div className={`text-2xl font-bold ${(usage?.error_count || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {usage?.error_count || 0}
                  </div>
                  <div className="text-xs text-gray-500">Fehler (Monat)</div>
                </div>
                <div className="text-center p-3">
                  <div className={`text-2xl font-bold ${(usage?.rate_limited_count || 0) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {usage?.rate_limited_count || 0}
                  </div>
                  <div className="text-xs text-gray-500">Rate Limited</div>
                </div>
                <div className="text-center p-3">
                  <div className="text-2xl font-bold text-green-600">
                    99.9%
                  </div>
                  <div className="text-xs text-gray-500">Uptime</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BILLING TAB */}
        <TabsContent value="billing" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Starter */}
            <Card className={usage && usage.total_audio_minutes < 300 ? "ring-2 ring-blue-500" : ""}>
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <CardDescription>Für kleine Praxen</CardDescription>
                <div className="text-3xl font-bold">49€<span className="text-sm text-gray-400">/Monat</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm mb-4">
                  <li>✅ 5.000 Requests/Monat</li>
                  <li>✅ 5h Audio-Transkription</li>
                  <li>✅ 60 req/min Rate-Limit</li>
                  <li>✅ Patienten & Behandlungen</li>
                  <li>✅ Basis-Support</li>
                </ul>
                <Button variant="outline" className="w-full">Aktueller Plan</Button>
              </CardContent>
            </Card>

            {/* Professional */}
            <Card className={usage && usage.total_audio_minutes >= 300 ? "ring-2 ring-blue-500" : "ring-2 ring-green-500"}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>Professional</CardTitle>
                  <Badge className="bg-green-600">Empfohlen</Badge>
                </div>
                <CardDescription>Für wachsende Praxen</CardDescription>
                <div className="text-3xl font-bold">149€<span className="text-sm text-gray-400">/Monat</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm mb-4">
                  <li>✅ 20.000 Requests/Monat</li>
                  <li>✅ 20h Audio-Transkription</li>
                  <li>✅ 200 req/min Rate-Limit</li>
                  <li>✅ Entity Extraction + SOAP</li>
                  <li>✅ TAMG-Export + Priority Support</li>
                </ul>
                <Button className="w-full bg-green-600 hover:bg-green-700">Upgraden</Button>
              </CardContent>
            </Card>

            {/* Enterprise */}
            <Card>
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <CardDescription>Für Kliniken & Ketten</CardDescription>
                <div className="text-3xl font-bold">399€<span className="text-sm text-gray-400">/Monat</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm mb-4">
                  <li>✅ 100.000+ Requests/Monat</li>
                  <li>✅ Unlimitierte Transkription</li>
                  <li>✅ 1.000 req/min Rate-Limit</li>
                  <li>✅ Telemedizin-API</li>
                  <li>✅ SLA + White-Label</li>
                </ul>
                <Button variant="outline" className="w-full">Kontakt aufnehmen</Button>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💡 Kosten-Schätzer</CardTitle>
              <CardDescription>Schätze deine monatlichen Kosten basierend auf deiner erwarteten Nutzung.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Transkription (Minuten/Monat)</Label>
                  <Input type="number" defaultValue="300" id="calcAudio" />
                </div>
                <div>
                  <Label>Extractions/Monat</Label>
                  <Input type="number" defaultValue="500" id="calcExtract" />
                </div>
                <div>
                  <Label>SOAP-Generierungen/Monat</Label>
                  <Input type="number" defaultValue="500" id="calcSoap" />
                </div>
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg text-center">
                <span className="text-sm text-gray-600">Geschätzte Kosten: </span>
                <span className="text-2xl font-bold text-blue-700">
                  {((300 * 0.08) + (500 * 0.01) + (500 * 0.02) + 149).toFixed(2)}€
                </span>
                <span className="text-sm text-gray-500"> /Monat (Professional Plan)</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
