import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isPwaHomeMode, PWA_HOME_COOKIE } from "@/lib/pwa/home-mode";
import { PwaHomeChooser } from "./pwa-home-chooser";

export default async function PwaHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/pwa/home");
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(PWA_HOME_COOKIE)?.value;
  const current = isPwaHomeMode(raw) ? raw : undefined;

  return <PwaHomeChooser current={current} />;
}
