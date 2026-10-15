import fs from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Dati locali del test ore a due finestre.
 * Il progetto di produzione (ref jzxffusiwtrvjwmpjztu) è rifiutato: qui si
 * scrive solo su Supabase in ascolto su localhost.
 */
const PRODUCTION_REF = "jzxffusiwtrvjwmpjztu";

export const ZZTEST_HOURS_PASSWORD = "zztest-Ore-2026!";
export const ZZTEST_SITE_PREFIX = "zztest-ore";
export const ZZTEST_ACTIVITY_CODE = "zztest_pulizie";
export const ZZTEST_ACTIVITY_LABEL = "ZZTEST Pulizie";
export const ZZTEST_DESCRIPTION_PREFIX = "ZZTEST-ORE-";

export const ZZTEST_WORKERS = {
  alfa: {
    email: "zztest.ore.alfa@example.com",
    givenName: "Alfa",
    familyName: "ZZTEST",
    displayName: "Alfa ZZTEST",
  },
  bravo: {
    email: "zztest.ore.bravo@example.com",
    givenName: "Bravo",
    familyName: "ZZTEST",
    displayName: "Bravo ZZTEST",
  },
} as const;

type WorkerKey = keyof typeof ZZTEST_WORKERS;

function supabaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Manca NEXT_PUBLIC_SUPABASE_URL. Avvia il test con e2e/run-zztest-hours.sh.",
    );
  }
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("URL Supabase non valido.");
  }
  if (url.includes(PRODUCTION_REF) || host.includes(PRODUCTION_REF)) {
    throw new Error("Rifiutato: questo script non scrive sul progetto di produzione.");
  }
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`Rifiutato: Supabase non è locale (${host}).`);
  }
  return url;
}

function serviceClient(): SupabaseClient {
  const key = process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Manca STORAGE_SUPABASE_SERVICE_ROLE_KEY locale.");
  }
  return createClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function fail(scope: string, error: { message: string } | null): void {
  if (error) throw new Error(`${scope}: ${error.message}`);
}

async function findAuthUser(svc: SupabaseClient, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 200 });
    fail("auth.listUsers", error);
    const found = data.users.find((user) => user.email === email);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function removeHoursFixtures(svc: SupabaseClient): Promise<void> {
  const emails = Object.values(ZZTEST_WORKERS).map((worker) => worker.email);
  const { data: users, error: usersError } = await svc
    .from("User")
    .select("id, email, authId")
    .in("email", emails);
  fail("User.select", usersError);

  const employeeIds = (users ?? []).map((user) => user.id as number);
  if (employeeIds.length > 0) {
    const { error } = await svc
      .from("Timetracking")
      .delete()
      .in("employee_id", employeeIds);
    fail("Timetracking.delete by employee", error);
  }

  const { error: byDescription } = await svc
    .from("Timetracking")
    .delete()
    .like("description", `${ZZTEST_DESCRIPTION_PREFIX}%`);
  fail("Timetracking.delete by description", byDescription);

  const authIds = (users ?? [])
    .map((user) => user.authId as string | null)
    .filter((id): id is string => Boolean(id));
  if (authIds.length > 0) {
    const { error } = await svc.from("user_sites").delete().in("user_id", authIds);
    fail("user_sites.delete", error);
  }

  const { error: deleteUsers } = await svc.from("User").delete().in("email", emails);
  fail("User.delete", deleteUsers);

  for (const email of emails) {
    const authUser = await findAuthUser(svc, email);
    if (!authUser) continue;
    const { error } = await svc.auth.admin.deleteUser(authUser.id);
    fail(`auth.deleteUser ${email}`, error);
  }

  const { data: sites, error: siteError } = await svc
    .from("sites")
    .select("id")
    .like("subdomain", `${ZZTEST_SITE_PREFIX}%`);
  fail("sites.select", siteError);

  for (const site of sites ?? []) {
    const { error: activityError } = await svc
      .from("internal_activities")
      .delete()
      .eq("site_id", site.id);
    fail("internal_activities.delete", activityError);

    const { error: siteDeleteError } = await svc.from("sites").delete().eq("id", site.id);
    fail("sites.delete", siteDeleteError);
  }

  const { error: activityByCode } = await svc
    .from("internal_activities")
    .delete()
    .eq("code", ZZTEST_ACTIVITY_CODE);
  fail("internal_activities.delete by code", activityByCode);

  const { data: org, error: orgError } = await svc
    .from("organizations")
    .select("id")
    .eq("name", "ZZTEST Ore")
    .maybeSingle();
  fail("organizations.select", orgError);
  if (!org?.id) return;

  const { count, error: countError } = await svc
    .from("sites")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id);
  fail("sites.count", countError);
  if ((count ?? 0) > 0) return;

  const { error: orgDelete } = await svc.from("organizations").delete().eq("id", org.id);
  fail("organizations.delete", orgDelete);
}

async function createWorker(
  svc: SupabaseClient,
  key: WorkerKey,
  siteId: string,
): Promise<void> {
  const worker = ZZTEST_WORKERS[key];
  const { data: created, error: createError } = await svc.auth.admin.createUser({
    email: worker.email,
    password: ZZTEST_HOURS_PASSWORD,
    email_confirm: true,
    user_metadata: { name: worker.displayName },
  });
  fail(`auth.createUser ${worker.email}`, createError);
  const authId = created.user?.id;
  if (!authId) throw new Error(`Auth user mancante per ${worker.email}`);

  const { error: profileError } = await svc.from("User").insert({
    email: worker.email,
    authId,
    auth_id: authId,
    given_name: worker.givenName,
    family_name: worker.familyName,
    initials: worker.givenName.slice(0, 1) + worker.familyName.slice(0, 1),
    enabled: true,
    role: "user",
    company_role: "Operaio test",
  });
  fail(`User.insert ${worker.email}`, profileError);

  const { error: memberError } = await svc.from("user_sites").insert({
    user_id: authId,
    site_id: siteId,
  });
  fail(`user_sites.insert ${worker.email}`, memberError);
}

const runFile = path.join(__dirname, ".zztest-run.json");

export function readZztestRun(): { subdomain: string } {
  return JSON.parse(fs.readFileSync(runFile, "utf8")) as { subdomain: string };
}

export async function seedZztestHours(): Promise<void> {
  const svc = serviceClient();
  const subdomain = `${ZZTEST_SITE_PREFIX}-${Date.now()}`;
  await removeHoursFixtures(svc);

  const { data: org, error: orgError } = await svc
    .from("organizations")
    .insert({ name: "ZZTEST Ore", code: "ZZTESTORE" })
    .select("id")
    .single();
  fail("organizations.insert", orgError);

  const { data: site, error: siteError } = await svc
    .from("sites")
    .insert({
      name: "ZZTEST Ore",
      subdomain,
      organization_id: org.id,
    })
    .select("id")
    .single();
  fail("sites.insert", siteError);

  const { error: activityError } = await svc.from("internal_activities").insert({
    code: ZZTEST_ACTIVITY_CODE,
    label: ZZTEST_ACTIVITY_LABEL,
    site_id: site.id,
    is_active: true,
    sort_order: 0,
  });
  fail("internal_activities.insert", activityError);

  await createWorker(svc, "alfa", site.id);
  await createWorker(svc, "bravo", site.id);
  fs.writeFileSync(runFile, JSON.stringify({ subdomain }));
  console.log(
    `Seed locale pronto: sito ${subdomain}, utenti ${ZZTEST_WORKERS.alfa.email} e ${ZZTEST_WORKERS.bravo.email}.`,
  );
}

export async function teardownZztestHours(): Promise<void> {
  await removeHoursFixtures(serviceClient());
  fs.rmSync(runFile, { force: true });
  console.log("Seed locale ZZTEST ore rimosso.");
}

export async function hoursOwnerEmail(description: string): Promise<string | null> {
  const svc = serviceClient();
  const { data: row, error } = await svc
    .from("Timetracking")
    .select("id, employee_id, description")
    .eq("description", description)
    .maybeSingle();
  fail("Timetracking.select", error);
  if (!row?.employee_id) return null;

  const { data: user, error: userError } = await svc
    .from("User")
    .select("email")
    .eq("id", row.employee_id)
    .maybeSingle();
  fail("User.select owner", userError);
  return (user?.email as string | undefined) ?? null;
}
