import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteContext } from "@/lib/site-context";

const SETTING_KEY = "kanban_card_admin_code";

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

export async function POST(req: NextRequest) {
  try {
    const userContext = await getUserContext();
    if (!userContext?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const inputCode = typeof body?.code === "string" ? body.code.trim() : "";
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

    const siteCode = extractCodeFromSetting(data?.setting_value);
    const fallbackCode = process.env.KANBAN_CARD_ADMIN_CODE?.trim() || "admin";
    const expectedCode = siteCode || fallbackCode;

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

