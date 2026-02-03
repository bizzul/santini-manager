"use client";

import { ShoppingBag, Layers, Tag } from "lucide-react";
import { ProductsDashboardStats } from "@/lib/server-data";
import Link from "next/link";
import { useParams } from "next/navigation";

interface ResaleKPICardsProps {
  data: ProductsDashboardStats["resale"];
}

function formatNumber(value: number): string {
  return value.toLocaleString("it-CH");
}

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgClass: string;
  href?: string;
}

function KPICard({
  title,
  value,
  subtitle,
  icon,
  iconBgClass,
  href,
}: KPICardProps) {
  const content = (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-5 relative overflow-hidden hover:bg-white/15 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-lg ${iconBgClass} flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-medium mb-2">{title}</p>
      <h3 className="text-2xl font-bold mb-1">{value}</h3>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export default function ResaleKPICards({ data }: ResaleKPICardsProps) {
  const params = useParams();
  const domain = params.domain as string;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Prodotti disponibili */}
      <KPICard
        title="Prodotti disponibili"
        value={formatNumber(data.availableProducts)}
        subtitle="Prodotti attivi in catalogo"
        icon={<ShoppingBag className="w-5 h-5 text-blue-500" />}
        iconBgClass="bg-blue-500/20"
        href={`/sites/${domain}/products`}
      />

      {/* Categorie attive */}
      <KPICard
        title="Categorie attive"
        value={formatNumber(data.activeCategories)}
        subtitle="Con almeno un prodotto"
        icon={<Layers className="w-5 h-5 text-green-500" />}
        iconBgClass="bg-green-500/20"
        href={`/sites/${domain}/products`}
      />

      {/* Prodotti senza categoria */}
      <KPICard
        title="Prodotti senza categoria"
        value={formatNumber(data.productsWithoutCategory)}
        subtitle={
          data.productsWithoutCategory > 0
            ? "Da classificare"
            : "Tutti classificati"
        }
        icon={<Tag className="w-5 h-5 text-orange-500" />}
        iconBgClass="bg-orange-500/20"
        href={`/sites/${domain}/products?filter=no_category`}
      />
    </div>
  );
}
