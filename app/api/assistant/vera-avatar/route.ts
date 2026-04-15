import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const AVATAR_FILES = {
  launcher: "image-f83a4c71-9b87-4166-80d4-871db21c58bd.png",
  chat: "image-f83a4c71-9b87-4166-80d4-871db21c58bd.png",
} as const;

function resolveAssetsDir() {
  const home = process.env.HOME || "";
  return path.join(
    home,
    ".cursor/projects/Users-matteopaolocci-santini-manager/assets"
  );
}

export async function GET(request: NextRequest) {
  try {
    const variant = request.nextUrl.searchParams.get("variant") === "chat" ? "chat" : "launcher";
    const assetsDir = resolveAssetsDir();
    const fileName = AVATAR_FILES[variant];
    const filePath = path.join(assetsDir, fileName);
    const fileBuffer = await fs.readFile(filePath);
    const body = new Uint8Array(fileBuffer.byteLength);
    body.set(fileBuffer);

    return new NextResponse(body, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    const fallbackSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#2a3347"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
        </defs>
        <rect width="128" height="128" rx="64" fill="url(#bg)"/>
        <circle cx="64" cy="48" r="22" fill="#f5d0a6"/>
        <rect x="38" y="78" width="52" height="30" rx="15" fill="#7c3aed"/>
        <text x="64" y="120" text-anchor="middle" font-size="12" fill="#ffffff" font-family="Arial, sans-serif">Vera</text>
      </svg>
    `;
    return new NextResponse(fallbackSvg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache",
      },
    });
  }
}
