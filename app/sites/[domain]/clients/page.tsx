import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext, fetchClients } from "@/lib/server-data";
import DialogCreate from "./dialogCreate";
import DataWrapper from "./dataWrapper";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page({
    params,
}: {
    params: Promise<{ domain: string }>;
}) {
    const { domain } = await params;

    // Authentication
    const userContext = await getUserContext();
    if (!userContext) {
        return redirect("/login");
    }

    // Get site context (required)
    const { siteId } = await requireServerSiteContext(domain);

    // Fetch data
    const clients = await fetchClients(siteId);

    return (
        <div className="min-w-full px-4 h-full">
            <DialogCreate />
            {clients.length > 0 ? (
                <DataWrapper data={clients} />
            ) : (
                <div className="w-full text-center flex flex-col justify-center items-center h-[20rem]">
                    <h1 className="font-bold text-2xl">
                        Nessun cliente registrato
                    </h1>
                    <p>
                        Premi (Aggiungi cliente) per aggiungere il tuo primo
                        cliente!
                    </p>
                </div>
            )}
        </div>
    );
}
