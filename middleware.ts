import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export const config = {
  matcher: ["/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)"],
};

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

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const supabaseResponse = await updateSession(req);
  const subdomain = extractSubdomain(req);

  if (subdomain) {
    // Block access to admin page from subdomains
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // For the root path on a subdomain, rewrite to the subdomain page
    if (pathname === "/") {
      const fullDomain = `${subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;
      console.log("Rewriting to:", `/sites/${fullDomain}`);
      return NextResponse.rewrite(new URL(`/sites/${fullDomain}`, req.url));
    }
  }

  // Handle app. and admin. subdomains
  let hostname = req.headers
    .get("host")!
    .replace(".localhost:3000", `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`);

  if (hostname.startsWith("app.")) {
    const url = req.nextUrl;
    if (url.pathname.startsWith("/app")) {
      url.pathname = url.pathname.replace("/app", "");
    }
    const res = NextResponse.rewrite(new URL(`/app${url.pathname}`, req.url), {
      request: req,
    });
    const supacookies = supabaseResponse.cookies.getAll();
    supacookies.forEach((c) => res.cookies.set(c));
    return res;
  }

  if (hostname == `admin.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`) {
    const rewriteUrl = new URL(
      `/app/administration${pathname === "/" ? "" : pathname}`,
      req.url,
    );
    const res = NextResponse.rewrite(rewriteUrl);
    const supacookies = supabaseResponse.cookies.getAll();
    supacookies.forEach((c) => res.cookies.set(c));
    return res;
  }

  // On the root domain, allow normal access
  return supabaseResponse;
}
