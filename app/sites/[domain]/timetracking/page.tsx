import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import {
    requireServerSiteContext,
    fetchTimetrackingData,
} from "@/lib/server-data";
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
    if (!userContext?.user) {
        return redirect("/login");
    }

    // Get site context (required)
    const { siteId } = await requireServerSiteContext(domain);

    // Fetch timetracking data
    const data = await fetchTimetrackingData(siteId);

    return (
        <div className="container">
            <DialogCreate
                data={data.tasks}
                users={data.users}
                roles={data.roles}
            />
            {data.timetrackings.length > 0 ? (
                <DataWrapper
                    data={data.timetrackings}
                    users={data.users}
                    roles={data.roles}
                    tasks={data.tasks}
                />
            ) : (
                <div className="w-full h-full text-center">
                    <h1 className="font-bold text-2xl">
                        Nessun rapporto ore registrato!
                    </h1>
                    <p>
                        Premi (Aggiungi rapporto) per aggiungere il tuo primo
                        rapporto!
                    </p>
                </div>
            )}
        </div>
    );
}
