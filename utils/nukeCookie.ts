"use server";

import { cookies } from "next/headers";

// inspired by https://github.com/supabase/supabase/issues/27283#issuecomment-2170478242
export const nukeCookies = async (cookiesToRemove: string[], domain: string) => {
  const cookieStore = await cookies();
  const epoch = new Date(0);

  for (const cookie of cookiesToRemove) {
    // Attempt to delete the cookie
    cookieStore.delete({
      name: cookie,
      httpOnly: false,
      sameSite: "lax",
      domain,
    });

    // Also set the cookie with various options to ensure deletion
    cookieStore.set({
      name: cookie,
      value: "",
      expires: epoch,
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      domain: domain,
      maxAge: -1,
    });

    // Set without domain
    cookieStore.set({
      name: cookie,
      value: "",
      expires: epoch,
      sameSite: "lax",
      httpOnly: false,
      path: "/",
      maxAge: -1,
    });

    // For Chrome
    cookieStore.delete({
      name: cookie,
      domain,
      httpOnly: false,
      sameSite: "lax",
    });

    // For Firefox
    cookieStore.delete({
      name: cookie,
      path: "/",
      domain,
      httpOnly: false,
      sameSite: "lax",
    });
  }

  return "done";
};