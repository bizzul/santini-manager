import React from "react";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { isAdminOrSuperadmin } from "@/lib/permissions";
import { AttendanceGrid } from "@/components/attendance/AttendanceGrid";
import { CalendarCheck } from "lucide-react";

export default async function AttendancePage({
    params,
}: {
    params: Promise<{ domain: string }>;
}) {
    const { domain } = await params;

    const userContext = await getUserContext();
    if (!userContext?.user) {
        return redirect("/login");
    }

    const siteResponse = await getSiteData(domain);
    if (!siteResponse?.data) {
        return redirect("/sites/select?error=site_not_found");
    }

    const isAdmin = isAdminOrSuperadmin(userContext.role);

    return (
        <div className="container py-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                    <CalendarCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Presenze</h1>
                    <p className="text-sm text-muted-foreground">
                        Registro presenze, ferie e assenze
                    </p>
                </div>
            </div>

            <AttendanceGrid domain={domain} isAdmin={isAdmin} />
        </div>
    );
}
