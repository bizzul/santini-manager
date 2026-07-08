import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { fetchCalendarEvents } from "@/lib/momentum-data";
import { PageLayout, PageContent } from "@/components/page-layout";
import MomentumHeader from "@/components/momentum/MomentumHeader";
import MomentumCalendar from "@/components/momentum/MomentumCalendar";

export default async function MomentumCalendario({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { domain } = await params;
  const { year: yearParam } = await searchParams;
  const userContext = await getUserContext();
  if (!userContext?.user) return redirect("/login");

  const year = Number(yearParam) || new Date().getFullYear();
  const { siteId } = await requireServerSiteContext(domain);
  const eventi = await fetchCalendarEvents(siteId, year);

  return (
    <PageLayout>
      <div className="border-b bg-page/95 px-4 py-4 md:px-6 lg:px-8">
        <MomentumHeader subtitle={`Calendario eventi ${year}`} />
      </div>
      <PageContent>
        <MomentumCalendar eventi={eventi} year={year} domain={domain} />
      </PageContent>
    </PageLayout>
  );
}
