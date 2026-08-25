"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  isPwaHomeMode,
  pwaHomeCookieOptions,
  PWA_HOME_COOKIE,
  type PwaHomeMode,
} from "@/lib/pwa/home-mode";

export async function setPwaHomeMode(mode: PwaHomeMode) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/pwa/home");
  }

  if (!isPwaHomeMode(mode)) {
    redirect("/pwa/home");
  }

  const cookieStore = await cookies();
  cookieStore.set(PWA_HOME_COOKIE, mode, pwaHomeCookieOptions());
  redirect("/launch");
}
