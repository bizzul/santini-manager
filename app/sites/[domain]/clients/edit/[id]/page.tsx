import { getUserContext } from "@/lib/auth-utils";
import { Product } from "@/types/supabase";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import MobilePage from "@/components/inventory/MobilePage";
import { requireServerSiteContext } from "@/lib/server-data";

type DataResult = Product | { error: { message: string } };

async function getData(id: number, siteId: string): Promise<DataResult> {
  try {
    // Fetch data from your API here.
    const supabase = await createClient();
    const { data: product, error } = await supabase
      .from("product")
      .select("*")
      .eq("inventoryId", Number(id))
      .eq("site_id", siteId)
      .single();

    if (error || !product) {
      console.error("Error fetching product:", error);
      return { error: { message: "no Product Found" } };
    }

    return product;
  } catch (err) {
    return { error: { message: "no Product Found" } };
  }
}

async function Page({ params }: { params: Promise<{ id: number; domain: string }> }) {
  const { id, domain } = await params;

  const userContext = await getUserContext();

  if (!userContext) {
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
  const { user } = userContext.user;

  if ("error" in data) {
    return (
      <div className="flex justify-center w-screen h-screen flex-col items-center align-middle  text-slate-200 bg-[#1A2027]">
        <h1 className="font-bold text-3xl text-center">
          Nessun prodotto con questo ID: {id}
        </h1>
      </div>
    );
  }
  return (
    <>
      <MobilePage data={data} />
    </>
  );
}

export default Page;
