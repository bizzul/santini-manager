"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { COOKIE_OPTIONS } from "@/utils/supabase/cookie";
import { getSiteUserEmailForLogin } from "./data";

const QUICK_LOGIN_COOKIE = "ql-domain";

export async function quickSignIn(
  domain: string,
  userId: number,
  password: string,
) {
  if (!domain || !userId || typeof password !== "string" || password.length === 0) {
    return { error: "Inserisci la password." };
  }

  // Resolve the email server-side AND verify the user belongs to this site,
  // so the email is never exposed in the page HTML and a site kiosk can only
  // authenticate its own users.
  const email = await getSiteUserEmailForLogin(domain, userId);
  if (!email) {
    return { error: "Utente non disponibile." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message || "Credenziali non valide." };
  }

  // Remember that this session was started from the site kiosk, so logout can
  // bring the user back to the quick-login screen of the same site. Not
  // httpOnly: the client logout handler reads it. Only stores the site slug.
  const cookieStore = await cookies();
  cookieStore.set(QUICK_LOGIN_COOKIE, domain, {
    ...COOKIE_OPTIONS,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/sites/select", "page");
  return redirect("/sites/select");
}
