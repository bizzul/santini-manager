import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { isManagerOfManagersEnabled } from "@/lib/manager-projects/flag";
import { listKbArticles } from "@/lib/support/queries.server";
import { SupportKbManager } from "@/components/support/SupportKbManager";

export const dynamic = "force-dynamic";

export default async function AdminSupportKbPage() {
  const userContext = await getUserContext();
  if (!userContext || userContext.role !== "superadmin") {
    redirect("/administration");
  }
  if (!isManagerOfManagersEnabled()) {
    redirect("/administration");
  }

  const articles = await listKbArticles({ globalOnly: true });

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          Knowledge base globale
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Articoli visibili in tutti gli Spazi con il bot assistenza attivo.
        </p>
      </div>
      <SupportKbManager articles={articles} allowGlobal />
    </div>
  );
}
