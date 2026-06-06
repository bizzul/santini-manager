import { formatInTimeZone } from "date-fns-tz";

const TZ = process.env.NEXT_PUBLIC_TIMEZONE
  ? process.env.NEXT_PUBLIC_TIMEZONE
  : "Europe/Zurich";

export class DateManager {
  /**
   * Parse the supported date inputs into a Date object.
   * Returns an (invalid) Date that callers must validate; never throws.
   */
  private static toDate(date: string | Date | null | undefined): Date {
    if (date instanceof Date) {
      return date;
    }
    if (typeof date === "string") {
      // Parse date-only strings (YYYY-MM-DD) as local dates to avoid UTC shift
      if (!date.includes("T")) {
        const [year, month, day] = date.split("-").map(Number);
        return new Date(year, month - 1, day);
      }
      return new Date(date);
    }
    // null/undefined/other -> invalid date
    return new Date(NaN);
  }

  private static isValid(d: Date): boolean {
    return d instanceof Date && !Number.isNaN(d.getTime());
  }

  static format = (
    date: string | Date | null | undefined,
    format: string,
  ) => {
    const d = DateManager.toDate(date);
    // Guard against invalid dates: a single malformed value must not crash the
    // whole render tree (e.g. one bad card breaking an entire Kanban board).
    if (!DateManager.isValid(d)) {
      return "";
    }
    return formatInTimeZone(d, TZ, format);
  };

  static formatEUDate(date: string | Date | null | undefined) {
    return this.format(date, "dd.MM.yy");
  }

  static getWeekNumber(dateStr: string | Date | null | undefined): number | "" {
    const date = DateManager.toDate(dateStr);
    if (!DateManager.isValid(date)) {
      return "";
    }
    const oneJan = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - oneJan.getTime();
    const week = Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
    return week;
  }

  static formatTime(date: string, precision?: string) {
    const precisionStr = this.getTimePrecision(precision ? precision : null);
    return this.format(date, `${precisionStr}`);
  }

  static formatEUDateTime(date: string, precision?: string) {
    const precisionStr = this.getTimePrecision(precision ? precision : null);
    return this.format(date, `dd.MM.yyyy ${precisionStr}`);
  }

  static getTimePrecision(precision: string | null) {
    let precisionStr = "HH:mm";
    switch (precision) {
      case "hours":
        precisionStr = "HH";
        break;
      case "minutes":
        precisionStr = "HH:mm";
        break;
      case "seconds":
        precisionStr = "HH:mm:ss";
    }
    return precisionStr;
  }
}
