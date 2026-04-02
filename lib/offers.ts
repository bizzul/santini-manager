import {
  OfferContactType,
  OfferFollowUpEntry,
  OfferLossReason,
  OfferProductLine,
  Task,
} from "@/types/supabase";

export const OFFER_SEND_OPTIONS = [1, 2, 3, 7] as const;

export const OFFER_LOSS_REASON_OPTIONS: Array<{
  value: OfferLossReason;
  label: string;
}> = [
  { value: "price", label: "Prezzo" },
  { value: "delivery_time", label: "Tempi di fornitura" },
  { value: "site_on_hold", label: "Cantiere fermo" },
  { value: "other", label: "Altro" },
];

export const OFFER_CONTACT_TYPE_LABELS: Record<OfferContactType, string> = {
  call: "Chiamata",
  email: "Email",
  other: "Altro",
};

export const OFFER_FOLLOW_UP_HIGHLIGHT_DAYS = 14;
const DAY_IN_MS = 1000 * 60 * 60 * 24;

export function addDaysToToday(days: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

export function normalizeOfferProducts(task?: Partial<Task> | null): OfferProductLine[] {
  if (!task) return [];

  const rawProducts =
    task.offer_products ||
    task.offerProducts ||
    null;

  if (Array.isArray(rawProducts) && rawProducts.length > 0) {
    return rawProducts
      .filter(Boolean)
      .slice(0, 5)
      .map((item) => ({
        productId:
          item.productId != null && !Number.isNaN(Number(item.productId))
            ? Number(item.productId)
            : null,
        productName: item.productName || null,
        description: item.description || null,
        quantity:
          item.quantity != null && !Number.isNaN(Number(item.quantity))
            ? Number(item.quantity)
            : null,
        unitPrice:
          item.unitPrice != null && !Number.isNaN(Number(item.unitPrice))
            ? Number(item.unitPrice)
            : null,
        totalPrice:
          item.totalPrice != null && !Number.isNaN(Number(item.totalPrice))
            ? Number(item.totalPrice)
            : null,
      }));
  }

  if (task.sellProductId || task.sell_product_id) {
    return [
      {
        productId: Number(task.sellProductId || task.sell_product_id),
        quantity:
          task.numero_pezzi != null && !Number.isNaN(Number(task.numero_pezzi))
            ? Number(task.numero_pezzi)
            : 1,
        unitPrice: null,
        totalPrice: null,
      },
    ];
  }

  return [];
}

export function normalizeOfferFollowUps(
  task?: Partial<Task> | null,
): OfferFollowUpEntry[] {
  const rawFollowUps = task?.offer_followups || task?.offerFollowups || [];

  if (!Array.isArray(rawFollowUps)) {
    return [];
  }

  return rawFollowUps
    .filter(Boolean)
    .map((entry) => ({
      id: String(entry.id || crypto.randomUUID()),
      contactType: (entry.contactType || "other") as OfferContactType,
      contactDate: entry.contactDate || entry.createdAt || new Date().toISOString(),
      note: entry.note || "",
      createdAt: entry.createdAt || entry.contactDate || new Date().toISOString(),
      createdBy: entry.createdBy || null,
    }))
    .sort(
      (a, b) =>
        new Date(b.contactDate).getTime() - new Date(a.contactDate).getTime(),
    );
}

function getStartOfDayTimestamp(value: Date | string | undefined | null): number | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function getOfferFollowUpHighlightState(
  task?: Partial<Task> | null,
  now: Date = new Date(),
) {
  const followUps = normalizeOfferFollowUps(task);
  const nowTimestamp = getStartOfDayTimestamp(now);

  if (nowTimestamp === null) {
    return {
      hasRecentFollowUp: false,
      daysSinceFollowUp: null,
      daysRemaining: 0,
    };
  }

  for (const followUp of followUps) {
    const contactTimestamp = getStartOfDayTimestamp(followUp.contactDate);
    if (contactTimestamp === null) {
      continue;
    }

    const daysSinceFollowUp = Math.floor((nowTimestamp - contactTimestamp) / DAY_IN_MS);
    if (
      daysSinceFollowUp >= 0 &&
      daysSinceFollowUp < OFFER_FOLLOW_UP_HIGHLIGHT_DAYS
    ) {
      return {
        hasRecentFollowUp: true,
        daysSinceFollowUp,
        daysRemaining:
          OFFER_FOLLOW_UP_HIGHLIGHT_DAYS - daysSinceFollowUp,
      };
    }
  }

  return {
    hasRecentFollowUp: false,
    daysSinceFollowUp: null,
    daysRemaining: 0,
  };
}

export function getOfferTrattativaSortPriority(
  task?: Partial<Task> | null,
  now: Date = new Date(),
) {
  const sentDate = task?.sent_date || task?.sentDate;
  const sentTimestamp = getStartOfDayTimestamp(sentDate);
  const nowTimestamp = getStartOfDayTimestamp(now);
  const { hasRecentFollowUp } = getOfferFollowUpHighlightState(task, now);

  const isOverdue =
    sentTimestamp !== null &&
    nowTimestamp !== null &&
    Math.floor((nowTimestamp - sentTimestamp) / DAY_IN_MS) >= 7;

  if (isOverdue && !hasRecentFollowUp) {
    return 0;
  }

  if (isOverdue && hasRecentFollowUp) {
    return 1;
  }

  return 2;
}

export function sanitizeOfferProducts(
  lines: OfferProductLine[],
): OfferProductLine[] {
  return lines
    .filter((line) => line.productId || line.description || line.productName)
    .slice(0, 5)
    .map((line) => {
      const quantity =
        line.quantity != null && !Number.isNaN(Number(line.quantity))
          ? Number(line.quantity)
          : null;
      const unitPrice =
        line.unitPrice != null && !Number.isNaN(Number(line.unitPrice))
          ? Number(line.unitPrice)
          : null;
      const totalPrice =
        quantity != null && unitPrice != null
          ? Number((quantity * unitPrice).toFixed(2))
          : line.totalPrice != null && !Number.isNaN(Number(line.totalPrice))
            ? Number(line.totalPrice)
            : null;

      return {
        productId:
          line.productId != null && !Number.isNaN(Number(line.productId))
            ? Number(line.productId)
            : null,
        productName: line.productName?.trim() || null,
        description: line.description?.trim() || null,
        quantity,
        unitPrice,
        totalPrice,
      };
    });
}

export function sumOfferPieces(lines: OfferProductLine[]): number | null {
  const total = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
  return total > 0 ? total : null;
}

export function sumOfferProductsTotal(lines: OfferProductLine[]): number {
  return lines.reduce((sum, line) => {
    const lineTotal =
      line.totalPrice != null
        ? Number(line.totalPrice)
        : (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
    return sum + (Number.isNaN(lineTotal) ? 0 : lineTotal);
  }, 0);
}
