import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserContext } from "@/lib/auth-utils";
import { isManagerOfManagersEnabled } from "@/lib/manager-projects/flag";
import { listSupportTickets } from "@/lib/support/queries.server";
import { SupportTicketsTable } from "@/components/support/SupportTicketsTable";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminSupportInboxPage() {
  const userContext = await getUserContext();
  if (!userContext || userContext.role !== "superadmin") {
    redirect("/administration");
  }
  if (!isManagerOfManagersEnabled()) {
    redirect("/administration");
  }

  const tickets = await listSupportTickets({});

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Supporto</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ticket di tutti gli Spazi. Lo Spazio live non viene modificato.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/administration/support/kb">Knowledge base globale</Link>
        </Button>
      </div>
      <SupportTicketsTable
        tickets={tickets}
        showSite
        basePath="/administration/support"
      />
    </div>
  );
}
