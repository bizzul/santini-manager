import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteContext } from "@/lib/site-context";

const SETTING_KEY = "kanban_card_admin_code";
const NORMALIZE_REGEX = /[^A-Za-z0-9]/g;

function extractCodeFromSetting(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (value && typeof value === "object") {
    const candidate =
      "code" in value && typeof value.code === "string"
        ? value.code
        : "adminCode" in value && typeof value.adminCode === "string"
          ? value.adminCode
          : null;

    if (candidate && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

function normalizeCode(value: string | null | undefined): string {
  return (value || "").replace(NORMALIZE_REGEX, "").trim().toUpperCase();
}

function deriveInitialsFromUser(user: any): string | null {
  const candidates = [
    user?.initials,
    user?.user_metadata?.initials,
  ].filter((value) => typeof value === "string" && value.trim().length > 0);

  if (candidates.length > 0) {
    return normalizeCode(candidates[0]);
  }

  const givenName =
    user?.given_name ||
    user?.user_metadata?.given_name ||
    user?.user_metadata?.first_name ||
    "";
  const familyName =
    user?.family_name ||
    user?.user_metadata?.family_name ||
    user?.user_metadata?.last_name ||
    "";

  const first = String(givenName).trim().charAt(0);
  const last = String(familyName).trim().charAt(0);
  const combined = `${first}${last}`.trim();
  if (combined.length >= 2) {
    return normalizeCode(combined);
  }

  const email = String(user?.email || "").trim();
  if (email.length > 0) {
    const localPart = email.split("@")[0] || "";
    const parts = localPart.split(/[.\-_]/).filter(Boolean);
    const fromEmail =
      parts.length >= 2
        ? `${parts[0].charAt(0)}${parts[1].charAt(0)}`
        : localPart.slice(0, 2);
    return normalizeCode(fromEmail);
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const userContext = await getUserContext();
    if (!userContext?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const inputCode = normalizeCode(
      typeof body?.code === "string" ? body.code : ""
    );
    if (!inputCode) {
      return NextResponse.json(
        { error: "Codice admin richiesto" },
        { status: 400 }
      );
    }

    const { siteId } = await getSiteContext(req);
    if (!siteId) {
      return NextResponse.json(
        { error: "Contesto sito non disponibile" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data } = await supabase
      .from("site_settings")
      .select("setting_value")
      .eq("site_id", siteId)
      .eq("setting_key", SETTING_KEY)
      .single();

    const siteCode = normalizeCode(extractCodeFromSetting(data?.setting_value));
    const envCode = normalizeCode(process.env.KANBAN_CARD_ADMIN_CODE?.trim());
    const userInitials = deriveInitialsFromUser(userContext.user);
    const expectedCode = siteCode || envCode || userInitials || "ADMIN";

    if (inputCode !== expectedCode) {
      return NextResponse.json({ valid: false }, { status: 403 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante la validazione codice admin",
      },
      { status: 500 }
    );
  }
}

