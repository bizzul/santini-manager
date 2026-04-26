"use client";

import { useState } from "react";
import { ShoppingBag, Search } from "lucide-react";
import { ProductsDashboardStats } from "@/lib/server-data";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <div className="dashboard-panel p-6">
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
        <div className="dashboard-panel-inner flex flex-wrap items-center gap-2 p-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-48 rounded-xl border-slate-700 bg-slate-900/80 pl-9 text-sm"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-9 w-40 rounded-xl border-slate-700 bg-slate-900/80 text-sm">
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
        <div className="dashboard-panel-subtitle text-center py-8">
          Nessun prodotto trovato
        </div>
      ) : (
        <div className="dashboard-panel-inner overflow-x-auto">
          <Table className="min-w-[620px]">
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="bg-slate-950/80 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Nome
                </TableHead>
                <TableHead className="bg-slate-950/80 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Categoria
                </TableHead>
                <TableHead className="bg-slate-950/80 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Codice
                </TableHead>
                <TableHead className="bg-slate-950/80 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Stato
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-white/5">
              {displayProducts.map((product) => (
                <TableRow
                  key={product.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Apri prodotto ${product.name}`}
                  className="cursor-pointer border-white/5 transition-colors hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none"
                  onClick={() => {
                    window.location.href = `/sites/${domain}/products?productId=${product.id}`;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      window.location.href = `/sites/${domain}/products?productId=${product.id}`;
                    }
                  }}
                >
                  <TableCell className="px-3 py-3">
                    <span className="text-sm font-medium">{product.name}</span>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <span className="dashboard-panel-subtitle">
                      {product.category}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <span className="dashboard-panel-subtitle font-mono">
                      {product.sku || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-3 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        product.active
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {product.active ? "Attivo" : "Inattivo"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
