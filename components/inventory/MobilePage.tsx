"use client";
import React, { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Product } from "@/types/supabase";

import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileWorkflowLayout } from "@/components/layout/mobile-workflow-layout";
import { ErrorState } from "@/components/layout/error-state";

function MobilePage({ data }: { data: Product }) {
  const [tempQuantity, setTempQuantity] = useState(Number(data.quantity));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(data.quantity);
  const { toast } = useToast();

  const decreaseQty = (delta: number) => {
    setTempQuantity((prev) => (prev - delta < 0 ? 0 : prev - delta));
  };

  const increaseQty = (delta: number) => {
    setTempQuantity((prev) => prev + delta);
  };

  const handleChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setTempQuantity(Number.isNaN(value) ? 0 : value);
  };

  const updateQuantity = async (newQuantity: number) => {
    try {
      if (!newQuantity) {
        toast({ description: "Imposta una quantita corretta." });
        return;
      }

      setLoading(true);

      const response = await fetch(
        `/api/inventory/uniqueId/${data.inventoryId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tempQuantity.toString()),
        }
      );

      const result = await response.json();
      if (result.error) {
        setError(result.message);
        toast({ description: `Errore: ${result.error.code}` });
      } else {
        toast({ description: "Prodotto aggiornato correttamente!" });
        setQuantity(newQuantity);
      }
    } catch (err) {
      setError("Failed to update the quantity.");
      toast({ description: "Errore nella richiesta di aggiornamento." });
      console.error("Error updating quantity:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileWorkflowLayout
      title="Modifica quantita"
      subtitle={data.name || "Prodotto selezionato"}
      footer={
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={() => updateQuantity(tempQuantity)}
            disabled={loading}
          >
            Conferma
          </Button>
        </div>
      }
    >
      {error && (
        <ErrorState
          variant="block"
          title="Errore"
          description={
            <>
              {error}
              <p className="mt-1 text-xs opacity-80">
                (aggiorna la pagina per riprovare)
              </p>
            </>
          }
          className="mb-4"
        />
      )}

      <div className="space-y-6">
        <section className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
          <p className="text-2xl font-extrabold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.width}x{data.height}x{data.length}
          </p>
          <p className="mt-3 text-sm text-foreground">{data.description}</p>
          <div className="mt-3 grid gap-1 text-sm">
            <p>
              <span className="text-muted-foreground">Tipo:</span> {data.type}
            </p>
            <p className="text-muted-foreground">{data.supplier}</p>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">
            Quantita attuale in magazzino
          </p>
          <p className="text-3xl font-bold">
            {quantity} <span className="text-base font-normal">{data.unit}</span>
          </p>
        </section>

        <section className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
          <p className="mb-2 text-sm text-muted-foreground">Nuova quantita</p>
          <Input
            value={tempQuantity}
            type="number"
            onChange={handleChangeInput}
            className="text-center text-3xl font-bold h-14"
          />
          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="destructive"
                size="lg"
                onClick={() => decreaseQty(10)}
              >
                -10
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => decreaseQty(5)}
              >
                -5
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => decreaseQty(1)}
                aria-label="Diminuisci di 1"
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Button size="lg" onClick={() => increaseQty(1)} aria-label="Aumenta di 1">
                <Plus className="h-4 w-4" />
              </Button>
              <Button size="lg" onClick={() => increaseQty(5)}>
                +5
              </Button>
              <Button size="lg" onClick={() => increaseQty(10)}>
                +10
              </Button>
            </div>
          </div>
        </section>
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm" />
      )}
    </MobileWorkflowLayout>
  );
}

export default MobilePage;
