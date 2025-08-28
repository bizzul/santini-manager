import Link from "next/link";
import { Button } from "@/components/ui/button";
import TopBar from "@/components/top-bar";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  const { data: userData, error: userError } = await supabase
    .from("User")
    .select("*")
    .eq("authId", user.user?.id)
    .single();

  return (
    <>
      <TopBar user={userData} />
      <div className="relative min-h-screen overflow-hidden">
        <div className="glass-gradient-bg  absolute inset-0 z-0" />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
          <div className="backdrop-blur-lg bg-white/20 dark:bg-black/20 border border-white/30 dark:border-black/30 rounded-2xl shadow-lg p-10 flex flex-col justify-center items-center">
            <h1 className="text-4xl font-bold mb-6 dark:text-white ">
              Matris Manager
            </h1>
            <div className="space-x-4 ">
              {userData && (
                <div className=" text-xl text-center font-bold mb-4">
                  Ciao {userData?.given_name} {userData?.family_name}
                </div>
              )}

              {userData && (
                <div className="text-sm text-center font-bold mb-4">
                  <Link href="/sites/select">
                    <Button variant="outline" className="hover:bg-white/20">
                      Go to your sites
                    </Button>
                  </Link>
                </div>
              )}
            </div>
            {/* <p className="mt-8 ">This is the root home page</p> */}
            <p className="mt-8 ">COMING SOON THE PRESENTATION OF THE MANAGER</p>
          </div>
        </div>
      </div>
    </>
  );
}
