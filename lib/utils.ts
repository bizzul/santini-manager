import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

  // Handle ISO datetime strings (e.g., "2024-03-05T10:30:00.000Z")
  if (dateStr.includes("T")) {
    return new Date(dateStr);
  }

  // Parse date-only strings (e.g., "2024-03-05") as local date
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
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
