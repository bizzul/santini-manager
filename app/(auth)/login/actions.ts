"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { nukeCookies } from "@/utils/nukeCookie";
import { sanitizeInternalNextPath } from "@/lib/pwa/home-mode";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    return { error: error.message || "Invalid credentials" };
  }

  // A normal login is not a kiosk session: clear any stale quick-login marker
  // so logout returns to /login (not to a previous site's quick-login screen).
  const cookieStore = await cookies();
  cookieStore.delete("ql-domain");

  // After successful login, hand off to the landing resolver: it applies
  // landing_preferita / mobile / last-space rules server-side.
  revalidatePath("/sites/select", "page");
  const next =
    sanitizeInternalNextPath(String(formData.get("next") ?? "")) ?? "/launch";
  return redirect(next);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const COOKIE_NAME = process.env.COOKIE_NAME ?? "reactive-app:session";
  const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? ".localhost";
  const cookiesToRemove = [`${COOKIE_NAME}`, `${COOKIE_NAME}-code-verifier`];
  nukeCookies(cookiesToRemove, COOKIE_DOMAIN);
  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    redirect("/error");
  }

  revalidatePath("/", "layout");
  redirect("/");
}
