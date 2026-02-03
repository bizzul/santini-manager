"use client";

import { useState } from "react";
import { ShoppingBag, Search } from "lucide-react";
import { ProductsDashboardStats } from "@/lib/server-data";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ResaleProductsTableProps {
  data: ProductsDashboardStats["resale"]["products"];
  categories: ProductsDashboardStats["resale"]["productsByCategory"];
}

export default function ResaleProductsTable({
  data,
  categories,
}: ResaleProductsTableProps) {
  const params = useParams();
  const domain = params.domain as string;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Filter products
  const filteredProducts = data.filter((product) => {
    const matchesSearch =
      searchTerm === "" ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku &&
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Take top 50 for display
  const displayProducts = filteredProducts.slice(0, 50);

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Prodotti per rivendita</h3>
            <p className="text-xs text-muted-foreground">
              Catalogo prodotti attivi
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-48 h-8 text-sm bg-slate-800/50 border-slate-700"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40 h-8 text-sm bg-slate-800/50 border-slate-700">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le categorie</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.category} value={cat.category}>
                  {cat.category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {displayProducts.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          Nessun prodotto trovato
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide py-3 px-2">
                  Nome
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide py-3 px-2">
                  Categoria
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide py-3 px-2">
                  Codice
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wide py-3 px-2">
                  Stato
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayProducts.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => {
                    window.location.href = `/sites/${domain}/products?productId=${product.id}`;
                  }}
                >
                  <td className="py-3 px-2">
                    <span className="text-sm font-medium">{product.name}</span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-sm text-muted-foreground">
                      {product.category}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-sm text-muted-foreground font-mono">
                      {product.sku || "-"}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        product.active
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {product.active ? "Attivo" : "Inattivo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length > 50 && (
            <div className="text-center py-3 text-xs text-muted-foreground">
              Mostrando 50 di {filteredProducts.length} prodotti.{" "}
              <Link
                href={`/sites/${domain}/products`}
                className="text-blue-400 hover:underline"
              >
                Vedi tutti
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
