import { UpdatePasswordForm } from "@/components/update-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { logger } from "@/lib/logger";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string;
    token?: string;
    type?: string;
    code?: string;
  }>;
}) {
  const { token_hash, token, type, code } = await searchParams;

  // Debug: log what we received
  logger.debug("Update password params:", { token_hash, token, type, code });

  // Supabase sends either token_hash, token, or code depending on the flow
  const actualToken = token_hash || token;

  // If there's a code, this is a PKCE flow - the code should have been exchanged
  // in the callback route, so the user should have a session
  // If there's no token and no code, show error for password reset flow
  // but allow the page if user is already authenticated (regular password change)
  if (type === "recovery" && !actualToken && !code) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
              <CardDescription>
                This password reset link is invalid or has expired.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/auth/forgot-password">
                <Button className="w-full">Request New Reset Link</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <UpdatePasswordForm token={actualToken} />
      </div>
    </div>
  );
}
