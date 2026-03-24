import { redirect } from "next/navigation";

export default async function ProjectConsuntivoRedirectPage({
  params,
}: {
  params: Promise<{ domain: string; id: string }>;
}) {
  const { domain, id } = await params;
  redirect(`/sites/${domain}/progetti/${id}`);
}
