"use client";

import ApexBarChart from "@/components/charts/ApexBarChart";
import { CATEGORIA_PRODOTTO_LABEL, formatCHF } from "./types";

export default function RedditivitaChart({
  perCategoria,
}: {
  perCategoria: Array<{ categoria: string; ricavo: number; costi: number }>;
}) {
  if (perCategoria.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nessun dato di redditività disponibile.
      </p>
    );
  }

  const categories = perCategoria.map(
    (c) =>
      CATEGORIA_PRODOTTO_LABEL[
        c.categoria as keyof typeof CATEGORIA_PRODOTTO_LABEL
      ] || c.categoria
  );

  const series = [
    {
      name: "Ricavo",
      data: perCategoria.map((c) => Math.round(c.ricavo)),
      color: "#16a34a",
    },
    {
      name: "Costi",
      data: perCategoria.map((c) => Math.round(c.costi)),
      color: "#dc2626",
    },
    {
      name: "Margine",
      data: perCategoria.map((c) => Math.round(c.ricavo - c.costi)),
      color: "#2563eb",
    },
  ];

  return (
    <div>
      <ApexBarChart categories={categories} series={series} height={300} />
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {perCategoria.map((c) => (
          <div
            key={c.categoria}
            className="rounded-lg border bg-card/60 p-2 text-center"
          >
            <p className="text-xs text-muted-foreground">
              {CATEGORIA_PRODOTTO_LABEL[
                c.categoria as keyof typeof CATEGORIA_PRODOTTO_LABEL
              ] || c.categoria}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {formatCHF(c.ricavo - c.costi)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
