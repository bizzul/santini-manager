"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect } from "@/components/ui/search-select";
import {
  Check,
  FileDown,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Client, OfferProductLine, SellProduct, Task } from "@/types/supabase";
import {
  normalizeOfferProducts,
  sanitizeOfferProducts,
  sumOfferPieces,
  sumOfferProductsTotal,
} from "@/lib/offers";
import { useToast } from "@/components/ui/use-toast";

interface OfferWizardProps {
  kanbanId: number;
  onComplete: (offerData: any) => Promise<void>;
  onCancel: () => void;
  domain?: string;
  clients: Client[];
  products: SellProduct[];
  draftTask?: Task | null;
}

type SubmitAction = "save" | "pdf";

export default function OfferWizard({
  kanbanId,
  onComplete,
  onCancel,
  clients,
  products,
  draftTask,
}: OfferWizardProps) {
  const initialProducts = normalizeOfferProducts(draftTask);
  const draftCategoryIds =
    draftTask?.draft_category_ids || draftTask?.draftCategoryIds || [];
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [submitAction, setSubmitAction] = useState<SubmitAction>("save");
  const [formData, setFormData] = useState({
    unique_code: "",
    clientId: (draftTask?.clientId || draftTask?.client_id)?.toString() || "",
    name: draftTask?.name || "",
    luogo: draftTask?.luogo || "",
    deliveryDate: draftTask?.deliveryDate || "",
    other: draftTask?.other || "",
  });
  const [offerProducts, setOfferProducts] = useState<OfferProductLine[]>(
    initialProducts.length > 0
      ? initialProducts
      : [
          {
            productId: null,
            productName: null,
            description: null,
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
          },
        ],
  );

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(draftCategoryIds) || draftCategoryIds.length === 0) {
      return products;
    }

    return products.filter((product) => {
      const categoryId = product.category_id || product.category?.id;
      return categoryId ? draftCategoryIds.includes(categoryId) : false;
    });
  }, [draftCategoryIds, products]);

  const productOptions = useMemo(
    () =>
      filteredProducts.map((product) => ({
        value: product.id,
        label: [product.name, product.type].filter(Boolean).join(" "),
      })),
    [filteredProducts],
  );

  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        value: client.id,
        label:
          client.businessName ||
          `${client.individualLastName || ""} ${client.individualFirstName || ""}`.trim() ||
          "Cliente",
      })),
    [clients],
  );

  const setField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const generateCode = useCallback(async () => {
    setIsLoadingCode(true);
    try {
      const params = new URLSearchParams();
      params.set("kanbanId", String(kanbanId));
      const response = await fetch(`/api/tasks/generate-code?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Impossibile generare il codice");
      }
      const data = await response.json();
      setFormData((current) => ({
        ...current,
        unique_code: data.code || current.unique_code,
      }));
    } catch (error) {
      console.error("Error generating offer code:", error);
    } finally {
      setIsLoadingCode(false);
    }
  }, [kanbanId]);

  useEffect(() => {
    if (draftTask?.unique_code) {
      setFormData((current) => ({
        ...current,
        unique_code: draftTask.unique_code || current.unique_code,
      }));
      return;
    }

    generateCode();
  }, [draftTask?.id, draftTask?.unique_code, generateCode]);

  const handleProductChange = (
    index: number,
    patch: Partial<OfferProductLine>,
  ) => {
    setOfferProducts((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const updatedLine = { ...line, ...patch };
        if (patch.productId !== undefined) {
          const selectedProduct = products.find(
            (product) => product.id === patch.productId,
          );
          const fallbackProduct = filteredProducts.find(
            (product) => product.id === patch.productId,
          );
          updatedLine.productName =
            selectedProduct?.name ||
            selectedProduct?.type ||
            fallbackProduct?.name ||
            fallbackProduct?.type ||
            null;
          if (!updatedLine.description) {
            updatedLine.description =
              selectedProduct?.description ||
              fallbackProduct?.description ||
              null;
          }
        }
        const quantity = Number(updatedLine.quantity || 0);
        const unitPrice = Number(updatedLine.unitPrice || 0);
        updatedLine.totalPrice = Number((quantity * unitPrice).toFixed(2));
        return updatedLine;
      }),
    );
  };

  const addProductLine = () => {
    if (offerProducts.length >= 5) return;
    setOfferProducts((current) => [
      ...current,
      {
        productId: null,
        productName: null,
        description: null,
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
  };

  const removeProductLine = (index: number) => {
    setOfferProducts((current) => current.filter((_, lineIndex) => lineIndex !== index));
  };

  const sanitizedProducts = useMemo(
    () => sanitizeOfferProducts(offerProducts),
    [offerProducts],
  );
  const totalOffer = useMemo(
    () => sumOfferProductsTotal(sanitizedProducts),
    [sanitizedProducts],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const firstProductId =
      sanitizedProducts.find((item) => item.productId)?.productId || null;
    const totalPieces = sumOfferPieces(sanitizedProducts);

    if (!formData.unique_code.trim()) {
      await generateCode();
      return;
    }

    if (!formData.clientId) {
      toast({
        variant: "destructive",
        description: "Seleziona il cliente prima di salvare l'offerta.",
      });
      return;
    }

    if (!firstProductId) {
      toast({
        variant: "destructive",
        description: "Aggiungi almeno un prodotto valido all'offerta.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onComplete({
        unique_code: formData.unique_code.trim(),
        clientId: Number(formData.clientId),
        name: formData.name.trim(),
        luogo: formData.luogo.trim(),
        deliveryDate: formData.deliveryDate || null,
        other: formData.other.trim(),
        offerProducts: sanitizedProducts,
        productId: firstProductId,
        sellPrice: totalOffer,
        numero_pezzi: totalPieces,
        draftCategoryIds: null,
        downloadPdf: submitAction === "pdf",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between gap-6">
          <div>
            <CardTitle>Configuratore offerta</CardTitle>
            <CardDescription>
              Inserisci prodotti, descrizioni, pezzi e prezzi. Puoi salvare
              l&apos;offerta oppure esportarla subito in PDF.
            </CardDescription>
          </div>
          <div className="rounded-lg border bg-muted/30 px-4 py-3 min-w-[180px] text-right">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Totale
            </div>
            <div className="text-2xl font-bold">
              CHF {totalOffer.toLocaleString("it-IT", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Codice</label>
              <div className="flex gap-2">
                <Input
                  value={formData.unique_code}
                  onChange={(e) => setField("unique_code", e.target.value)}
                  disabled={isSubmitting || isLoadingCode}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={generateCode}
                  disabled={isSubmitting || isLoadingCode}
                >
                  {isLoadingCode ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cliente</label>
              <SearchSelect
                value={formData.clientId ? Number(formData.clientId) : undefined}
                onValueChange={(value) => setField("clientId", value ? String(value) : "")}
                disabled={isSubmitting}
                options={clientOptions}
                placeholder="Seleziona cliente"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Oggetto</label>
              <Input
                value={formData.name}
                onChange={(e) => setField("name", e.target.value)}
                disabled={isSubmitting}
                placeholder="Ad esempio: Villa delle Rose"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Luogo</label>
              <Input
                value={formData.luogo}
                onChange={(e) => setField("luogo", e.target.value)}
                disabled={isSubmitting}
                placeholder="Indica il luogo del progetto"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Data di consegna indicativa
              </label>
              <Input
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => setField("deliveryDate", e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Righe offerta</h3>
                <p className="text-sm text-muted-foreground">
                  Massimo 5 prodotti, con descrizione e prezzo modificabili.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addProductLine}
                disabled={isSubmitting || offerProducts.length >= 5}
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi riga
              </Button>
            </div>

            <div className="space-y-4">
              {offerProducts.map((line, index) => (
                <div
                  key={`${line.productId || "line"}-${index}`}
                  className="grid grid-cols-[220px_minmax(0,1fr)_90px_120px_120px_auto] gap-3 items-start"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prodotto</label>
                    <SearchSelect
                      value={line.productId || undefined}
                      onValueChange={(value) =>
                        handleProductChange(index, {
                          productId: value ? Number(value) : null,
                        })
                      }
                      disabled={isSubmitting}
                      options={productOptions}
                      placeholder="Seleziona prodotto"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descrizione</label>
                    <Textarea
                      value={line.description || ""}
                      onChange={(e) =>
                        handleProductChange(index, {
                          description: e.target.value,
                        })
                      }
                      disabled={isSubmitting}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pezzi</label>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity ?? ""}
                      onChange={(e) =>
                        handleProductChange(index, {
                          quantity: e.target.value ? Number(e.target.value) : 0,
                        })
                      }
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prezzo</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unitPrice ?? ""}
                      onChange={(e) =>
                        handleProductChange(index, {
                          unitPrice: e.target.value ? Number(e.target.value) : 0,
                        })
                      }
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Totale</label>
                    <Input
                      value={(line.totalPrice || 0).toFixed(2)}
                      disabled
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-8"
                    onClick={() => removeProductLine(index)}
                    disabled={isSubmitting || offerProducts.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Note</label>
            <Textarea
              value={formData.other}
              onChange={(e) => setField("other", e.target.value)}
              disabled={isSubmitting}
              rows={4}
              placeholder="Inserisci eventuali note da riportare nell'offerta"
            />
          </div>

          <CardFooter className="px-0 pb-0 pt-2 flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="outline"
                onClick={() => setSubmitAction("save")}
                disabled={isSubmitting}
              >
                {isSubmitting && submitAction === "save" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Salva offerta
                  </>
                )}
              </Button>
              <Button
                type="submit"
                onClick={() => setSubmitAction("pdf")}
                disabled={isSubmitting}
              >
                {isSubmitting && submitAction === "pdf" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Esportazione...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 mr-2" />
                    Salva e PDF
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
