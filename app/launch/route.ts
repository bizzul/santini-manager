import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import {
  isLandingPreferita,
  type LandingPreferita,
} from "@/lib/personal-manager/types";
import {
  isVista,
  LAST_SPACE_COOKIE,
  VISTA_COOKIE,
} from "@/lib/personale/vista";
import {
  decidePwaLaunch,
  isPwaHomeMode,
  pwaHomeCookieOptions,
  PWA_HOME_COOKIE,
  sanitizeInternalNextPath,
} from "@/lib/pwa/home-mode";

/**
 * Resolver di landing post-login. Regole, in ordine di precedenza:
 *
 * 0. PWA home mode (manager | ore) — scelta dell'app sulla Home
 * 1. landing_preferita = 'personale'     -> /personale/focus (VOICE-FIRST v0.2)
 * 2. landing_preferita = 'ultimo_spazio' -> ultimo spazio (o selettore)
 * 3. landing_preferita = 'auto':
 *    - preferenza di sessione (cookie vista) gia' espressa -> rispettata
 *    - mobile + personal_manager_abilitato -> /personale/focus
 *    - mobile senza flag / desktop        -> ultimo spazio (o selettore)
 *
 * Detection mobile SERVER-SIDE su User-Agent: mai window.innerWidth.
 */

const MOBILE_UA_PATTERN =
  /Mobi|Android(?!.*Tablet)|iPhone|iPod|Windows Phone|BlackBerry|Opera Mini/i;

function isMobileUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return MOBILE_UA_PATTERN.test(userAgent);
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL(`${origin}/login`);
    const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    const safeNext = sanitizeInternalNextPath(returnTo);
    if (safeNext) {
      login.searchParams.set("next", safeNext);
    }
    return NextResponse.redirect(login);
  }

  const cookieStore = await cookies();
  const lastSpace = cookieStore.get(LAST_SPACE_COOKIE)?.value;
  const vistaRaw = cookieStore.get(VISTA_COOKIE)?.value;
  const vista = isVista(vistaRaw) ? vistaRaw : undefined;
  const homeCookie = cookieStore.get(PWA_HOME_COOKIE)?.value;
  const homeParam = request.nextUrl.searchParams.get("home");
  const sourcePwa = request.nextUrl.searchParams.get("source") === "pwa";
  const pwaDecision = decidePwaLaunch({
    homeMode: isPwaHomeMode(homeCookie) ? homeCookie : undefined,
    homeParam,
    sourcePwa,
    lastSpace,
  });

  const persistHomeMode = isPwaHomeMode(homeParam) ? homeParam : undefined;
  const redirectTo = (path: string) => {
    const response = NextResponse.redirect(
      path.startsWith("http") ? path : `${origin}${path}`,
    );
    if (persistHomeMode) {
      response.cookies.set(
        PWA_HOME_COOKIE,
        persistHomeMode,
        pwaHomeCookieOptions(),
      );
    }
    return response;
  };

  if (pwaDecision.type === "chooser") {
    return redirectTo("/pwa/home");
  }
  if (pwaDecision.type === "ore") {
    return redirectTo(pwaDecision.path);
  }

  const spacesTarget = lastSpace
    ? `${origin}/sites/${lastSpace}/dashboard`
    : `${origin}/sites/select`;
  // VOICE-FIRST v0.2: reversibile rimuovendo questo blocco
  // Landing personale → /personale/focus (hub Wheel resta raggiungibile).
  const personalTarget = `${origin}/personale/focus`;

  // Il flag e la preferenza vivono su public."User" (una sola query).
  const service = createServiceClient();
  const { data: profile } = await service
    .from("User")
    .select("personal_manager_abilitato, landing_preferita")
    .eq("authId", user.id)
    .maybeSingle();

  const enabled = Boolean(profile?.personal_manager_abilitato);
  const landing: LandingPreferita =
    profile?.landing_preferita && isLandingPreferita(profile.landing_preferita)
      ? profile.landing_preferita
      : "auto";

  // 1-2. Preferenza esplicita dell'utente: vale sempre, mobile o desktop.
  if (landing === "personale" && enabled) {
    return redirectTo(personalTarget);
  }
  if (landing === "ultimo_spazio") {
    return redirectTo(spacesTarget);
  }

  // 3. Auto: la scelta di sessione gia' espressa vince sull'automatismo.
  if (vista === "personale" && enabled) {
    return redirectTo(personalTarget);
  }
  if (vista === "spazi") {
    return redirectTo(spacesTarget);
  }

  const mobile = isMobileUserAgent(request.headers.get("user-agent"));
  if (mobile && enabled) {
    return redirectTo(personalTarget);
  }
  return redirectTo(spacesTarget);
}
