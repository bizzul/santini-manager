import { getSiteData } from "@/lib/fetchers";

export async function generateMetadata({
  params,
}: {
  params: { domain: string; slug: string };
}) {
  const domain = decodeURIComponent(params.domain);
  const slug = decodeURIComponent(params.slug);

  const [siteData] = await Promise.all([getSiteData(domain)]);
  if (!siteData) {
    return null;
  }
}

export default async function SiteHomePage() {
  return (
    <>
      <div>Test </div>
    </>
  );
}
