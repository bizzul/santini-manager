import React from "react";
import { redirect } from "next/navigation";
import { CalendarCheck } from "lucide-react";

import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { getServerT } from "@/lib/i18n/server";
import { isAdminOrSuperadmin } from "@/lib/permissions";
import { AttendanceGrid } from "@/components/attendance/AttendanceGrid";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";

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
    const { t } = await getServerT(siteResponse.data.id);

    return (
        <PageLayout>
            <PageHeader
                title={
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl">
                            <CalendarCheck className="h-6 w-6 text-primary" />
                        </div>
                        <span className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                            {t("attendance.pageTitle")}
                        </span>
                    </div>
                }
                subtitle={t("attendance.pageSubtitle")}
            />
            <PageContent>
                <AttendanceGrid
                    domain={domain}
                    isAdmin={isAdmin}
                    currentUserId={userContext.user.id}
                />
            </PageContent>
        </PageLayout>
    );
}
