import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { requireSupportSiteAccess } from "@/lib/support/auth";

export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const domain = String(form.get("domain") || "");
    const conversationId = String(form.get("conversationId") || "");
    const file = form.get("file");

    if (!domain || !conversationId || !(file instanceof File)) {
      return NextResponse.json({ error: "Allegato non valido" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type) || file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Formato o dimensione non ammessi (max 5MB)" },
        { status: 400 },
      );
    }

    const auth = await requireSupportSiteAccess(domain, { requireEnabled: true });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = await createClient();
    const { data: conversation } = await supabase
      .from("support_conversations")
      .select("id, site_id, created_by")
      .eq("id", conversationId)
      .maybeSingle();

    if (
      !conversation ||
      conversation.site_id !== auth.siteId ||
      (conversation.created_by !== auth.userId && !auth.isSiteAdmin)
    ) {
      return NextResponse.json(
        { error: "Conversazione non trovata" },
        { status: 404 },
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
    const path = `${auth.siteId}/${conversationId}/${crypto.randomUUID()}.${safeExt}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("support")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: signed } = await supabase.storage
      .from("support")
      .createSignedUrl(path, 60 * 60);

    return NextResponse.json({
      path,
      mime: file.type,
      size: file.size,
      kind: file.type.startsWith("image/") ? "screenshot" : "file",
      signedUrl: signed?.signedUrl ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload fallito",
      },
      { status: 500 },
    );
  }
}
