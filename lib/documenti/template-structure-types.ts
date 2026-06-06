import { z } from "zod";

export const TemplateFieldTypeEnum = z.enum([
  "text",
  "table",
  "money",
  "date",
]);

export const TemplateSectionIdEnum = z.enum([
  "header",
  "destinatario",
  "oggetto",
  "corpo",
  "tabella_righe",
  "totali",
  "footer",
]);

export const TemplateStructureFieldSchema = z.object({
  placeholderId: z.string(),
  label: z.string(),
  type: TemplateFieldTypeEnum,
  order: z.number(),
  sampleText: z.string().nullable().optional(),
});

export const TemplateStructureSectionSchema = z.object({
  id: TemplateSectionIdEnum,
  label: z.string(),
  order: z.number(),
  fields: z.array(TemplateStructureFieldSchema).default([]),
});

export const TemplateStructureMapSchema = z.object({
  sections: z.array(TemplateStructureSectionSchema),
  notes: z.string().nullable().optional(),
});

export type TemplateStructureMap = z.infer<typeof TemplateStructureMapSchema>;
export type TemplateStructureSection = z.infer<
  typeof TemplateStructureSectionSchema
>;

export const ReferenceDocumentSchema = z.object({
  name: z.string(),
  url: z.string(),
  storagePath: z.string(),
  mimeType: z.string(),
  size: z.number().optional(),
});

export type ReferenceDocument = z.infer<typeof ReferenceDocumentSchema>;
