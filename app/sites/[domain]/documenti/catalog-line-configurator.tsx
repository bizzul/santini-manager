"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import type { RigaArricchita } from "@/validation/documenti/extracted-document";
import { buildCatalogRiga } from "@/lib/listino/build-riga";

type ModalitaPrezzo = "griglia" | "misure_standard" | "fisso" | "mq" | "mc";

interface ProdottoRicerca {
  id: number;
  name: string;
  internalCode: string | null;
  modalitaPrezzo: ModalitaPrezzo | null;
  categoria: string | null;
  imageUrl: string | null;
}

interface Coefficiente {
  categoria: string;
  codice: string;
  descrizione: string | null;
  moltiplicatore: number;
}

interface SupplementoOpt {
  id: string;
  codice: string;
  nome: string;
  descrizione: string | null;
  tipoCalcolo: "fisso_chf" | "percentuale" | "per_mq" | "per_metro_lineare";
  valore: number;
}

interface ProdottoConfig {
  prodotto: {
    id: number;
    name: string;
    internalCode: string | null;
    modalitaPrezzo: ModalitaPrezzo | null;
    famigliaAperturaCod: string | null;
    codMateriale: string | null;
    codVetroTelaio: string | null;
    codTipoCassone: string | null;
    imageUrl: string | null;
    larghezzaDefaultMm: number | null;
    altezzaDefaultMm: number | null;
    profonditaDefaultMm: number | null;
    categoria: string | null;
  };
  coefficienti: {
    materiale: Coefficiente[];
    vetroTelaio: Coefficiente[];
    esecuzioneAnte: Coefficiente[];
    tipoCassone: Coefficiente[];
  };
  dimensioniIncremento: string[];
  supplementi: SupplementoOpt[];
}

interface Breakdown {
  modalitaPrezzo: ModalitaPrezzo;
  prezzoBase: number;
  incrementiDimensionali?: {
    dimensione: string;
    valoreMm: number;
    importo: number;
  }[];
  prezzoBaseConIncrementi?: number;
  coefficienti: {
    categoria: string;
    codice: string;
    moltiplicatore: number;
  }[];
  prezzoDopoCoefficienti: number;
  supplementiFissi: { codice: string; nome: string; importo: number }[];
  supplementiPercentuali: {
    codice: string;
    nome: string;
    valore: number;
    importo: number;
  }[];
  prezzoUnitario: number;
  quantita: number;
  totale: number;
}

const CHF = (n: number) => `CHF ${n.toFixed(2)}`;

const TIPO_CALCOLO_SHORT: Record<SupplementoOpt["tipoCalcolo"], string> = {
  fisso_chf: "CHF",
  percentuale: "%",
  per_mq: "/mq",
  per_metro_lineare: "/ml",
};

function needsMisure(modalita: ModalitaPrezzo | null): boolean {
  return (
    modalita === "griglia" ||
    modalita === "misure_standard" ||
    modalita === "mq" ||
    modalita === "mc"
  );
}

type Props = {
  domain: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (riga: RigaArricchita) => void;
};

export function CatalogLineConfigurator({
  domain,
  open,
  onOpenChange,
  onAdd,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProdottoRicerca[]>([]);
  const [searching, setSearching] = useState(false);

  const [config, setConfig] = useState<ProdottoConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  const [larghezzaMm, setLarghezzaMm] = useState("");
  const [altezzaMm, setAltezzaMm] = useState("");
  const [profonditaMm, setProfonditaMm] = useState("");
  const [codMateriale, setCodMateriale] = useState<string>("");
  const [codVetroTelaio, setCodVetroTelaio] = useState<string>("");
  const [codEsecuzioneAnte, setCodEsecuzioneAnte] = useState<string>("");
  const [supplementoIds, setSupplementoIds] = useState<string[]>([]);
  const [quantita, setQuantita] = useState("1");

  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  const [prezzoUnitario, setPrezzoUnitario] = useState("");
  const [override, setOverride] = useState(false);

  const headers = useMemo(
    () => ({ "x-site-domain": domain, "Content-Type": "application/json" }),
    [domain],
  );

  const resetSelection = useCallback(() => {
    setConfig(null);
    setLarghezzaMm("");
    setAltezzaMm("");
    setProfonditaMm("");
    setCodMateriale("");
    setCodVetroTelaio("");
    setCodEsecuzioneAnte("");
    setSupplementoIds([]);
    setQuantita("1");
    setBreakdown(null);
    setCalcError(null);
    setPrezzoUnitario("");
    setOverride(false);
  }, []);

  const resetAll = useCallback(() => {
    setQuery("");
    setResults([]);
    resetSelection();
  }, [resetSelection]);

  // Ricerca prodotti (debounce)
  useEffect(() => {
    if (!open) return;
    if (config) return; // gia' selezionato
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let active = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/listino/prodotti?q=${encodeURIComponent(q)}`,
          { headers },
        );
        const data = await res.json();
        if (active) setResults(data.prodotti ?? []);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, open, config, headers]);

  const selectProdotto = async (p: ProdottoRicerca) => {
    resetSelection();
    setLoadingConfig(true);
    try {
      const res = await fetch(
        `/api/listino/prodotto-config?sellProductId=${p.id}`,
        { headers },
      );
      if (!res.ok) throw new Error("Config non disponibile");
      const data: ProdottoConfig = await res.json();
      setConfig(data);
      setCodMateriale(data.prodotto.codMateriale ?? "");
      setCodVetroTelaio(data.prodotto.codVetroTelaio ?? "");
      // Pre-compila le misure con i default del prodotto (se presenti).
      if (data.prodotto.larghezzaDefaultMm != null) {
        setLarghezzaMm(String(data.prodotto.larghezzaDefaultMm));
      }
      if (data.prodotto.altezzaDefaultMm != null) {
        setAltezzaMm(String(data.prodotto.altezzaDefaultMm));
      }
      if (data.prodotto.profonditaDefaultMm != null) {
        setProfonditaMm(String(data.prodotto.profonditaDefaultMm));
      }
    } catch {
      setCalcError("Impossibile caricare la configurazione del prodotto.");
    } finally {
      setLoadingConfig(false);
    }
  };

  const modalita = config?.prodotto.modalitaPrezzo ?? null;
  const mostraProfondita =
    modalita === "mc" ||
    (config?.dimensioniIncremento ?? []).includes("profondita");

  const canCalc = useMemo(() => {
    if (!config || !modalita) return false;
    if (needsMisure(modalita)) {
      return Number(larghezzaMm) > 0 && Number(altezzaMm) > 0;
    }
    return true;
  }, [config, modalita, larghezzaMm, altezzaMm]);

  // Calcolo prezzo (debounce) al variare della configurazione
  useEffect(() => {
    if (!config || !canCalc) {
      setBreakdown(null);
      return;
    }
    let active = true;
    setCalcLoading(true);
    setCalcError(null);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/listino/calcola-prezzo`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            sellProductId: config.prodotto.id,
            larghezzaMm: larghezzaMm || undefined,
            altezzaMm: altezzaMm || undefined,
            profonditaMm: profonditaMm || undefined,
            codMateriale: codMateriale || null,
            codVetroTelaio: codVetroTelaio || null,
            codEsecuzioneAnte: codEsecuzioneAnte || null,
            supplementoIds,
            quantita: quantita || 1,
          }),
        });
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setBreakdown(null);
          setCalcError(data.error ?? "Errore nel calcolo del prezzo.");
          return;
        }
        setBreakdown(data.breakdown);
        if (!override) {
          setPrezzoUnitario(String(data.breakdown.prezzoUnitario));
        }
      } catch {
        if (active) setCalcError("Errore nel calcolo del prezzo.");
      } finally {
        if (active) setCalcLoading(false);
      }
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config,
    canCalc,
    larghezzaMm,
    altezzaMm,
    profonditaMm,
    codMateriale,
    codVetroTelaio,
    codEsecuzioneAnte,
    supplementoIds,
    quantita,
    headers,
  ]);

  const toggleSupplemento = (id: string, checked: boolean) => {
    setSupplementoIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    );
  };

  const prezzoCalcolato = breakdown?.prezzoUnitario ?? null;
  const prezzoModificato =
    override &&
    prezzoCalcolato != null &&
    Number(prezzoUnitario) !== prezzoCalcolato;

  const handleAdd = () => {
    if (!config) return;
    const supplementiNomi = (config.supplementi ?? [])
      .filter((s) => supplementoIds.includes(s.id))
      .map((s) => s.nome);
    const riga = buildCatalogRiga({
      productId: config.prodotto.id,
      productName: config.prodotto.name,
      imageUrl: config.prodotto.imageUrl,
      modalita,
      larghezzaMm: larghezzaMm ? Number(larghezzaMm) : null,
      altezzaMm: altezzaMm ? Number(altezzaMm) : null,
      profonditaMm: profonditaMm ? Number(profonditaMm) : null,
      codMateriale: codMateriale || null,
      codVetroTelaio: codVetroTelaio || null,
      codEsecuzioneAnte: codEsecuzioneAnte || null,
      supplementiNomi,
      quantita: Number(quantita) || 1,
      prezzoUnitario: Number(prezzoUnitario),
    });
    onAdd(riga);
    resetAll();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetAll();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Aggiungi prodotto da catalogo</DialogTitle>
          <DialogDescription>
            Configura variante, misure e supplementi: il prezzo viene calcolato
            dal listino.
          </DialogDescription>
        </DialogHeader>

        {!config ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Cerca prodotto per nome o codice..."
                className="pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {searching ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Ricerca in corso...
              </div>
            ) : null}
            <div className="divide-y divide-border/60 rounded-md border">
              {results.length === 0 && query.trim().length >= 2 && !searching ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  Nessun prodotto trovato.
                </p>
              ) : (
                results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProdotto(p)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {p.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {p.internalCode ? `${p.internalCode} \u00b7 ` : ""}
                        {p.categoria ?? "Senza categoria"}
                      </span>
                    </span>
                    {p.modalitaPrezzo ? (
                      <Badge variant="secondary">{p.modalitaPrezzo}</Badge>
                    ) : (
                      <Badge variant="warning">no prezzo</Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {config.prodotto.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {config.prodotto.internalCode
                    ? `${config.prodotto.internalCode} \u00b7 `
                    : ""}
                  {config.prodotto.categoria ?? "Senza categoria"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {modalita ? (
                  <Badge variant="secondary">{modalita}</Badge>
                ) : (
                  <Badge variant="warning">no modalita</Badge>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetSelection}
                >
                  Cambia
                </Button>
              </div>
            </div>

            {!modalita ? (
              <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
                Questo prodotto non ha una modalita prezzo configurata. Imposta
                la modalita nel catalogo per calcolarne il prezzo.
              </p>
            ) : null}

            {needsMisure(modalita) ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Larghezza (mm)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={larghezzaMm}
                    onChange={(e) => setLarghezzaMm(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Altezza (mm)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={altezzaMm}
                    onChange={(e) => setAltezzaMm(e.target.value)}
                  />
                </div>
                {mostraProfondita ? (
                  <div className="space-y-1">
                    <Label className="text-xs">Profondita (mm)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={profonditaMm}
                      onChange={(e) => setProfonditaMm(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {config.coefficienti.materiale.length > 0 ? (
              <div className="space-y-1">
                <Label className="text-xs">Materiale</Label>
                <Select
                  value={codMateriale || "__none__"}
                  onValueChange={(v) =>
                    setCodMateriale(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nessuno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nessuno</SelectItem>
                    {config.coefficienti.materiale.map((c) => (
                      <SelectItem key={c.codice} value={c.codice}>
                        {c.codice}
                        {c.descrizione ? ` — ${c.descrizione}` : ""} (x
                        {c.moltiplicatore})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {config.coefficienti.vetroTelaio.length > 0 ? (
              <div className="space-y-1">
                <Label className="text-xs">Vetro / telaio</Label>
                <Select
                  value={codVetroTelaio || "__none__"}
                  onValueChange={(v) =>
                    setCodVetroTelaio(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nessuno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nessuno</SelectItem>
                    {config.coefficienti.vetroTelaio.map((c) => (
                      <SelectItem key={c.codice} value={c.codice}>
                        {c.codice}
                        {c.descrizione ? ` — ${c.descrizione}` : ""} (x
                        {c.moltiplicatore})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {(config.coefficienti.esecuzioneAnte ?? []).length > 0 ? (
              <div className="space-y-1">
                <Label className="text-xs">Esecuzione ante</Label>
                <Select
                  value={codEsecuzioneAnte || "__none__"}
                  onValueChange={(v) =>
                    setCodEsecuzioneAnte(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nessuna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nessuna</SelectItem>
                    {(config.coefficienti.esecuzioneAnte ?? []).map((c) => (
                      <SelectItem key={c.codice} value={c.codice}>
                        {c.codice}
                        {c.descrizione ? ` — ${c.descrizione}` : ""} (x
                        {c.moltiplicatore})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {config.prodotto.codTipoCassone ? (
              <p className="text-xs text-muted-foreground">
                Tipo cassone:{" "}
                <Badge variant="secondary">
                  {config.prodotto.codTipoCassone}
                </Badge>{" "}
                (coefficiente applicato automaticamente)
              </p>
            ) : null}

            {config.supplementi.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-xs">Supplementi</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {config.supplementi.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm"
                    >
                      <Checkbox
                        checked={supplementoIds.includes(s.id)}
                        onCheckedChange={(v) =>
                          toggleSupplemento(s.id, Boolean(v))
                        }
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">{s.nome}</span>
                        <span className="block text-xs text-muted-foreground">
                          {s.valore}
                          {TIPO_CALCOLO_SHORT[s.tipoCalcolo]}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Quantita</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantita}
                  onChange={(e) => setQuantita(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  Prezzo unitario (CHF)
                  {prezzoModificato ? (
                    <Badge variant="warning" className="ml-2">
                      Modificato
                    </Badge>
                  ) : null}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={prezzoUnitario}
                  onChange={(e) => {
                    setOverride(true);
                    setPrezzoUnitario(e.target.value);
                  }}
                />
              </div>
            </div>

            {calcLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Calcolo prezzo...
              </div>
            ) : null}

            {calcError ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {calcError}
              </p>
            ) : null}

            {breakdown && !calcError ? (
              <div className="space-y-1 rounded-md border bg-muted/10 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prezzo base</span>
                  <span>{CHF(breakdown.prezzoBase)}</span>
                </div>
                {(breakdown.incrementiDimensionali ?? []).map((i) => (
                  <div
                    key={`inc-${i.dimensione}`}
                    className="flex justify-between text-muted-foreground"
                  >
                    <span>
                      + Extra {i.dimensione} ({i.valoreMm} mm)
                    </span>
                    <span>{CHF(i.importo)}</span>
                  </div>
                ))}
                {breakdown.coefficienti.map((c) => (
                  <div
                    key={`${c.categoria}-${c.codice}`}
                    className="flex justify-between text-muted-foreground"
                  >
                    <span>
                      Coeff. {c.codice} (x{c.moltiplicatore})
                    </span>
                    <span>= {CHF(breakdown.prezzoDopoCoefficienti)}</span>
                  </div>
                ))}
                {breakdown.supplementiFissi.map((s) => (
                  <div key={s.codice} className="flex justify-between">
                    <span className="text-muted-foreground">+ {s.nome}</span>
                    <span>{CHF(s.importo)}</span>
                  </div>
                ))}
                {breakdown.supplementiPercentuali.map((s) => (
                  <div key={s.codice} className="flex justify-between">
                    <span className="text-muted-foreground">
                      + {s.nome} ({s.valore}%)
                    </span>
                    <span>{CHF(s.importo)}</span>
                  </div>
                ))}
                <div className="mt-1 flex justify-between border-t pt-1 font-medium">
                  <span>Prezzo unitario calcolato</span>
                  <span>{CHF(breakdown.prezzoUnitario)}</span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetAll();
              onOpenChange(false);
            }}
          >
            Annulla
          </Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={
              !config ||
              !modalita ||
              loadingConfig ||
              calcLoading ||
              !!calcError ||
              !prezzoUnitario ||
              Number(prezzoUnitario) < 0
            }
          >
            Aggiungi al documento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
