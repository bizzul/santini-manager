import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteContext, hasSiteId } from "@/lib/site-context";
import {
  normalizeCollaboratorRates,
  normalizeHourlyRate,
  normalizeMaterialCost,
} from "@/lib/project-consuntivo";
import { createServiceClient } from "@/utils/supabase/server";
import { projectConsuntivoValidation } from "@/validation/task/consuntivo";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const userContext = await getUserContext();
  if (!userContext?.userId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const siteContext = await getSiteContext(req);
  if (!hasSiteId(siteContext)) {
    return NextResponse.json(
      { error: "Contesto sito non disponibile" },
      { status: 400 },
    );
  }

  const payload = await req.json().catch(() => null);
  const validationResult = projectConsuntivoValidation.safeParse(payload);
  if (!validationResult.success) {
    return NextResponse.json(
      {
        error: "Dati non validi",
        details: validationResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { taskId, manualMaterialCost, defaultHourlyRate, collaboratorRates } =
    validationResult.data;
  const normalizedDefaultHourlyRate = normalizeHourlyRate(defaultHourlyRate);
  const normalizedMaterialCost = normalizeMaterialCost(manualMaterialCost);
  const normalizedCollaboratorRates = normalizeCollaboratorRates(
    collaboratorRates,
    normalizedDefaultHourlyRate,
  );

  const supabase = createServiceClient();
  const { data: task, error: taskError } = await supabase
    .from("Task")
    .select("id, site_id")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError) {
    return NextResponse.json(
      { error: "Errore nel recupero del progetto", details: taskError.message },
      { status: 500 },
    );
  }

  if (!task) {
    return NextResponse.json({ error: "Progetto non trovato" }, { status: 404 });
  }

  if (task.site_id !== siteContext.siteId) {
    return NextResponse.json(
      { error: "Non autorizzato a modificare questo progetto" },
      { status: 403 },
    );
  }

  const { data: updatedTask, error: updateError } = await supabase
    .from("Task")
    .update({
      consuntivo_material_cost: normalizedMaterialCost,
      consuntivo_default_hourly_rate: normalizedDefaultHourlyRate,
      consuntivo_collaborator_rates: normalizedCollaboratorRates,
    })
    .eq("id", taskId)
    .select(
      "id, consuntivo_material_cost, consuntivo_default_hourly_rate, consuntivo_collaborator_rates",
    )
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: "Errore nel salvataggio del consuntivo", details: updateError.message },
      { status: 500 },
    );
  }

  const domain = siteContext.siteData?.subdomain || req.headers.get("x-site-domain");
  if (domain) {
    revalidatePath(`/sites/${domain}/progetti/${taskId}`);
    revalidatePath(`/sites/${domain}/projects/${taskId}/consuntivo`);
    revalidatePath(`/sites/${domain}/projects`);
  }

  return NextResponse.json({
    success: true,
    data: {
      taskId: updatedTask.id,
      manualMaterialCost: normalizeMaterialCost(updatedTask.consuntivo_material_cost),
      defaultHourlyRate: normalizeHourlyRate(
        updatedTask.consuntivo_default_hourly_rate,
      ),
      collaboratorRates: normalizeCollaboratorRates(
        updatedTask.consuntivo_collaborator_rates,
        updatedTask.consuntivo_default_hourly_rate,
      ),
    },
  });
}
