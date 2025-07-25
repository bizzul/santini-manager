"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { nukeCookies } from "@/utils/nukeCookie";
import { cookies } from "next/headers";
import { getUserSites } from "@/lib/auth-utils";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    return redirect("/login?error=Invalid credentials");
  }

  const cookieStore = await cookies();
  cookieStore.set("sb-auth", JSON.stringify(data.session), { // cookie options
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
    expires: new Date(data.session?.expires_at?.toString() || 0),
  });

  // Fetch user sites and redirect accordingly
  const sites = await getUserSites();
  if (sites && sites.length === 1) {
    // Redirect directly to the only site
    const site = sites[0];
    const domain = site.domain || site.subdomain || site.id;
    return redirect(`/sites/${domain}`);
  } else if (sites && sites.length > 1) {
    // Redirect to site selection page
    return redirect("/sites/select");
  } else {
    // No sites assigned, redirect to a fallback page
    return redirect("/sites/select");
  }
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const COOKIE_NAME = process.env.COOKIE_NAME ?? "appname:session";
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
