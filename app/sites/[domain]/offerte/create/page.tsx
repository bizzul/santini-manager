import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getServerSiteContext } from "@/lib/server-data";
import OfferCreateClient from "./OfferCreateClient";

export default async function OfferCreatePage({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>;
  searchParams: Promise<{
    kanbanId?: string;
    draftId?: string;
    targetColumn?: string;
  }>;
}) {
  const { domain } = await params;
  const { kanbanId, draftId, targetColumn } = await searchParams;

  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Get site context
  const siteContext = await getServerSiteContext(domain);

  if (!siteContext) {
    redirect("/");
  }

  const siteId = siteContext.siteId;

  // If no kanbanId provided, find the first offer kanban
  let targetKanbanId = kanbanId ? parseInt(kanbanId) : null;

  if (!targetKanbanId) {
    const { data: offerKanban } = await supabase
      .from("Kanban")
      .select("id")
      .eq("site_id", siteId)
      .eq("is_offer_kanban", true)
      .limit(1)
      .single();

    if (offerKanban) {
      targetKanbanId = offerKanban.id;
    }
  }

  // Get clients for the site
  const { data: clients } = await supabase
    .from("Client")
    .select("*")
    .eq("site_id", siteId)
    .order("businessName", { ascending: true });

  // Get active sell products for the site
  const { data: products } = await supabase
    .from("sell_products")
    .select("*, category:sellproduct_categories(*)")
    .eq("site_id", siteId)
    .eq("active", true)
    .order("name", { ascending: true });

  // Fetch draft task data if draftId is provided
  let draftTask = null;
  if (draftId) {
    const { data: draft } = await supabase
      .from("Task")
      .select("*")
      .eq("id", parseInt(draftId))
      .eq("site_id", siteId)
      .single();

    if (draft) {
      draftTask = draft;
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }
      >
        <OfferCreateClient
          domain={domain}
          siteId={siteId}
          kanbanId={targetKanbanId}
          clients={clients || []}
          products={products || []}
          draftTask={draftTask}
          targetColumnId={targetColumn ? parseInt(targetColumn) : null}
        />
      </Suspense>
    </div>
  );
}
