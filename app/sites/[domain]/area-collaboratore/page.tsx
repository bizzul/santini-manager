import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { fetchRoles, requireServerSiteContext } from "@/lib/server-data";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import {
  buildProjectCalendarItems,
  type ProjectCalendarType,
} from "@/components/calendar/calendar-utils";
import type { WeeklyCalendarItem } from "@/components/calendar/weekly-calendar-types";
import { AreaCollaboratorePageClient } from "./area-collaboratore-page-client";

export interface AssignedTaskOption {
  uniqueCode: string;
  label: string;
}

export interface CollaboratorRoleOption {
  id: number;
  name: string;
}

function toIdList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  return [];
}

function assignedIdsForPhase(task: any, phase: ProjectCalendarType): string[] {
  const base = toIdList(task.assigned_collaborator_ids);
  const phaseIds =
    phase === "installation"
      ? toIdList(task.posa_collaborator_ids)
      : phase === "service"
        ? toIdList(task.service_collaborator_ids)
        : toIdList(task.produzione_collaborator_ids);
  return [...base, ...phaseIds];
}

function resolveClientName(task: any): string {
  const client = task.Client || task.client;
  if (!client) return "";
  if (client.businessName) return client.businessName;
  const full = [client.individualFirstName, client.individualLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return full;
}

export default async function Page({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;

  const userContext = await getUserContext();
  if (!userContext?.user) {
    return redirect("/login");
  }

  const { siteId } = await requireServerSiteContext(domain);
  const supabase = await createClient();

  // Risolvi l'utente interno (User.id) a partire dall'authId loggato.
  const { data: profile } = await supabase
    .from("User")
    .select("id, authId, given_name, family_name, initials, picture, color")
    .eq("authId", userContext.user.id)
    .maybeSingle();

  const internalUserId = profile?.id ?? null;

  const currentUserProfile = profile
    ? {
        id: profile.id,
        authId: profile.authId,
        given_name: profile.given_name,
        family_name: profile.family_name,
        initials: profile.initials,
        picture: profile.picture,
      }
    : null;

  let calendarItems: WeeklyCalendarItem[] = [];
  let assignedTasks: AssignedTaskOption[] = [];

  if (internalUserId != null) {
    const { data: tasks } = await supabase
      .from("Task")
      .select(
        "*, SellProduct:sellProductId(id, name, type, category:sellproduct_categories(id, name, color)), Client:clientId(businessName, individualFirstName, individualLastName), column:KanbanColumn!kanbanColumnId(title, identifier)"
      )
      .eq("site_id", siteId)
      .eq("archived", false);

    const taskRows = tasks || [];

    // Mappa Kanban (left join via fetch separato, come nelle pagine calendario).
    const kanbanIds = Array.from(
      new Set(
        taskRows.map((t: any) => t.kanbanId || t.kanban_id).filter(Boolean)
      )
    );
    let kanbansMap: Record<number, any> = {};
    if (kanbanIds.length > 0) {
      const { data: kanbans } = await supabase
        .from("Kanban")
        .select("id, color, title, identifier, is_production_kanban")
        .in("id", kanbanIds);
      kanbansMap = (kanbans || []).reduce((acc: Record<number, any>, k: any) => {
        acc[k.id] = k;
        return acc;
      }, {});
    }

    const targetId = String(internalUserId);
    const phases: ProjectCalendarType[] = [
      "installation",
      "production",
      "service",
    ];

    const merged = new Map<string, WeeklyCalendarItem>();
    const assignedTaskMap = new Map<string, AssignedTaskOption>();

    phases.forEach((phase) => {
      const phaseTasks = taskRows
        .filter((task: any) =>
          assignedIdsForPhase(task, phase).includes(targetId)
        )
        .map((task: any) => {
          const kanbanId = task.kanbanId || task.kanban_id;
          return {
            ...task,
            Kanban: kanbanId ? kanbansMap[kanbanId] || null : null,
            projectCollaborators: currentUserProfile ? [currentUserProfile] : [],
          };
        });

      phaseTasks.forEach((task: any) => {
        const uniqueCode = task.unique_code;
        if (uniqueCode && !assignedTaskMap.has(uniqueCode)) {
          const clientName = resolveClientName(task);
          const label = [uniqueCode, task.title || clientName]
            .filter(Boolean)
            .join(" — ");
          assignedTaskMap.set(uniqueCode, { uniqueCode, label });
        }
      });

      const items = buildProjectCalendarItems(phaseTasks, domain, phase);
      items.forEach((item) => {
        const existing = merged.get(item.id);
        if (
          !existing ||
          (existing.scheduleDisplay !== "timed" &&
            item.scheduleDisplay === "timed")
        ) {
          merged.set(item.id, item);
        }
      });
    });

    calendarItems = Array.from(merged.values());
    assignedTasks = Array.from(assignedTaskMap.values()).sort((a, b) =>
      a.uniqueCode.localeCompare(b.uniqueCode, "it")
    );
  }

  const rolesData = await fetchRoles(siteId);
  const roles: CollaboratorRoleOption[] = (rolesData || []).map((role: any) => ({
    id: role.id,
    name: role.name,
  }));

  const displayName =
    [profile?.given_name, profile?.family_name].filter(Boolean).join(" ") ||
    userContext.user.email ||
    "Collaboratore";

  return (
    <PageLayout>
      <PageHeader
        title="Area Collaboratore"
        subtitle="Il tuo calendario e l'inserimento delle ore lavorate"
      />
      <PageContent className="flex h-full min-h-0 flex-col">
        <AreaCollaboratorePageClient
          domain={domain}
          siteId={siteId}
          displayName={displayName}
          userAuthId={userContext.user.id}
          hasProfile={internalUserId != null}
          calendarItems={calendarItems}
          assignedTasks={assignedTasks}
          roles={roles}
        />
      </PageContent>
    </PageLayout>
  );
}
