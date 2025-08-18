import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import MobilePage from "@/components/inventory/MobilePage";
import { createClient } from "@/utils/server";
async function getData(id: number): Promise<any> {
  try {
    // Fetch data from your API here.
    const supabase = await createClient();
    const { data: product, error: productError } = await supabase
      .from("product")
      .select("*")
      .eq("inventoryId", Number(id))
      .single();

    return product;
  } catch (err) {
    return { error: "no Product Found" };
  }
}

async function Page({ params }: { params: Promise<{ id: number }> }) {
  const { id } = await params;
  //get initial data
  const data = await getData(id);

  const userContext = await getUserContext();

  if (!userContext || !userContext.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }

  // Now it's safe to use session.user
  const { user } = userContext;

  if (data.error) {
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
