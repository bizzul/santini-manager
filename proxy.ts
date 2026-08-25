import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { isVista, LAST_SPACE_COOKIE, VISTA_COOKIE } from "@/lib/personale/vista";
import {
  isPwaHomeMode,
  oreRedirectPath,
  PWA_HOME_COOKIE,
} from "@/lib/pwa/home-mode";

export const config = {
  matcher: ["/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)"],
};

/** Estrae il subdomain dello spazio da un path /sites/{sub}/... */
function extractSpaceFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/sites\/([^/]+)/);
  if (!match) return null;
  const sub = match[1];
  return sub === "select" ? null : sub;
}

function extractSubdomain(request: NextRequest): string | null {
  const url = request.url;
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0];

  // Local development environment
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    // Try to extract subdomain from the full URL
    const fullUrlMatch = url.match(/http:\/\/([^.]+)\.localhost/);
    if (fullUrlMatch && fullUrlMatch[1]) {
      return fullUrlMatch[1];
    }

    // Fallback to host header approach
    if (hostname.includes(".localhost")) {
      return hostname.split(".")[0];
    }

    return null;
  }

  // Production environment
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost";
  const rootDomainFormatted = rootDomain.split(":")[0];

  // Handle preview deployment URLs (tenant---branch-name.vercel.app)
  if (hostname.includes("---") && hostname.endsWith(".vercel.app")) {
    const parts = hostname.split("---");
    return parts.length > 0 ? parts[0] : null;
  }

  // Regular subdomain detection
  const isSubdomain = hostname !== rootDomainFormatted &&
    hostname !== `www.${rootDomainFormatted}` &&
    hostname.endsWith(`.${rootDomainFormatted}`);

  return isSubdomain ? hostname.replace(`.${rootDomainFormatted}`, "") : null;
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const supabaseResponse = await updateSession(req);
  const subdomain = extractSubdomain(req);

  // `?vista=spazi|personale` bypassa il redirect automatico e viene salvato
  // come preferenza di sessione (l'automatismo non deve essere una gabbia).
  const vistaParam = req.nextUrl.searchParams.get("vista");
  // Ultimo spazio visitato: alimenta la landing "ultimo_spazio" e lo switcher.
  const visitedSpace = subdomain ?? extractSpaceFromPath(pathname);

  // Ensure cookies are always set from Supabase response
  const ensureCookies = (response: NextResponse) => {
    const supacookies = supabaseResponse.cookies.getAll();
    supacookies.forEach((c) => response.cookies.set(c));
    if (vistaParam && isVista(vistaParam)) {
      response.cookies.set(VISTA_COOKIE, vistaParam, {
        path: "/",
        sameSite: "lax",
      });
    }
    if (visitedSpace) {
      response.cookies.set(LAST_SPACE_COOKIE, visitedSpace, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 90, // 90 giorni
      });
    }
    return response;
  };

  const homeModeRaw = req.cookies.get(PWA_HOME_COOKIE)?.value;
  const alreadyRedirecting = [301, 302, 303, 307, 308].includes(
    supabaseResponse.status,
  );
  if (
    !alreadyRedirecting &&
    isPwaHomeMode(homeModeRaw) &&
    homeModeRaw === "ore"
  ) {
    const logicalPath =
      subdomain && !pathname.startsWith("/sites/")
        ? `/sites/${subdomain}${pathname === "/" ? "" : pathname}`
        : pathname;
    const target = oreRedirectPath(logicalPath, visitedSpace ?? undefined);
    if (target && target !== pathname && target !== logicalPath) {
      const url = req.nextUrl.clone();
      url.pathname = target;
      url.search = "";
      return ensureCookies(NextResponse.redirect(url));
    }
  }

  if (subdomain) {
    // Block access to admin page from subdomains
    if (pathname.startsWith("/administration")) {
      const response = NextResponse.redirect(new URL("/", req.url));
      return ensureCookies(response);
    }

    // Non riscrivere se già dentro /sites/
    if (pathname.startsWith("/sites/")) {
      return ensureCookies(supabaseResponse);
    }

    // Rewrite usando solo il subdomain (non il full domain)
    const newPath = `/sites/${subdomain}${pathname}`;
    console.log("Rewriting to:", newPath);
    const response = NextResponse.rewrite(new URL(newPath, req.url));
    return ensureCookies(response);
  }

  // Handle app. and admin. subdomains
  let hostname = req.headers
    .get("host")!
    .replace(".localhost:3000", `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`);

  // if (hostname.startsWith("app.")) {
  //   const url = req.nextUrl;
  //   if (url.pathname.startsWith("/app")) {
  //     url.pathname = url.pathname.replace("/app", "");
  //   }
  //   const res = NextResponse.rewrite(new URL(`/app${url.pathname}`, req.url), {
  //     request: req,
  //   });
  //   return ensureCookies(res);
  // }

  if (hostname == `admin.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`) {
    const rewriteUrl = new URL(
      `/app/administration${pathname === "/" ? "" : pathname}`,
      req.url,
    );
    const res = NextResponse.rewrite(rewriteUrl);
    return ensureCookies(res);
  }

  // On the root domain, allow normal access and ensure cookies are set
  return ensureCookies(supabaseResponse);
}
