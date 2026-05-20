import { redirect } from "next/navigation";

/**
 * Stale route - clients are edited inline via the `DialogEdit` component on the
 * clients list page. The previous implementation accidentally rendered the
 * inventory `MobilePage`. Redirect back to the clients list to avoid surfacing
 * broken UI.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  redirect(`/sites/${domain}/clients`);
}
