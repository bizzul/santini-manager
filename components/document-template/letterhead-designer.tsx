"use client";

import { useEffect, useRef } from "react";
import type { Template } from "@pdfme/common";
import { getDefaultFont } from "@pdfme/common";
import { Designer } from "@pdfme/ui";
import { PDFME_PLUGINS } from "@/lib/documenti/pdfme-plugins";
import {
  sanitizeTemplateWithCatalog,
  type LetterheadTemplateVariant,
} from "@/lib/documenti/letterhead-field-catalog";

function hideLeftPluginPalette(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("div").forEach((el) => {
    if (el.style.position === "absolute" && parseFloat(el.style.width) === 45) {
      el.style.display = "none";
    }
  });
}

function closeRightSidebarIfOpen(root: HTMLElement): boolean {
  const panels = Array.from(root.querySelectorAll("div")) as HTMLElement[];
  for (const el of panels) {
    const widthPx = parseFloat(el.style.width);
    if (
      el.style.position === "absolute" &&
      el.style.right === "0px" &&
      widthPx >= 350
    ) {
      el.querySelector("button")?.click();
      return true;
    }
  }
  return false;
}

interface LetterheadDesignerProps {
  template: Template;
  onChange: (template: Template) => void;
  variant?: LetterheadTemplateVariant;
  className?: string;
}

export function LetterheadDesigner({
  template,
  onChange,
  variant = "commercial",
  className,
}: LetterheadDesignerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const designerRef = useRef<Designer | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const variantRef = useRef(variant);
  variantRef.current = variant;
  const skipExternalUpdateRef = useRef(false);
  const sidebarClosedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !template.basePdf) return;

    sidebarClosedRef.current = false;
    skipExternalUpdateRef.current = false;

    let designer: Designer;
    try {
      designer = new Designer({
        domContainer: container,
        template,
        plugins: PDFME_PLUGINS,
        options: {
          font: getDefaultFont(),
          lang: "it",
        },
      });
    } catch (error) {
      console.error("LetterheadDesigner init failed:", error);
      return;
    }

    designer.onChangeTemplate((updated) => {
      skipExternalUpdateRef.current = true;
      const sanitized = sanitizeTemplateWithCatalog(
        updated,
        variantRef.current,
      );
      onChangeRef.current(sanitized);
    });

    designerRef.current = designer;

    const syncChrome = () => {
      const root = container.firstElementChild as HTMLElement | null;
      if (!root) return;
      hideLeftPluginPalette(root);
      if (!sidebarClosedRef.current && closeRightSidebarIfOpen(root)) {
        sidebarClosedRef.current = true;
      }
    };

    const chromeTimer = window.setTimeout(syncChrome, 150);

    return () => {
      window.clearTimeout(chromeTimer);
      designer.destroy();
      designerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reinizializza solo al cambio basePdf
  }, [template.basePdf]);

  useEffect(() => {
    if (!designerRef.current) return;
    if (skipExternalUpdateRef.current) {
      skipExternalUpdateRef.current = false;
      return;
    }
    try {
      designerRef.current.updateTemplate(template);
    } catch (error) {
      console.error("LetterheadDesigner updateTemplate failed:", error);
    }
  }, [template]);

  return (
    <div
      ref={containerRef}
      className={`letterhead-pdfme-host absolute inset-0 h-full w-full ${className ?? ""}`}
    />
  );
}
