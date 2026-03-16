import { type ClassValue, clsx } from "clsx";
import { formatInTimeZone } from "date-fns-tz";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const APP_TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || "Europe/Zurich";

/**
 * Format a Date as YYYY-MM-DD using local timezone.
 * Avoids the UTC shift caused by Date.toISOString().
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parse a date string (YYYY-MM-DD or ISO format) as a local date.
 * This avoids the UTC midnight interpretation that causes day-before bugs
 * in positive UTC offset timezones (like Europe/Rome CET/CEST).
 *
 * @param dateStr - Date string in YYYY-MM-DD or ISO format
 * @returns Date object in local timezone
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();

  // Extract just the date part (YYYY-MM-DD) from any format
  // This handles: "2024-03-05", "2024-03-05T00:00:00", "2024-03-05T00:00:00.000Z", etc.
  const datePart = dateStr.split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Convert any date input (Date object, string, null) to YYYY-MM-DD string for database storage.
 * This ensures dates are always stored correctly regardless of timezone.
 *
 * @param value - Date object, date string, or null
 * @returns YYYY-MM-DD string or null
 */
export function toDateString(value: Date | string | null | undefined): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return formatInTimeZone(value, APP_TIMEZONE, "yyyy-MM-dd");
  }

  if (typeof value === "string") {
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return formatInTimeZone(parsed, APP_TIMEZONE, "yyyy-MM-dd");
    }
  }

  return null;
}

/**
 * Get start of day in local timezone for a given date.
 * @param date - Date object or date string
 * @returns Date object set to 00:00:00.000 local time
 */
export function startOfLocalDay(date: Date | string): Date {
  const d = typeof date === "string" ? parseLocalDate(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day in local timezone for a given date.
 * @param date - Date object or date string
 * @returns Date object set to 23:59:59.999 local time
 */
export function endOfLocalDay(date: Date | string): Date {
  const d = typeof date === "string" ? parseLocalDate(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Standard fetcher for SWR
export const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Placeholder blurhash for images
export const placeholderBlurhash =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==";

// Random number generator
export const random = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Get the base URL for the application based on the environment
 * Works both client-side and server-side
 */
export function getBaseUrl(): string {
  // Client-side: use window.location.origin
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Server-side: check environment variables
  // Priority: NEXT_PUBLIC_URL > VERCEL_URL > localhost
  if (process.env.NEXT_PUBLIC_URL) {
    return process.env.NEXT_PUBLIC_URL;
  }

  // Vercel automatically sets VERCEL_URL in production
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Default to localhost for development
  return "http://localhost:3000";
}
