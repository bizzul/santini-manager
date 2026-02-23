"use server";

import { createClient } from "@/utils/supabase/server";

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_URL) return process.env.NEXT_PUBLIC_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function resetPasswordAction(email: string) {
  const supabase = await createClient();
  const baseUrl = getBaseUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/update-password`,
  });

  if (error) {
    console.error("[Forgot Password] Error sending reset email:", error.message, "for email:", email);
    return { error: error.message };
  }

  return { success: true };
}
