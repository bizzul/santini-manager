import { redirect } from "next/navigation";
import SinglePageComponent from "./singlePageComponent";
import { getUserContext } from "@/lib/auth-utils";
import { createClient } from "@/utils/server";
import { requireServerSiteContext } from "@/lib/server-data";

async function getData(id: number, siteId: string) {
  // Fetch data from your API here.
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("packing_control")
    .select("*")
    .eq("id", id)
    .eq("site_id", siteId)
    .single();

  if (error) {
    console.error("Error fetching packing control:", error);
    return null;
  }

  return data;
}

async function Page({ params }: { params: Promise<{ id: number; domain: string }> }) {
  //get initial data
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

  const data = await getData(id, siteId);

  // Now it's safe to use session.user
  const { user } = userContext;

  return (
    <>
      <SinglePageComponent data={data!} user={user} />
    </>
  );
}

export default Page;
