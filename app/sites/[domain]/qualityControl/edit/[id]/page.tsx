import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import SinglePageComponent from "./singlePageComponent";
import { createClient } from "@/utils/server";
import { requireServerSiteContext } from "@/lib/server-data";

async function getData(id: number, siteId: string) {
  // Fetch data from your API here.
  // Fetch all the products
  const supabase = await createClient();
  const { data: qualityControl, error: qualityControlError } = await supabase
    .from("quality_control")
    .select(
      `
    *,
    items:items(*),
    task:task(*),
    user:user(*)
  `
    )
    .eq("id", id)
    .eq("site_id", siteId)
    .single();

  if (qualityControlError) {
    console.error("Error fetching quality control:", qualityControlError);
    return { quality: null };
  }

  return qualityControl[0];
}

async function Page({ params }: { params: Promise<{ id: number; domain: string }> }) {
  const { id, domain } = await params;

  const session = await getUserContext();

  if (!session || !session.user) {
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
  const { user } = session;

  return (
    <>
      <SinglePageComponent data={data!} user={user} />
    </>
  );
}

export default Page;
