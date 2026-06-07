import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import MobilePage from "@/components/inventory/MobilePage";
import { createClient } from "@/utils/server";
import { requireServerSiteContext } from "@/lib/server-data";
import { ErrorState } from "@/components/layout/error-state";

async function getData(id: number, siteId: string): Promise<any> {
  try {
    // Fetch data from your API here.
    const supabase = await createClient();
    const { data: product, error: productError } = await supabase
      .from("product")
      .select("*")
      .eq("inventoryId", Number(id))
      .eq("site_id", siteId)
      .single();

    return product;
  } catch (err) {
    return { error: "no Product Found" };
  }
}

async function Page({ params }: { params: Promise<{ id: number; domain: string }> }) {
  const { id, domain } = await params;

  const userContext = await getUserContext();

  if (!userContext || !userContext.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }

  // Get site context (required for multi-tenant)
  const siteContext = await requireServerSiteContext(domain);
  const { siteId } = siteContext;

  //get initial data filtered by siteId
  const data = await getData(id, siteId);

  // Now it's safe to use session.user
  const { user } = userContext;

  if (data.error) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-page-shadow px-6">
        <ErrorState
          variant="block"
          title={`Nessun prodotto con questo ID: ${id}`}
        />
      </div>
    );
  }
  return <MobilePage data={data} />;
}

export default Page;
