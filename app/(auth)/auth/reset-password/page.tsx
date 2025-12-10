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

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; token?: string; type?: string }>;
}) {
  const { token_hash, token, type } = await searchParams;

  // Debug: log what we received
  logger.debug("Reset password params:", { token_hash, token, type });

  // Supabase sends either token_hash or token, handle both cases
  const actualToken = token_hash || token;

  if (!actualToken || !type) {
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

  // For password recovery, we don't verify the token server-side
  // Instead, we pass it to the client component which will handle the verification
  // This is the standard approach for Supabase password recovery

  // Show password update form - the client component will handle token verification
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <UpdatePasswordForm token={actualToken} />
      </div>
    </div>
  );
}
