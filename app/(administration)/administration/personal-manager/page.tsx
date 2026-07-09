import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCog } from "lucide-react";
import { getUserContext } from "@/lib/auth-utils";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { BetaAccessManager } from "@/components/personal-manager/BetaAccessManager";
import type { SiteOption } from "./actions";

export const dynamic = "force-dynamic";

export default async function PersonalManagerAdminPage() {
  const userContext = await getUserContext();
  if (!userContext) redirect("/login");

  const { role, user } = userContext;
  if (role !== "admin" && role !== "superadmin") {
    redirect("/administration/unauthorized");
  }

  const supabase = await createClient();
  let sites: SiteOption[] = [];

  if (role === "superadmin") {
    const { data } = await supabase
      .from("sites")
      .select("id, name, subdomain, organization_id")
      .order("name", { ascending: true });
    sites = (data as SiteOption[]) ?? [];
  } else {
    const { data: orgLinks } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user?.id);
    const orgIds = (orgLinks ?? []).map((o) => o.organization_id);
    if (orgIds.length > 0) {
      const { data } = await supabase
        .from("sites")
        .select("id, name, subdomain, organization_id")
        .in("organization_id", orgIds)
        .order("name", { ascending: true });
      sites = (data as SiteOption[]) ?? [];
    }
  }

  return (
    <div className="relative z-10 mx-auto min-h-screen max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/administration">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Administration
          </Button>
        </Link>
      </div>

      <div className="mb-8 flex items-center gap-4">
        <div className="rounded-2xl bg-white/10 p-3">
          <UserCog className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Accesso App Beta</h1>
          <p className="text-white/70">
            Abilita il Manager Personale per un utente e definisci le aree e i
            permessi (read / edit / create).
          </p>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-white/20 bg-white/10 p-6 backdrop-blur-xl">
        {sites.length > 0 ? (
          <BetaAccessManager sites={sites} />
        ) : (
          <p className="py-8 text-center text-white/70">
            Nessuno spazio disponibile da gestire.
          </p>
        )}
      </div>
    </div>
  );
}
