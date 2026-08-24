import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { isManagerOfManagersEnabled } from "@/lib/manager-projects/flag";
import { getSupportTicketDetail } from "@/lib/support/queries.server";
import { SupportTicketDetailView } from "@/components/support/SupportTicketDetail";
import { formatTicketNumber } from "@/lib/support/settings";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminSupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userContext = await getUserContext();
  if (!userContext || userContext.role !== "superadmin") {
    redirect("/administration");
  }
  if (!isManagerOfManagersEnabled()) {
    redirect("/administration");
  }

  const { id } = await params;
  const ticket = await getSupportTicketDetail(id);
  if (!ticket) notFound();

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold text-foreground">
        {formatTicketNumber(ticket.publicNumber)}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">{ticket.subject}</p>
      <SupportTicketDetailView
        ticket={ticket}
        domain={ticket.siteSubdomain || ""}
        isAdmin
      />
    </div>
  );
}
