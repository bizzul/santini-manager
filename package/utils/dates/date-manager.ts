import { formatInTimeZone } from "date-fns-tz";

const TZ = process.env.NEXT_PUBLIC_TIMEZONE
  ? process.env.NEXT_PUBLIC_TIMEZONE
  : "Europe/Zurich";

export class DateManager {
  static format = (date: string | Date, format: string) => {
    let d: Date;
    if (typeof date === "string") {
      // Parse date-only strings (YYYY-MM-DD) as local dates to avoid UTC shift
      if (!date.includes("T")) {
        const [year, month, day] = date.split("-").map(Number);
        d = new Date(year, month - 1, day);
      } else {
        d = new Date(date);
      }
    } else {
      d = date;
    }

    return formatInTimeZone(d, TZ, format);
  };

  static formatEUDate(date: string | Date) {
    return this.format(date, "dd.MM.yy");
  }

  static getWeekNumber(dateStr: string | Date) {
    let date: Date;
    if (typeof dateStr === "string") {
      // Parse date-only strings (YYYY-MM-DD) as local dates to avoid UTC shift
      if (!dateStr.includes("T")) {
        const [year, month, day] = dateStr.split("-").map(Number);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(dateStr);
      }
    } else {
      date = new Date(dateStr);
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
