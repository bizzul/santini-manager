import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";

export async function UserWelcome() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  let userData = null;
  if (user.user?.id) {
    const { data } = await supabase
      .from("User")
      .select("given_name, family_name")
      .eq("authId", user.user.id)
      .single();
    userData = data;
  }

  if (!userData) {
    return (
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4">
        <Link href="/login">
          <Button
            size="lg"
            variant="outline"
            className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white hover:scale-105 shadow-lg hover:shadow-2xl transition-all duration-300 text-lg px-8 py-6 font-semibold"
          >
            Accedi →
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Welcome Message for Logged Users */}
      <div className="text-center mb-4 space-y-3">
        <p className="text-2xl text-white/90 dark:text-white/90">
          È bello rivederti
        </p>
        <p className="text-3xl font-bold text-white">
          {userData.given_name} {userData.family_name}
        </p>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4">
        <Link href="/sites/select">
          <Button
            size="lg"
            variant="outline"
            className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white hover:scale-105 shadow-lg hover:shadow-2xl transition-all duration-300 text-lg px-8 py-6 font-semibold"
          >
            I miei spazi →
          </Button>
        </Link>
      </div>
    </>
  );
}

export function UserWelcomeSkeleton() {
  return (
    <>
      <div className="text-center mb-4 space-y-3">
        <div className="h-8 w-48 mx-auto bg-white/20 rounded animate-pulse" />
        <div className="h-10 w-64 mx-auto bg-white/20 rounded animate-pulse" />
      </div>
      <div className="flex justify-center mb-4">
        <div className="h-14 w-40 bg-white/20 rounded animate-pulse" />
      </div>
    </>
  );
}

