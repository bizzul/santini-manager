"use client";

/**
 * Convenience re-exports for the client translation hooks. The actual
 * implementation lives in the i18n provider so the React context is a
 * single module instance.
 */
export { useT, useLocale, useI18n } from "@/components/i18n/i18n-provider";
