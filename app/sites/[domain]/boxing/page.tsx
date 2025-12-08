import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { createClient } from "@/utils/supabase/server";
import SellProductWrapper from "./sellProductWrapper";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getPackingControl(siteId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("PackingControl")
        .select("*")
        .eq("site_id", siteId);

    if (error) {
        return [];
    }

    return data || [];
}

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

    // Fetch data
    const data = await getPackingControl(siteId);

    return (
        <div className="container">
            {data.length > 0 ? (
                <SellProductWrapper data={data} />
            ) : (
                <div className="w-full h-full text-center">
                    <h1 className="font-bold text-2xl">
                        Nessun packing control creato!
                    </h1>
                </div>
            )}
        </div>
    );
}
