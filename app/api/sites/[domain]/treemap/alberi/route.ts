import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSiteData } from "@/lib/fetchers";
import { getUserContext } from "@/lib/auth-utils";
import { canAccessModule, isAdminOrSuperadmin } from "@/lib/permissions";
import {
  createTreemapAlbero,
  suggestTreemapAlberoCodice,
  type CreateTreemapAlberoInput,
} from "@/lib/treemap-data";

export const dynamic = "force-dynamic";

async function assertTreemapAccess(domain: string) {
  const siteResponse = await getSiteData(domain);
  if (!siteResponse?.data) {
    return { error: NextResponse.json({ error: "Site not found" }, { status: 404 }) };
  }

  const userContext = await getUserContext();
  if (!userContext?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const siteId = siteResponse.data.id;

  if (!isAdminOrSuperadmin(userContext.role)) {
    const allowed = await canAccessModule(
      userContext.userId || userContext.user.id,
      siteId,
      "treemap",
      userContext.role,
    );
    if (!allowed) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
  }

  return { siteId };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  try {
    const { domain } = await params;
    const access = await assertTreemapAccess(domain);
    if ("error" in access && access.error) return access.error;

    const codice = await suggestTreemapAlberoCodice(access.siteId!);
    return NextResponse.json({ codice });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  try {
    const { domain } = await params;
    const access = await assertTreemapAccess(domain);
    if ("error" in access && access.error) return access.error;

    const body = (await request.json()) as CreateTreemapAlberoInput;
    const albero = await createTreemapAlbero(access.siteId!, body);
    revalidatePath(`/sites/${domain}/treemap`);
    return NextResponse.json({ albero }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
