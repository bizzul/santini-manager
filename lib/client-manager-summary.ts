import { createServiceClient } from "@/utils/supabase/server";

export type ClientManagerSummaryBucket = {
  count: number;
  totalValue: number;
};

export type ClientManagerSummary = {
  offersSent: ClientManagerSummaryBucket;
  offersWon: ClientManagerSummaryBucket;
  offersLost: ClientManagerSummaryBucket;
  projectsInProgress: ClientManagerSummaryBucket;
  projectsCompleted: ClientManagerSummaryBucket;
};

function normalizeIdentifier(value?: string | null) {
  return (value || "").trim().toUpperCase();
}

function buildEmptyBucket(): ClientManagerSummaryBucket {
  return { count: 0, totalValue: 0 };
}

export function buildEmptyClientManagerSummary(): ClientManagerSummary {
  return {
    offersSent: buildEmptyBucket(),
    offersWon: buildEmptyBucket(),
    offersLost: buildEmptyBucket(),
    projectsInProgress: buildEmptyBucket(),
    projectsCompleted: buildEmptyBucket(),
  };
}

function isOfferTask(task: any) {
  return task.task_type === "OFFERTA" || task.kanban?.is_offer_kanban === true;
}

function isInvoiceTask(task: any) {
  return task.task_type === "FATTURA";
}

function isWonOffer(task: any) {
  return (
    task.display_mode === "small_green" || task.column?.column_type === "won"
  );
}

function isLostOffer(task: any) {
  return (
    task.display_mode === "small_red" || task.column?.column_type === "lost"
  );
}

function isSentOffer(task: any) {
  return Boolean(task.sent_date);
}

function isCompletedProject(task: any) {
  return (
    task.archived === true ||
    normalizeIdentifier(task.column?.identifier) === "SPEDITO"
  );
}

function sumBucket(bucket: ClientManagerSummaryBucket, taskValue: number) {
  bucket.count += 1;
  bucket.totalValue += taskValue;
}

export function accumulateClientManagerSummary(tasks: any[]): ClientManagerSummary {
  return tasks.reduce((accumulator, task: any) => {
    if (task.unique_code === "9999") {
      return accumulator;
    }

    const taskValue = Number(task.sellPrice || 0);

    if (isOfferTask(task)) {
      if (isWonOffer(task)) {
        sumBucket(accumulator.offersWon, taskValue);
      } else if (isLostOffer(task)) {
        sumBucket(accumulator.offersLost, taskValue);
      } else if (isSentOffer(task)) {
        sumBucket(accumulator.offersSent, taskValue);
      }

      return accumulator;
    }

    if (isInvoiceTask(task)) {
      return accumulator;
    }

    if (isCompletedProject(task)) {
      sumBucket(accumulator.projectsCompleted, taskValue);
    } else {
      sumBucket(accumulator.projectsInProgress, taskValue);
    }

    return accumulator;
  }, buildEmptyClientManagerSummary());
}

export async function fetchClientManagerSummary(siteId: string, clientId: number) {
  const supabase = createServiceClient();
  const { data: tasks, error } = await supabase
    .from("Task")
    .select(`
      id,
      archived,
      unique_code,
      parent_task_id,
      source_offer_code,
      task_type,
      display_mode,
      sent_date,
      sellPrice,
      clientId,
      kanban:kanbanId(
        id,
        title,
        identifier,
        is_offer_kanban
      ),
      column:kanbanColumnId(
        id,
        title,
        identifier,
        column_type
      )
    `)
    .eq("site_id", siteId)
    .eq("clientId", clientId);

  if (error) {
    throw error;
  }

  return accumulateClientManagerSummary(tasks || []);
}
