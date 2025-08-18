import { redirect } from "next/navigation";
import SinglePageComponent from "./singlePageComponent";
import { getUserContext } from "@/lib/auth-utils";
import { createClient } from "@/utils/server";

async function getData(id: number) {
  // Fetch data from your API here.
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("packing_control")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching packing control:", error);
    return null;
  }

  return data;
}

async function Page({ params }: { params: Promise<{ id: number }> }) {
  //get initial data
  const { id } = await params;
  const data = await getData(id);

  const userContext = await getUserContext();

  if (!userContext || !userContext.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }
  // Now it's safe to use session.user
  const { user } = userContext;

  return (
    <>
      <SinglePageComponent data={data!} user={user} />
    </>
  );
}

export default Page;
