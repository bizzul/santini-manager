import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { createServiceClient } from "@/utils/supabase/server";
import { getAreeVita } from "@/lib/personal-manager/queries";
import {
  defaultPermissionsMatrix,
  resolveAreaPermissions,
  type AreaPermissions,
  type AreaSlug,
  type AreaVita,
  type PermissionsMatrix,
} from "@/lib/personal-manager/types";

export interface PersonalPageContext {
  userId: string;
  aree: AreaVita[];
  areasVisible: AreaSlug[];
  permissions: PermissionsMatrix;
}

/**
 * Il Manager Personale e' una capability sull'utente, non uno spazio.
 * Il flag NON allarga il perimetro dati: abilita solo le route /personale.
 */
export async function hasPersonalManagerCapability(
  userAuthId: string,
): Promise<boolean> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("User")
    .select("personal_manager_abilitato")
    .eq("authId", userAuthId)
    .maybeSingle();
  if (error) {
    console.error("[personal-manager] capability check error:", error);
    return false;
  }
  return Boolean(data?.personal_manager_abilitato);
}

/**
 * Contesto server per le pagine del Manager Personale. Ridondante con il
 * gate del layout, ma garantisce che ogni pagina verifichi la capability e
 * abbia userId + aree visibili.
 */
export async function requirePersonalContext(): Promise<PersonalPageContext> {
  const userContext = await getUserContext();
  if (!userContext?.userId) {
    redirect("/login");
  }
  const enabled = await hasPersonalManagerCapability(userContext.userId);
  if (!enabled) {
    redirect("/sites/select");
  }

  const aree = await getAreeVita(userContext.userId);
  const areasVisible = aree.map((a) => a.slug);

  return {
    userId: userContext.userId,
    aree,
    areasVisible,
    // Il proprietario ha pieni permessi sulle proprie aree: il vecchio
    // sistema di permessi granulari per-area (pm_access) e' superato.
    permissions: defaultPermissionsMatrix(),
  };
}

export function areaPermissions(
  ctx: PersonalPageContext,
  slug: AreaSlug,
): AreaPermissions {
  return resolveAreaPermissions(
    { areas_visible: ctx.areasVisible, permissions: ctx.permissions },
    slug,
  );
}
