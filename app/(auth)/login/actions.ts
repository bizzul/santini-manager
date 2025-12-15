"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { nukeCookies } from "@/utils/nukeCookie";

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

  // After successful login, always redirect to sites/select
  // The page will fetch the sites with the now-established session
  // This avoids issues with trying to fetch data before cookies are committed
  revalidatePath("/sites/select", "page");
  return redirect("/sites/select");
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
