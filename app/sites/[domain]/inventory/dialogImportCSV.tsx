"use client";
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  Download,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

interface ImportResult {
  success: boolean;
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  duplicates: string[];
}

// CSV columns definition with required/optional status
const CSV_COLUMNS = [
  {
    name: "ID",
    description: "ID variante (per aggiornare record esistenti)",
    required: false,
  },
  { name: "CAT", description: "Categoria", required: false },
  { name: "COD_CAT", description: "Codice Categoria", required: false },
  { name: "S_CAT", description: "Sottocategoria", required: false },
  { name: "COD_S_CAT", description: "Codice Sottocategoria", required: false },
  { name: "S_CAT_2", description: "Sottocategoria 2", required: false },
  {
    name: "COD_S_CAT_2",
    description: "Codice Sottocategoria 2",
    required: false,
  },
  { name: "COLORE", description: "Colore", required: false },
  { name: "COD_COLORE", description: "Codice Colore", required: false },
  { name: "COD_INT", description: "Codice Interno (univoco)", required: true },
  { name: "NR_MAG", description: "Nr. Magazzino", required: false },
  { name: "FORNITORE", description: "Fornitore", required: false },
  { name: "COD_FORN", description: "Codice Fornitore", required: false },
  { name: "PRODUTTORE", description: "Produttore", required: false },
  { name: "COD_PROD", description: "Codice Produttore", required: false },
  { name: "NOME", description: "Nome prodotto", required: false },
  { name: "DESCRIZIONE", description: "Descrizione", required: false },
  { name: "URL_TDS", description: "URL Scheda Tecnica", required: false },
  { name: "URL_IMM", description: "URL Immagine", required: false },
  { name: "LARGHEZZA", description: "Larghezza", required: false },
  { name: "ALTEZZA", description: "Altezza", required: false },
  { name: "SPESSORE", description: "Spessore", required: false },
  { name: "DIAMETRO", description: "Diametro", required: false },
  { name: "UNITÀ", description: "Unità di misura", required: false },
  { name: "PZ", description: "Quantità/Pezzi", required: false },
  {
    name: "CHF_ACQUISTO",
    description: "Prezzo Acquisto (CHF)",
    required: false,
  },
  { name: "CHF_VENDITA", description: "Prezzo Vendita (CHF)", required: false },
];

// Example row data for the CSV template
const EXAMPLE_ROW = {
  ID: "",
  CAT: "LEGNO",
  COD_CAT: "LG",
  S_CAT: "Pannelli",
  COD_S_CAT: "PA",
  S_CAT_2: "Pannello melaminico",
  COD_S_CAT_2: "MEL",
  COLORE: "9016",
  COD_COLORE: "9010",
  COD_INT: "LG_PA_MEL_9010_ESEMPIO",
  NR_MAG: "1000",
  FORNITORE: "HERZOG-HELMIGER",
  COD_FORN: "HEHE",
  PRODUTTORE: "HERZOG-HELMIGER",
  COD_PROD: "HEHE",
  NOME: "Pannello truciolato K100",
  DESCRIZIONE: "Pannello melaminico bianco",
  URL_TDS: "",
  URL_IMM: "",
  LARGHEZZA: "2070",
  ALTEZZA: "2800",
  SPESSORE: "19",
  DIAMETRO: "",
  UNITÀ: "PZ",
  PZ: "10",
  CHF_ACQUISTO: "50.00",
  CHF_VENDITA: "65.00",
};

function DialogImportCSV() {
  const [isOpen, setOpen] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showColumns, setShowColumns] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  // Extract domain from pathname (e.g., /sites/santini/inventory -> santini)
  const domain = pathname.split("/")[2] || "";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast({
          variant: "destructive",
          description: "Per favore seleziona un file CSV valido",
        });
        return;
      }
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast({
          variant: "destructive",
          description: "Per favore seleziona un file CSV valido",
        });
        return;
      }
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        variant: "destructive",
        description: "Seleziona un file CSV prima di importare",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("skipDuplicates", skipDuplicates.toString());

      const response = await fetch("/api/products/import-csv", {
        method: "POST",
        body: formData,
        headers: {
          "x-site-domain": domain,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore durante l'importazione");
      }

      setResult(data);

      if (data.imported > 0 || data.updated > 0) {
        const messages = [];
        if (data.imported > 0) messages.push(`${data.imported} nuovi`);
        if (data.updated > 0) messages.push(`${data.updated} aggiornati`);
        toast({
          description: `Prodotti inventario: ${messages.join(", ")}!`,
        });
        router.refresh();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.message || "Errore durante l'importazione",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadExampleCSV = () => {
    // Create header row
    const headers = CSV_COLUMNS.map((col) => col.name);

    // Create example data row
    const exampleValues = CSV_COLUMNS.map((col) => {
      const value = EXAMPLE_ROW[col.name as keyof typeof EXAMPLE_ROW] || "";
      // Escape values with commas or quotes
      if (value.includes(",") || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });

    // Create CSV content
    const csvContent = [headers.join(","), exampleValues.join(",")].join("\n");

    // Create and trigger download
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inventario_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      description: "Template CSV scaricato!",
    });
  };

  const resetForm = () => {
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      resetForm();
      setShowColumns(false);
    }, 300);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Importa CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importa Inventario da CSV</DialogTitle>
          <DialogDescription>
            Carica un file CSV con i dati dell&apos;inventario. Se il file
            contiene la colonna ID con valori esistenti, i record verranno
            aggiornati.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Download Template Button */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
            <div>
              <p className="text-sm font-medium">Scarica template CSV</p>
              <p className="text-xs text-muted-foreground">
                Un file di esempio con tutte le colonne
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={downloadExampleCSV}>
              <Download className="mr-2 h-4 w-4" />
              Scarica
            </Button>
          </div>

          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${
                selectedFile
                  ? "border-green-500 bg-green-500/10"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }
            `}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,text/csv"
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet className="h-10 w-10 text-green-500" />
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetForm();
                  }}
                >
                  Cambia file
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Trascina qui il file CSV</p>
                <p className="text-sm text-muted-foreground">
                  oppure clicca per selezionare
                </p>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="skipDuplicates"
              checked={skipDuplicates}
              onCheckedChange={(checked) =>
                setSkipDuplicates(checked as boolean)
              }
            />
            <Label htmlFor="skipDuplicates" className="text-sm">
              Salta prodotti duplicati (stesso codice interno)
            </Label>
          </div>

          {/* CSV Columns Info */}
          <div className="rounded-lg border">
            <button
              type="button"
              className="w-full p-3 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
              onClick={() => setShowColumns(!showColumns)}
            >
              <span className="text-sm font-medium">
                Colonne CSV ({CSV_COLUMNS.length})
              </span>
              <span className="text-xs text-muted-foreground">
                {showColumns ? "Nascondi ▲" : "Mostra ▼"}
              </span>
            </button>

            {showColumns && (
              <div className="border-t max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Colonna</th>
                      <th className="text-left p-2 font-medium">Descrizione</th>
                      <th className="text-center p-2 font-medium w-20">
                        Stato
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {CSV_COLUMNS.map((col, idx) => (
                      <tr
                        key={col.name}
                        className={
                          idx % 2 === 0 ? "bg-background" : "bg-muted/30"
                        }
                      >
                        <td className="p-2 font-mono">{col.name}</td>
                        <td className="p-2 text-muted-foreground">
                          {col.description}
                        </td>
                        <td className="p-2 text-center">
                          {col.required ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              Obbligatorio
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              Opzionale
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Note:</span>
            <br />• <strong>Per aggiornare:</strong> esporta l&apos;inventario,
            modifica il CSV e reimporta (l&apos;ID identifica i record)
            <br />• Se NOME è vuoto, verrà generato da Sottocategoria2 + Colore
            o dal Codice Interno
            <br />• Se CAT o COD_CAT non esistono come categoria, verrà creata
            automaticamente
          </p>

          {/* Results */}
          {result && (
            <div
              className={`rounded-lg p-4 ${
                result.success ? "bg-green-500/10" : "bg-red-500/10"
              }`}
            >
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-medium">
                    {result.success
                      ? "Importazione completata"
                      : "Importazione con errori"}
                  </p>
                  <div className="text-sm mt-2 space-y-1">
                    <p>Righe totali: {result.totalRows}</p>
                    <p className="text-green-600">
                      Nuovi importati: {result.imported}
                    </p>
                    {result.updated > 0 && (
                      <p className="text-blue-600">
                        Aggiornati: {result.updated}
                      </p>
                    )}
                    <p className="text-yellow-600">Saltati: {result.skipped}</p>
                    {result.duplicates.length > 0 && (
                      <p className="text-orange-600">
                        Duplicati: {result.duplicates.length}
                      </p>
                    )}
                  </div>
                  {result.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-600">
                        Errori:
                      </p>
                      <ul className="text-xs text-red-600 list-disc list-inside max-h-24 overflow-y-auto">
                        {result.errors.slice(0, 10).map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                        {result.errors.length > 10 && (
                          <li>...e altri {result.errors.length - 10} errori</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {result?.success ? "Chiudi" : "Annulla"}
          </Button>
          {!result?.success && (
            <Button
              onClick={handleImport}
              disabled={!selectedFile || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importazione...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importa
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DialogImportCSV;
