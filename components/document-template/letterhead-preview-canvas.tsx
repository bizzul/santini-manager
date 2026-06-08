"use client";

import { useEffect, useRef } from "react";
import type { Template } from "@pdfme/common";
import { getDefaultFont } from "@pdfme/common";
import { Viewer } from "@pdfme/ui";
import { PDFME_PLUGINS } from "@/lib/documenti/pdfme-plugins";

interface LetterheadPreviewCanvasProps {
  template: Template;
  inputs: Record<string, string>;
}

export function LetterheadPreviewCanvas({
  template,
  inputs,
}: LetterheadPreviewCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const inputArray = [inputs];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const viewer = new Viewer({
      domContainer: container,
      template,
      inputs: inputArray,
      plugins: PDFME_PLUGINS,
      options: {
        font: getDefaultFont(),
        lang: "it",
      },
    });

    viewerRef.current = viewer;

    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.basePdf]);

  useEffect(() => {
    viewerRef.current?.updateTemplate(template);
    viewerRef.current?.setInputs(inputArray);
  }, [template, inputs]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 h-full w-full"
      style={{ minHeight: 480 }}
    />
  );
}
