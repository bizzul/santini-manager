"use server";

import { cookies } from "next/headers";
import { VISTA_COOKIE, type Vista } from "@/lib/personale/vista";

export async function setVistaPreference(vista: Vista): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(VISTA_COOKIE, vista, {
    path: "/",
    sameSite: "lax",
    // Cookie di sessione: la preferenza vale finche' il browser resta aperto.
  });
}
