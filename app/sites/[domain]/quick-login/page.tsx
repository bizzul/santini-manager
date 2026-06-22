import { redirect } from "next/navigation";

// The real quick-login lives at /quick-login/[domain] (public, outside the
// authenticated /sites area). This route only exists so the intuitive URL
// /sites/[domain]/quick-login redirects there. Note: the parent site layout
// requires auth, so this redirect only runs for logged-in users.
export default async function SiteQuickLoginRedirect({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  redirect(`/quick-login/${domain}`);
}
