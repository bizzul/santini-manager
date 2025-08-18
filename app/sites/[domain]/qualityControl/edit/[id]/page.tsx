import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import SinglePageComponent from "./singlePageComponent";
import { createClient } from "@/utils/server";

async function getData(id: number) {
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
    .single();

  if (qualityControlError) {
    console.error("Error fetching quality control:", qualityControlError);
    return { quality: null };
  }

  return qualityControl[0];
}

async function Page({ params }: { params: Promise<{ id: number }> }) {
  const { id } = await params;
  //get initial data
  const data = await getData(id);

  const session = await getUserContext();

  if (!session || !session.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }
  // Now it's safe to use session.user
  const { user } = session;

  return (
    <>
      <SinglePageComponent data={data!} user={user} />
    </>
  );
}

export default Page;
