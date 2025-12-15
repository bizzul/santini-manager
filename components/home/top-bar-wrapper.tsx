import { createClient } from "@/utils/supabase/server";
import TopBar from "@/components/top-bar";

export async function TopBarWrapper() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  let userData = null;
  if (user.user?.id) {
    const { data } = await supabase
      .from("User")
      .select("*")
      .eq("authId", user.user.id)
      .single();
    userData = data;
  }

  return <TopBar user={userData} />;
}

export function TopBarSkeleton() {
  return (
    <div className="w-full h-16 bg-white/10 backdrop-blur-md border-b border-white/20 flex items-center justify-between px-6">
      <div className="w-24 h-8 bg-white/20 rounded animate-pulse" />
      <div className="w-24 h-8 bg-white/20 rounded animate-pulse" />
    </div>
  );
}

