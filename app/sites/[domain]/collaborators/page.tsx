import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext, fetchCollaborators } from "@/lib/server-data";
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

    // Fetch collaborators
    const collaborators = await fetchCollaborators(siteId);

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Collaboratori</h1>
                <p className="text-muted-foreground">
                    Gestisci i collaboratori collegati a questo sito
                </p>
            </div>
            {collaborators.length > 0 ? (
                <DataWrapper data={collaborators} domain={domain} />
            ) : (
                <div className="w-full h-[20rem] text-center flex flex-col justify-center items-center">
                    <h2 className="font-bold text-xl">
                        Nessun collaboratore trovato
                    </h2>
                    <p className="text-muted-foreground">
                        Non ci sono collaboratori collegati a questo sito.
                    </p>
                </div>
            )}
        </div>
    );
}

