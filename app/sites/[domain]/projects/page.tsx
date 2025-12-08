import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext, fetchProjectsData } from "@/lib/server-data";
import DialogCreate from "./dialogCreate";
import SellProductWrapper from "./sellProductWrapper";

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
    if (!userContext?.user?.id) {
        return redirect("/login");
    }

    // Get site context (required)
    const { siteId } = await requireServerSiteContext(domain);

    // Fetch all project data
    const data = await fetchProjectsData(siteId);

    return (
        <div className="container">
            <DialogCreate data={data} />
            {data.tasks?.length > 0 ? (
                <SellProductWrapper data={data} />
            ) : (
                <div className="w-full h-full text-center">
                    <h1 className="font-bold text-2xl">
                        Nessun progetto registrato!
                    </h1>
                    <p>
                        Premi (Aggiungi progetto) per aggiungere il tuo primo
                        progetto!
                    </p>
                </div>
            )}
        </div>
    );
}
