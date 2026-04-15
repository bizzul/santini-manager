import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { ASSISTANT_REGISTRY } from "@/assistants/hub/AssistantRegistry";
import type { AssistantId } from "@/types/assistants";

const ALLOWED_ASSISTANTS: AssistantId[] = ["vera", "mira", "aura"];

function resolveDefaultPublicAvatar(assistant: AssistantId, variant: "launcher" | "chat") {
  if (assistant === "vera") {
    return path.join(process.cwd(), "public", "assistant", "vera-avatar.png");
  }
  // Per Mira/Aura oggi il default primario e' il sourceAssetPath esterno (se presente).
  // In futuro si puo' popolare publicAssetPath e servire file pubblici.
  const fallbackByAssistant = {
    aura: "aura-avatar.png",
    mira: "mira-avatar.png",
    vera: "vera-avatar.png",
  } as const;
  return path.join(process.cwd(), "public", "assistant", fallbackByAssistant[assistant]);
}

function inferContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/png";
}

function buildFallbackSvg(label: string) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1f2937"/>
          <stop offset="100%" stop-color="#0b1220"/>
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="128" fill="url(#bg)"/>
      <circle cx="128" cy="96" r="42" fill="#f4c59f"/>
      <rect x="76" y="156" width="104" height="56" rx="28" fill="#374151"/>
      <text x="128" y="238" text-anchor="middle" font-size="20" fill="#ffffff" font-family="Arial, sans-serif">${label}</text>
    </svg>
  `;
}

export async function GET(request: NextRequest) {
  try {
    const assistantParam = request.nextUrl.searchParams.get("assistant");
    const variant = request.nextUrl.searchParams.get("variant") === "chat" ? "chat" : "launcher";
    const assistant: AssistantId = ALLOWED_ASSISTANTS.includes(
      assistantParam as AssistantId
    )
      ? (assistantParam as AssistantId)
      : "vera";

    const profile = ASSISTANT_REGISTRY[assistant];
    const candidates = [
      profile.avatarIdentity?.publicAssetPath,
      profile.avatarIdentity?.sourceAssetPath,
      resolveDefaultPublicAvatar(assistant, variant),
    ].filter(Boolean) as string[];

    for (const candidatePath of candidates) {
      try {
        const fileBuffer = await fs.readFile(candidatePath);
        const body = new Uint8Array(fileBuffer.byteLength);
        body.set(fileBuffer);
        return new NextResponse(body, {
          headers: {
            "Content-Type": inferContentType(candidatePath),
            "Cache-Control": "public, max-age=86400",
          },
        });
      } catch {
        // Continua con il prossimo candidate path
      }
    }

    const fallbackSvg = buildFallbackSvg(profile.displayName);
    return new NextResponse(fallbackSvg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    const fallbackSvg = buildFallbackSvg("Assistant");
    return new NextResponse(fallbackSvg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache",
      },
    });
  }
}
