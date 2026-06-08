"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { Template } from "@pdfme/common";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCcw } from "lucide-react";
import {
  getEnabledFieldIdsFromTemplate,
  getFieldDefinition,
  getFieldsForVariant,
  sanitizeTemplateWithCatalog,
  syncTemplateWithCatalog,
  validateTemplateFields,
  type LetterheadFieldId,
  type LetterheadLayoutPreset,
  type LetterheadTemplateVariant,
} from "@/lib/documenti/letterhead-field-catalog";
import { mapDocumentoToPdfmeInputs } from "@/lib/documenti/map-documento-to-pdfme-inputs";
import {
  LETTERHEAD_SAMPLE_DOCUMENT,
  LETTERHEAD_SAMPLE_LETTER,
} from "@/lib/documenti/letterhead-sample-document";
import {
  A4_SHEET_MIN_HEIGHT_CSS,
  A4_SHEET_WIDTH_CSS,
} from "@/lib/documenti/page-format";
import { LetterheadFieldStylePanel } from "@/components/document-template/letterhead-field-style-panel";

const LetterheadDesignerCanvas = dynamic(
  () =>
    import("@/components/document-template/letterhead-designer").then(
      (m) => m.LetterheadDesigner,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  },
);

const LetterheadPreviewCanvas = dynamic(
  () =>
    import("@/components/document-template/letterhead-preview-canvas").then(
      (m) => m.LetterheadPreviewCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  },
);

interface LetterheadDesignerGuidedProps {
  template: Template;
  variant: LetterheadTemplateVariant;
  preset: LetterheadLayoutPreset;
  onChange: (template: Template) => void;
  toolbar?: ReactNode;
  emptyPreview?: ReactNode;
}

export function LetterheadDesignerGuided({
  template,
  variant,
  preset,
  onChange,
  toolbar,
  emptyPreview,
}: LetterheadDesignerGuidedProps) {
  const savedPositionsRef = useRef<Record<string, Record<string, unknown>>>({});
  const [selectedFieldId, setSelectedFieldId] =
    useState<LetterheadFieldId | null>(null);
  const [showSamplePreview, setShowSamplePreview] = useState(false);

  const catalogFields = useMemo(
    () => getFieldsForVariant(variant),
    [variant],
  );

  const enabledIds = useMemo(
    () => getEnabledFieldIdsFromTemplate(template, variant),
    [template, variant],
  );

  const validationIssues = useMemo(
    () => validateTemplateFields(template, variant),
    [template, variant],
  );

  const sampleInputs = useMemo(() => {
    const doc =
      variant === "letter"
        ? LETTERHEAD_SAMPLE_LETTER
        : LETTERHEAD_SAMPLE_DOCUMENT;
    return mapDocumentoToPdfmeInputs(doc, {
      numero: "26-OFF-015",
      createdAt: "2026-06-08T00:00:00.000Z",
      pdfmeTemplate: template,
    });
  }, [template, variant]);

  const handleTemplateChange = useCallback(
    (updated: Template) => {
      const sanitized = sanitizeTemplateWithCatalog(updated, variant);
      for (const [key, schema] of Object.entries(sanitized.schemas[0] ?? {})) {
        savedPositionsRef.current[key] = schema as Record<string, unknown>;
      }
      onChange(sanitized);
    },
    [onChange, variant],
  );

  const toggleField = (fieldId: LetterheadFieldId, enabled: boolean) => {
    const current = getEnabledFieldIdsFromTemplate(template, variant);
    const next = enabled
      ? [...current, fieldId]
      : current.filter((id) => id !== fieldId);

    if (!enabled && template.schemas[0]?.[fieldId]) {
      savedPositionsRef.current[fieldId] = template.schemas[0][
        fieldId
      ] as Record<string, unknown>;
    }

    const synced = syncTemplateWithCatalog(
      template,
      variant,
      preset,
      next,
      savedPositionsRef.current,
    );
    onChange(synced);
    if (!enabled && selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const resetAllPositions = () => {
    const synced = syncTemplateWithCatalog(
      template,
      variant,
      preset,
      enabledIds,
      {},
    );
    savedPositionsRef.current = {};
    onChange(synced);
  };

  const updateSelectedFieldStyle = (
    patch: Partial<{ fontSize: number; alignment: "left" | "center" | "right" }>,
  ) => {
    if (!selectedFieldId) return;
    const page = { ...(template.schemas[0] ?? {}) };
    const current = page[selectedFieldId] as Record<string, unknown> | undefined;
    if (!current) return;
    page[selectedFieldId] = { ...current, ...patch } as (typeof page)[string];
    handleTemplateChange({ ...template, schemas: [page] });
  };

  const selectedSchema = selectedFieldId
    ? (template.schemas[0]?.[selectedFieldId] as Record<string, unknown> | undefined)
    : undefined;

  const selectedFieldDef = selectedFieldId
    ? getFieldDefinition(selectedFieldId, variant)
    : undefined;

  const hasTemplate = Boolean(template.basePdf && template.schemas?.length);

  return (
    <div
      className="flex h-full min-h-0 w-full gap-0"
      style={{ minHeight: A4_SHEET_MIN_HEIGHT_CSS }}
    >
      <aside
        className="flex shrink-0 flex-col gap-3 overflow-y-auto border-r border-border pr-3"
        style={{ width: `min(${A4_SHEET_WIDTH_CSS}, 42%)`, minWidth: 240 }}
      >
        {toolbar}

        {hasTemplate ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Campi standard</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 px-2"
                onClick={resetAllPositions}
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Reset
              </Button>
            </div>

            <ul className="space-y-1 rounded-md border border-border p-2">
              {catalogFields.map((field) => {
                const isEnabled = enabledIds.includes(field.id);
                const isSelected = selectedFieldId === field.id;
                return (
                  <li key={field.id}>
                    <button
                      type="button"
                      className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedFieldId(field.id)}
                    >
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) =>
                          toggleField(field.id, checked)
                        }
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Mostra ${field.label}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-tight">
                          {field.label}
                        </span>
                        {field.required ? (
                          <Badge variant="outline" className="mt-0.5 text-[10px]">
                            Obbligatorio
                          </Badge>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {validationIssues.length > 0 ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-100">
                <p className="font-medium">Campi mancanti:</p>
                <ul className="mt-1 list-inside list-disc">
                  {validationIssues.map((issue) => (
                    <li key={issue.fieldId}>{issue.label}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Tutti i campi obbligatori sono posizionati.
              </p>
            )}

            <LetterheadFieldStylePanel
              fieldId={selectedFieldId}
              fieldLabel={selectedFieldDef?.label ?? null}
              fontSize={Number(selectedSchema?.fontSize ?? 10)}
              alignment={
                (selectedSchema?.alignment as "left" | "center" | "right") ??
                "left"
              }
              onFontSizeChange={(fontSize) =>
                updateSelectedFieldStyle({ fontSize })
              }
              onAlignmentChange={(alignment) =>
                updateSelectedFieldStyle({ alignment })
              }
            />
          </>
        ) : null}
      </aside>

      <section
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-white"
        style={{ minWidth: A4_SHEET_WIDTH_CSS, flex: "1 1 210mm" }}
      >
        {hasTemplate ? (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
              <p className="text-sm font-medium">
                {showSamplePreview ? "Anteprima documento" : "Posizionamento campi"}
              </p>
              <div className="flex items-center gap-2">
                <Label htmlFor="sample-preview" className="text-sm">
                  Anteprima esempio
                </Label>
                <Switch
                  id="sample-preview"
                  checked={showSamplePreview}
                  onCheckedChange={setShowSamplePreview}
                />
              </div>
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden">
              {showSamplePreview ? (
                <LetterheadPreviewCanvas
                  template={template}
                  inputs={sampleInputs}
                />
              ) : (
                <LetterheadDesignerCanvas
                  template={template}
                  variant={variant}
                  onChange={handleTemplateChange}
                />
              )}
            </div>
          </>
        ) : (
          emptyPreview ?? (
            <div className="flex h-full min-h-[480px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Carica un PDF o un&apos;immagine per visualizzare l&apos;anteprima.
            </div>
          )
        )}
      </section>
    </div>
  );
}
