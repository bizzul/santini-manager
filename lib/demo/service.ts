import crypto from "crypto";
import path from "path";
import { readFile } from "fs/promises";
import { addDays, format, subDays } from "date-fns";
import { getBaseUrl } from "@/lib/utils";
import { AVAILABLE_MODULES } from "@/lib/module-config";
import { createServiceClient } from "@/utils/supabase/server";
import { getDemoTemplateByKey } from "@/lib/demo/templates";
import { getDemoLandingAvailability } from "@/lib/demo/list-utils";
import { resolveSiteVerticalProfile } from "@/lib/site-verticals";
import type {
    DemoAccessEvent,
    DemoAccessEventType,
    DemoAccessToken,
    DemoSeedConfig,
    DemoWorkspace,
    DemoTokenPolicy,
} from "@/types/supabase";

type SupabaseClient = ReturnType<typeof createServiceClient>;

export interface DemoRequestContext {
    ipAddress?: string | null;
    userAgent?: string | null;
    referrer?: string | null;
    country?: string | null;
    city?: string | null;
    landingPath?: string | null;
    redirectPath?: string | null;
}

export interface CreateDemoWorkspaceInput {
    demoName: string;
    customerName: string;
    customerCompany?: string;
    customerContactName?: string;
    customerContactEmail?: string;
    customerLogoUrl?: string;
    heroImageUrl?: string;
    primaryColor?: string;
    templateKey: string;
    sectorKey: string;
    scenarioType: string;
    enabledModules: string[];
    recommendedModules: string[];
    painPoints: string[];
    desiredOutcomes: string[];
    currentProcessIssues?: string;
    salesNotes?: string;
    landingTitle?: string;
    landingSubtitle?: string;
    introNarrative?: string;
    ctaLabel?: string;
    dataIntensity: "low" | "medium" | "high";
    expiresInDays: number;
    tokenPolicy: DemoTokenPolicy;
    notes?: string;
}

export interface DemoWorkspaceListItem {
    workspace: DemoWorkspace;
    site: {
        id: string;
        name: string;
        subdomain: string;
        logo?: string | null;
    } | null;
    activeToken: DemoAccessToken | null;
    activeUrl: string | null;
}

export interface DemoWorkspaceDetails {
    workspace: DemoWorkspace;
    site: {
        id: string;
        name: string;
        subdomain: string;
        logo?: string | null;
        image?: string | null;
    } | null;
    tokens: DemoAccessToken[];
    events: DemoAccessEvent[];
    activeToken: DemoAccessToken | null;
    activeUrl: string | null;
}

interface DemoTokenWithWorkspace extends DemoAccessToken {
    workspace: DemoWorkspace;
}

interface CreatedPublicToken {
    token: DemoAccessToken;
    rawToken: string;
    publicUrl: string;
}

const DEFAULT_EXPIRES_IN_DAYS = 14;

function getDemoTokenSecret() {
    return process.env.DEMO_TOKEN_SECRET ||
        process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY ||
        "cursor-demo-secret";
}

function createHash(value: string) {
    return crypto.createHash("sha256").update(value).digest("hex");
}

function slugifySegment(value: string) {
    return value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 42) || "demo";
}

function buildDemoEmail(subdomain: string, suffix = "owner") {
    return `demo+${slugifySegment(subdomain)}-${suffix}@example.com`;
}

function buildDemoIdentifier(base: string, scope: string) {
    return `${slugifySegment(base)}-${slugifySegment(scope).slice(0, 12)}`;
}

interface DemoCatalogRow {
    COD_INT: string;
    CATEGORIA: string;
    NOME_PRODOTTO: string;
    SOTTOCATEGORIA: string;
    DESCRIZIONE: string;
    LISTINO_PREZZI: string;
    URL_IMMAGINE: string;
    URL_DOC: string;
}

interface DemoCatalogData {
    categories: Array<{
        name: string;
        description: string;
        color: string;
    }>;
    products: Array<{
        internal_code: string;
        name: string;
        type: string;
        description: string;
        price_list: boolean;
        image_url?: string;
        doc_url?: string;
        categoryName: string;
    }>;
}

function parseCsvLine(line: string) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const nextChar = line[index + 1];

        if (char === "\"") {
            if (inQuotes && nextChar === "\"") {
                current += "\"";
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === "," && !inQuotes) {
            values.push(current);
            current = "";
            continue;
        }

        current += char;
    }

    values.push(current);
    return values.map((value) => value.trim());
}

async function loadDemoArredoCatalog(): Promise<DemoCatalogData> {
    const filePath = path.join(
        process.cwd(),
        "data",
        "dadesign-products-import.csv",
    );
    const csvContent = await readFile(filePath, "utf8");
    const lines = csvContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length < 2) {
        throw new Error("Demo catalog CSV is empty");
    }

    const headers = parseCsvLine(lines[0]);
    const palette = [
        "#2563EB",
        "#14B8A6",
        "#F97316",
        "#7C3AED",
        "#DC2626",
        "#0891B2",
        "#65A30D",
        "#D97706",
    ];

    const rows: DemoCatalogRow[] = lines.slice(1).map((line) => {
        const values = parseCsvLine(line);
        return headers.reduce((accumulator, header, index) => {
            accumulator[header as keyof DemoCatalogRow] = values[index] || "";
            return accumulator;
        }, {} as DemoCatalogRow);
    }).filter((row) => row.NOME_PRODOTTO && row.CATEGORIA);

    const categoryNames = Array.from(new Set(rows.map((row) => row.CATEGORIA)));
    const categories = categoryNames.map((name, index) => {
        const categoryRows = rows.filter((row) => row.CATEGORIA === name);
        const sampleSubcategories = Array.from(
            new Set(categoryRows.map((row) => row.SOTTOCATEGORIA).filter(Boolean)),
        ).slice(0, 3);

        return {
            name,
            description: sampleSubcategories.length > 0
                ? `Catalogo ${name} con sottocategorie ${sampleSubcategories.join(", ")}`
                : `Catalogo ${name} della demo arredamento`,
            color: palette[index % palette.length],
        };
    });

    const products = rows.map((row) => ({
        internal_code: row.COD_INT,
        name: row.NOME_PRODOTTO,
        type: row.SOTTOCATEGORIA || row.CATEGORIA,
        description: row.DESCRIZIONE,
        price_list: row.LISTINO_PREZZI.toUpperCase() === "SI",
        image_url: row.URL_IMMAGINE || undefined,
        doc_url: row.URL_DOC || undefined,
        categoryName: row.CATEGORIA,
    }));

    return { categories, products };
}

async function loadDemoCatalog(templateKey: string): Promise<DemoCatalogData> {
    const fileName = templateKey === "full_suite_speedywood"
        ? "speedywood-products-import.csv"
        : "dadesign-products-import.csv";
    const defaultDescription = templateKey === "full_suite_speedywood"
        ? "Catalogo demo Speedywood"
        : "Catalogo demo arredamento";
    const filePath = path.join(process.cwd(), "data", fileName);
    const csvContent = await readFile(filePath, "utf8");
    const lines = csvContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length < 2) {
        throw new Error("Demo catalog CSV is empty");
    }

    const headers = parseCsvLine(lines[0]);
    const palette = [
        "#7C5A34",
        "#A16207",
        "#15803D",
        "#1D4ED8",
        "#6D4C41",
        "#0F766E",
        "#B45309",
        "#4D7C0F",
    ];

    const rows: DemoCatalogRow[] = lines.slice(1).map((line) => {
        const values = parseCsvLine(line);
        return headers.reduce((accumulator, header, index) => {
            accumulator[header as keyof DemoCatalogRow] = values[index] || "";
            return accumulator;
        }, {} as DemoCatalogRow);
    }).filter((row) => row.NOME_PRODOTTO && row.CATEGORIA);

    const categoryNames = Array.from(new Set(rows.map((row) => row.CATEGORIA)));
    const categories = categoryNames.map((name, index) => {
        const categoryRows = rows.filter((row) => row.CATEGORIA === name);
        const sampleSubcategories = Array.from(
            new Set(categoryRows.map((row) => row.SOTTOCATEGORIA).filter(Boolean)),
        ).slice(0, 3);

        return {
            name,
            description: sampleSubcategories.length > 0
                ? `${defaultDescription}: ${name} con ${sampleSubcategories.join(", ")}`
                : `${defaultDescription}: ${name}`,
            color: palette[index % palette.length],
        };
    });

    const products = rows.map((row) => ({
        internal_code: row.COD_INT,
        name: row.NOME_PRODOTTO,
        type: row.SOTTOCATEGORIA || row.CATEGORIA,
        description: row.DESCRIZIONE,
        price_list: row.LISTINO_PREZZI.toUpperCase() === "SI",
        image_url: row.URL_IMMAGINE || undefined,
        doc_url: row.URL_DOC || undefined,
        categoryName: row.CATEGORIA,
    }));

    return { categories, products };
}

function buildInitials(name: string) {
    const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "DM";
}

function normalizeArray(values: string[]) {
    return values.map((value) => value.trim()).filter(Boolean);
}

function parseRawToken(rawToken: string) {
    const [tokenId] = rawToken.split(".");
    return tokenId;
}

export function buildRawDemoToken(tokenId: string) {
    const signature = crypto
        .createHmac("sha256", getDemoTokenSecret())
        .update(tokenId)
        .digest("base64url")
        .slice(0, 32);

    return `${tokenId}.${signature}`;
}

export function buildDemoPublicUrl(rawToken: string) {
    return `${getBaseUrl()}/demo/${rawToken}`;
}

export function buildDemoPublicUrlFromTokenId(tokenId: string) {
    return buildDemoPublicUrl(buildRawDemoToken(tokenId));
}

function isTokenExpired(date?: string | null) {
    return !!date && new Date(date).getTime() < Date.now();
}

async function ensureUniqueSubdomain(
    supabase: Awaited<SupabaseClient>,
    requestedValue: string,
) {
    const base = slugifySegment(requestedValue);
    let candidate = base;
    let counter = 1;

    while (true) {
        const { data, error } = await supabase
            .from("sites")
            .select("id")
            .eq("subdomain", candidate)
            .maybeSingle();

        if (error && error.code !== "PGRST116") {
            throw new Error(error.message);
        }

        if (!data) {
            return candidate;
        }

        counter += 1;
        candidate = `${base}-${counter}`;
    }
}

async function ensureUniqueOrganizationName(
    supabase: Awaited<SupabaseClient>,
    requestedValue: string,
) {
    const base = requestedValue.trim() || "Demo Organization";
    let candidate = base;
    let counter = 1;

    while (true) {
        const { data, error } = await supabase
            .from("organizations")
            .select("id")
            .eq("name", candidate)
            .maybeSingle();

        if (error && error.code !== "PGRST116") {
            throw new Error(error.message);
        }

        if (!data) {
            return candidate;
        }

        counter += 1;
        candidate = `${base} ${counter}`;
    }
}

async function upsertSiteModules(
    supabase: Awaited<SupabaseClient>,
    siteId: string,
    enabledModules: string[],
) {
    const enabledSet = new Set(enabledModules);
    const moduleRows = AVAILABLE_MODULES.map((module) => ({
        site_id: siteId,
        module_name: module.name,
        is_enabled: enabledSet.has(module.name),
    }));

    const { error } = await supabase
        .from("site_modules")
        .upsert(moduleRows, { onConflict: "site_id,module_name" });

    if (error) {
        throw new Error(error.message);
    }
}

async function ensureRoles(
    supabase: Awaited<SupabaseClient>,
    roleNames: string[],
) {
    const uniqueRoleNames = Array.from(new Set(roleNames));

    const { error: upsertError } = await supabase
        .from("Roles")
        .upsert(
            uniqueRoleNames.map((name) => ({ name })),
            { onConflict: "name", ignoreDuplicates: true },
        );

    if (upsertError) {
        throw new Error(upsertError.message);
    }

    const { data: roles, error: selectError } = await supabase
        .from("Roles")
        .select("id, name")
        .in("name", uniqueRoleNames)
        .order("id", { ascending: true });

    if (selectError || !roles || roles.length === 0) {
        throw new Error(selectError?.message || "Unable to load roles");
    }

    return roles;
}

async function ensureUserProfile(
    supabase: Awaited<SupabaseClient>,
    input: {
        authId: string;
        email: string;
        givenName: string;
        familyName: string;
        role: "admin" | "user";
        picture?: string;
        color?: string;
    },
) {
    const basePayload = {
        authId: input.authId,
        email: input.email,
        given_name: input.givenName,
        family_name: input.familyName,
        initials: buildInitials(`${input.givenName} ${input.familyName}`),
        picture: input.picture ?? null,
        color: input.color ?? null,
        enabled: true,
        role: input.role,
    };

    const { data, error } = await supabase
        .from("User")
        .insert(basePayload)
        .select("id, authId, email, given_name, family_name")
        .single();

    if (error) {
        throw new Error(error.message);
    }

    try {
        await supabase
            .from("User")
            .update({ auth_id: input.authId })
            .eq("id", data.id);
    } catch {
        // Some environments still only expose authId, keep the seed resilient.
    }

    return data;
}

async function createAuthUser(
    supabase: Awaited<SupabaseClient>,
    input: {
        email: string;
        givenName: string;
        familyName: string;
        role: "admin" | "user";
        picture?: string;
    },
) {
    const { data, error } = await supabase.auth.admin.createUser({
        email: input.email,
        email_confirm: true,
        user_metadata: {
            name: `${input.givenName} ${input.familyName}`.trim(),
            given_name: input.givenName,
            family_name: input.familyName,
            role: input.role,
        },
    });

    if (error || !data.user) {
        throw new Error(error?.message || "Unable to create demo auth user");
    }

    return data.user;
}

async function linkUserToWorkspace(
    supabase: Awaited<SupabaseClient>,
    input: {
        authUserId: string;
        organizationId: string;
        siteId: string;
    },
) {
    const { error: orgError } = await supabase.from("user_organizations").upsert({
        user_id: input.authUserId,
        organization_id: input.organizationId,
    }, {
        onConflict: "user_id,organization_id",
    });

    if (orgError) {
        throw new Error(orgError.message);
    }

    const { error: siteError } = await supabase.from("user_sites").upsert({
        user_id: input.authUserId,
        site_id: input.siteId,
    }, {
        onConflict: "user_id,site_id",
    });

    if (siteError) {
        throw new Error(siteError.message);
    }
}

async function createPublicToken(
    supabase: Awaited<SupabaseClient>,
    input: {
        workspaceId: string;
        createdBy: string;
        tokenPolicy: DemoTokenPolicy;
        label?: string;
        redirectPath?: string;
        expiresAt?: string;
        maxUses?: number;
    },
) {
    const tokenId = crypto.randomUUID();
    const rawToken = buildRawDemoToken(tokenId);
    const tokenHash = createHash(rawToken);

    const { data, error } = await supabase
        .from("demo_access_tokens")
        .insert({
            id: tokenId,
            workspace_id: input.workspaceId,
            label: input.label ?? "QR principale",
            redirect_path: input.redirectPath ?? "/dashboard",
            use_policy: input.tokenPolicy,
            expires_at: input.expiresAt ?? null,
            created_by: input.createdBy,
            max_uses: input.maxUses ?? null,
            token_hash: tokenHash,
        })
        .select("*")
        .single();

    if (error || !data) {
        throw new Error(error?.message || "Unable to create demo access token");
    }

    return {
        token: data as DemoAccessToken,
        rawToken,
        publicUrl: buildDemoPublicUrl(rawToken),
    } satisfies CreatedPublicToken;
}

async function revokeActiveTokens(
    supabase: Awaited<SupabaseClient>,
    workspaceId: string,
) {
    const { error } = await supabase
        .from("demo_access_tokens")
        .update({ revoked_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId)
        .is("revoked_at", null);

    if (error) {
        throw new Error(error.message);
    }
}

function buildSeedConfig(
    input: CreateDemoWorkspaceInput,
    generatedUsers: DemoSeedConfig["generatedUsers"],
): DemoSeedConfig {
    return {
        templateKey: input.templateKey,
        sectorKey: input.sectorKey,
        scenarioType: input.scenarioType,
        enabledModules: input.enabledModules,
        dataIntensity: input.dataIntensity,
        desiredOutcomes: input.desiredOutcomes,
        currentProcessIssues: input.currentProcessIssues,
        generatedUsers,
    };
}

async function seedDemoWorkspaceData(
    supabase: Awaited<SupabaseClient>,
    input: {
        siteId: string;
        organizationId: string;
        workspaceId: string;
        customerName: string;
        customerCompany?: string;
        customerLogoUrl?: string;
        ownerProfileId: number;
        ownerAuthId: string;
        templateKey: string;
        primaryColor?: string;
    } & Pick<CreateDemoWorkspaceInput, "enabledModules" | "dataIntensity">,
) {
    await upsertSiteModules(supabase, input.siteId, input.enabledModules);

    const currentYear = new Date().getFullYear();
    const isSpeedywood = input.templateKey === "full_suite_speedywood";
    const verticalProfile = resolveSiteVerticalProfile(
        isSpeedywood ? "speedywood" : "default",
    );

    await supabase.from("site_settings").upsert([
        {
            site_id: input.siteId,
            setting_key: "demo_mode",
            setting_value: { enabled: true, workspaceId: input.workspaceId },
        },
        {
            site_id: input.siteId,
            setting_key: "company_name",
            setting_value: input.customerCompany || input.customerName,
        },
        {
            site_id: input.siteId,
            setting_key: "company_logo",
            setting_value: input.customerLogoUrl || null,
        },
        {
            site_id: input.siteId,
            setting_key: "vertical_profile",
            setting_value: { key: verticalProfile.key },
        },
        {
            site_id: input.siteId,
            setting_key: "brand_primary_color",
            setting_value: input.primaryColor || null,
        },
    ], {
        onConflict: "site_id,setting_key",
    });

    await supabase.from("code_sequences").upsert([
        {
            site_id: input.siteId,
            sequence_type: "task",
            year: currentYear,
            current_value: 24,
        },
        {
            site_id: input.siteId,
            sequence_type: "offer",
            year: currentYear,
            current_value: 8,
        },
    ], {
        onConflict: "site_id,sequence_type,year",
    });

    const clientSeedRows = isSpeedywood
        ? [
            {
                site_id: input.siteId,
                clientType: "BUSINESS",
                businessName: "Falegnameria Bernasconi SA",
                code: "CLI-001",
                city: "Lugano",
                address: "Via Industria 14",
                zipCode: 6900,
                countryCode: "CH",
                email: "acquisti@bernasconiwood.ch",
                mobilePhone: "+41 91 555 11 01",
            },
            {
                site_id: input.siteId,
                clientType: "BUSINESS",
                businessName: "Interior Build Zurich AG",
                code: "CLI-002",
                city: "Zurich",
                address: "Holzstrasse 8",
                zipCode: 8004,
                countryCode: "CH",
                email: "orders@interiorbuild.ch",
                mobilePhone: "+41 44 555 22 02",
            },
            {
                site_id: input.siteId,
                clientType: "BUSINESS",
                businessName: "Montage Fenetre Romandie SA",
                code: "CLI-003",
                city: "Lausanne",
                address: "Route du Bois 31",
                zipCode: 1003,
                countryCode: "CH",
                email: "planning@fenetreromandie.ch",
                mobilePhone: "+41 21 555 33 03",
            },
            {
                site_id: input.siteId,
                clientType: "INDIVIDUAL",
                individualFirstName: "Marco",
                individualLastName: "Rossi",
                code: "CLI-004",
                city: "Bellinzona",
                address: "Via al Fiume 6",
                zipCode: 6500,
                countryCode: "CH",
                email: "marco.rossi@example.com",
                mobilePhone: "+41 79 555 44 04",
            },
        ]
        : [
            {
                site_id: input.siteId,
                clientType: "BUSINESS",
                businessName: "Atelier Rossi Contract",
                code: "CLI-001",
                city: "Milano",
                address: "Via Mecenate 85",
                zipCode: 20138,
                countryCode: "IT",
                email: "commerciale@atelierrossi.it",
                mobilePhone: "+39 02 5555 1001",
            },
            {
                site_id: input.siteId,
                clientType: "BUSINESS",
                businessName: "Studio Habitat One",
                code: "CLI-002",
                city: "Bologna",
                address: "Via Indipendenza 41",
                zipCode: 40121,
                countryCode: "IT",
                email: "ordini@habitathone.it",
                mobilePhone: "+39 051 440010",
            },
            {
                site_id: input.siteId,
                clientType: "BUSINESS",
                businessName: "Boutique Hotel Lido Blu",
                code: "CLI-003",
                city: "Rimini",
                address: "Viale Vespucci 63",
                zipCode: 47921,
                countryCode: "IT",
                email: "direzione@lidoblu.it",
                mobilePhone: "+39 0541 900100",
            },
        ];

    const { data: clients, error: clientError } = await supabase.from("Client")
        .insert(clientSeedRows)
        .select("id, businessName")
        .order("id", { ascending: true });

    if (clientError || !clients) {
        throw new Error(clientError?.message || "Unable to seed demo clients");
    }

    const supplierCategoryRows = isSpeedywood
        ? [
            {
                site_id: input.siteId,
                name: "Legno massello e lamellare",
                code: "WOOD",
                description: "Segherie e fornitori per massello, lamellare e profili",
            },
            {
                site_id: input.siteId,
                name: "Pannelli tecnici",
                code: "PANEL",
                description: "Fornitori di MDF, truciolare, multistrato e pannelli tecnici",
            },
        ]
        : [
            {
                site_id: input.siteId,
                name: "Pannelli e semilavorati",
                code: "PANEL",
                description: "Fornitori per pannelli nobilitati, MDF e laminati",
            },
            {
                site_id: input.siteId,
                name: "Ferramenta",
                code: "HARD",
                description: "Fornitori di ferramenta e accessori per assemblaggio",
            },
        ];

    const { data: supplierCategories, error: supplierCategoryError } = await supabase
        .from("Supplier_category")
        .insert(supplierCategoryRows)
        .select("id, name")
        .order("id", { ascending: true });

    if (supplierCategoryError || !supplierCategories) {
        throw new Error(
            supplierCategoryError?.message ||
                "Unable to seed supplier categories",
        );
    }

    const manufacturerCategoryRows = isSpeedywood
        ? [
            {
                site_id: input.siteId,
                name: "Lavorazioni speciali",
                code: "SPEC",
                description: "Partner per sagomatura, piallatura e lavorazioni custom",
            },
            {
                site_id: input.siteId,
                name: "Finiture e trattamenti",
                code: "FIN",
                description: "Partner per impregnanti, vernici e trattamenti superficiali",
            },
        ]
        : [
            {
                site_id: input.siteId,
                name: "Artigiani partner",
                code: "ART",
                description: "Produzioni speciali e conto lavoro",
            },
            {
                site_id: input.siteId,
                name: "Finiture",
                code: "FIN",
                description: "Lavorazioni su verniciatura e finiture custom",
            },
        ];

    const { data: manufacturerCategories, error: manufacturerCategoryError } = await supabase
        .from("Manufacturer_category")
        .insert(manufacturerCategoryRows)
        .select("id, name")
        .order("id", { ascending: true });

    if (manufacturerCategoryError || !manufacturerCategories) {
        throw new Error(
            manufacturerCategoryError?.message ||
                "Unable to seed manufacturer categories",
        );
    }

    const supplierRows = isSpeedywood
        ? [
            {
                site_id: input.siteId,
                name: "Swiss Timber Hub",
                short_name: "Swiss Timber",
                description: "Segheria partner per abete, larice, rovere e listelli",
                location: "St. Gallen",
                email: "sales@swisstimberhub.ch",
                phone: "+41 71 555 60 10",
                supplier_category_id: supplierCategories[0]?.id,
            },
            {
                site_id: input.siteId,
                name: "Panel Trade Suisse",
                short_name: "Panel Trade",
                description: "Distribuzione pannelli MDF, truciolare e multistrato",
                location: "Lucerne",
                email: "orders@paneltrade.ch",
                phone: "+41 41 555 60 20",
                supplier_category_id: supplierCategories[1]?.id,
            },
        ]
        : [
            {
                site_id: input.siteId,
                name: "Pannelli Nord",
                short_name: "Pannelli Nord",
                description: "Distribuzione pannelli e laminati",
                location: "Brescia",
                email: "sales@pannellinord.it",
                phone: "+39 030 998877",
                supplier_category_id: supplierCategories[0]?.id,
            },
            {
                site_id: input.siteId,
                name: "Ferramenta Pro",
                short_name: "Ferr. Pro",
                description: "Cerniere, guide e accessori tecnici",
                location: "Vicenza",
                email: "acquisti@ferramentapro.it",
                phone: "+39 0444 778899",
                supplier_category_id: supplierCategories[1]?.id,
            },
        ];

    const { data: suppliers, error: supplierError } = await supabase
        .from("Supplier")
        .insert(supplierRows)
        .select("id, name")
        .order("id", { ascending: true });

    if (supplierError || !suppliers) {
        throw new Error(supplierError?.message || "Unable to seed suppliers");
    }

    const manufacturerRows = isSpeedywood
        ? [
            {
                site_id: input.siteId,
                name: "Douglas Custom Mill",
                short_name: "Douglas Mill",
                description: "Partner per profilatura e sagomatura su specifica",
                location: "Aarau",
                email: "planning@douglasmill.ch",
                manufacturer_category_id: manufacturerCategories[0]?.id,
            },
            {
                site_id: input.siteId,
                name: "Wood Finish Partner",
                short_name: "Wood Finish",
                description: "Trattamenti protettivi e finiture per prodotti in legno",
                location: "Bern",
                email: "operations@woodfinish.ch",
                manufacturer_category_id: manufacturerCategories[1]?.id,
            },
        ]
        : [
            {
                site_id: input.siteId,
                name: "Finiture Sartoriali",
                short_name: "Finiture",
                description: "Partner per verniciatura e finiture premium",
                location: "Treviso",
                email: "operations@finituresartoriali.it",
                manufacturer_category_id: manufacturerCategories[1]?.id,
            },
            {
                site_id: input.siteId,
                name: "Lab Legno Uno",
                short_name: "Lab Legno",
                description: "Conto lavoro per lavorazioni speciali",
                location: "Pesaro",
                email: "planning@lablegnouno.it",
                manufacturer_category_id: manufacturerCategories[0]?.id,
            },
        ];

    const { data: manufacturers, error: manufacturerError } = await supabase
        .from("Manufacturer")
        .insert(manufacturerRows)
        .select("id, name")
        .order("id", { ascending: true });

    if (manufacturerError || !manufacturers) {
        throw new Error(
            manufacturerError?.message || "Unable to seed manufacturers",
        );
    }

    const demoCatalog = await loadDemoCatalog(input.templateKey);

    const { data: productCategories, error: productCategoryError } = await supabase
        .from("sellproduct_categories")
        .insert(
            demoCatalog.categories.map((category) => ({
                site_id: input.siteId,
                name: category.name,
                description: category.description,
                color: category.color,
            })),
        )
        .select("id, name")
        .order("id", { ascending: true });

    if (productCategoryError || !productCategories) {
        throw new Error(
            productCategoryError?.message || "Unable to seed product categories",
        );
    }

    const categoryIdByName = new Map(
        productCategories.map((category) => [category.name, category.id]),
    );

    const { data: sellProducts, error: sellProductError } = await supabase
        .from("SellProduct")
        .insert(
            demoCatalog.products
                .filter((product) => categoryIdByName.has(product.categoryName))
                .map((product) => ({
                    site_id: input.siteId,
                    name: product.name,
                    type: product.type,
                    description: product.description,
                    price_list: product.price_list,
                    image_url: product.image_url || null,
                    doc_url: product.doc_url || null,
                    active: true,
                    category_id: categoryIdByName.get(product.categoryName),
                    internal_code: product.internal_code,
                })),
        )
        .select("id, name, type, category_id, internal_code")
        .order("id", { ascending: true });

    if (sellProductError || !sellProducts) {
        throw new Error(
            sellProductError?.message || "Unable to seed sell products",
        );
    }

    const roles = await ensureRoles(supabase, isSpeedywood
        ? [
            "Commerciale",
            "Acquisti",
            "Magazzino",
            "Logistica",
        ]
        : [
            "Commerciale",
            "Produzione",
            "Montaggio",
            "Magazzino",
        ]);

    const staffDefinitions = isSpeedywood
        ? [
            {
                givenName: "Giulia",
                familyName: "Keller",
                role: "user" as const,
                color: "#8B5E3C",
            },
            {
                givenName: "Marco",
                familyName: "Frei",
                role: "user" as const,
                color: "#A16207",
            },
            {
                givenName: "Sara",
                familyName: "Meyer",
                role: "user" as const,
                color: "#15803D",
            },
            {
                givenName: "Luca",
                familyName: "Bernasconi",
                role: "user" as const,
                color: "#1D4ED8",
            },
        ]
        : [
            {
                givenName: "Giulia",
                familyName: "Bassi",
                role: "user" as const,
                color: "#2563EB",
            },
            {
                givenName: "Marco",
                familyName: "Rinaldi",
                role: "user" as const,
                color: "#14B8A6",
            },
            {
                givenName: "Sara",
                familyName: "Leoni",
                role: "user" as const,
                color: "#F97316",
            },
            {
                givenName: "Luca",
                familyName: "Neri",
                role: "user" as const,
                color: "#7C3AED",
            },
        ];

    const generatedUsers: DemoSeedConfig["generatedUsers"] = [];
    const seededProfiles: Array<{
        authId: string;
        profileId: number;
        roleId: number;
    }> = [];

    for (let index = 0; index < staffDefinitions.length; index += 1) {
        const definition = staffDefinitions[index];
        const authUser = await createAuthUser(supabase, {
            email: buildDemoEmail(input.siteId, `staff-${index + 1}`),
            givenName: definition.givenName,
            familyName: definition.familyName,
            role: definition.role,
        });

        await linkUserToWorkspace(supabase, {
            authUserId: authUser.id,
            organizationId: input.organizationId,
            siteId: input.siteId,
        });

        const profile = await ensureUserProfile(supabase, {
            authId: authUser.id,
            email: authUser.email || buildDemoEmail(input.siteId, `staff-${index + 1}`),
            givenName: definition.givenName,
            familyName: definition.familyName,
            role: definition.role,
            color: definition.color,
        });

        generatedUsers.push({
            authId: authUser.id,
            email: profile.email,
            given_name: definition.givenName,
            family_name: definition.familyName,
            color: definition.color,
        });

        seededProfiles.push({
            authId: authUser.id,
            profileId: profile.id,
            roleId: roles[(index + 1) % roles.length]?.id ?? roles[0].id,
        });
    }

    await supabase.from("_RolesToUser").insert([
        {
            A: roles[0]?.id,
            B: input.ownerProfileId,
        },
        ...seededProfiles.map((profile) => ({
            A: profile.roleId,
            B: profile.profileId,
        })),
    ]);

    const { data: kanbans, error: kanbanError } = await supabase.from("Kanban")
        .insert([
            {
                title: isSpeedywood ? "Richieste Offerta" : "Offerte",
                identifier: buildDemoIdentifier("offerte", input.siteId),
                color: isSpeedywood ? "#8B5E3C" : "#2563EB",
                icon: "faHandshake",
                site_id: input.siteId,
                is_offer_kanban: true,
                show_category_colors: true,
            },
            {
                title: isSpeedywood ? "Ordini" : "Produzione",
                identifier: buildDemoIdentifier(
                    isSpeedywood ? "ordini" : "produzione",
                    input.siteId,
                ),
                color: isSpeedywood ? "#15803D" : "#14B8A6",
                icon: isSpeedywood ? "faTruckField" : "faIndustry",
                site_id: input.siteId,
                is_work_kanban: true,
            },
        ])
        .select("id, title, identifier")
        .order("id", { ascending: true });

    if (kanbanError || !kanbans) {
        throw new Error(kanbanError?.message || "Unable to seed kanbans");
    }

    const offerKanbanId = kanbans[0].id;
    const workKanbanId = kanbans[1].id;

    await supabase
        .from("Kanban")
        .update({ target_work_kanban_id: workKanbanId })
        .eq("id", offerKanbanId);

    const { data: columns, error: columnsError } = await supabase
        .from("KanbanColumn")
        .insert(isSpeedywood
            ? [
                {
                    title: "Nuova richiesta",
                    identifier: buildDemoIdentifier("nuova-richiesta", input.siteId),
                    position: 1,
                    kanbanId: offerKanbanId,
                    column_type: "normal",
                    is_creation_column: true,
                },
                {
                    title: "Preventivo inviato",
                    identifier: buildDemoIdentifier("preventivo-inviato", input.siteId),
                    position: 2,
                    kanbanId: offerKanbanId,
                    column_type: "normal",
                },
                {
                    title: "In trattativa",
                    identifier: buildDemoIdentifier("in-trattativa", input.siteId),
                    position: 3,
                    kanbanId: offerKanbanId,
                    column_type: "normal",
                },
                {
                    title: "Confermata",
                    identifier: buildDemoIdentifier("confermata", input.siteId),
                    position: 4,
                    kanbanId: offerKanbanId,
                    column_type: "won",
                },
                {
                    title: "In preparazione",
                    identifier: buildDemoIdentifier("in-preparazione", input.siteId),
                    position: 1,
                    kanbanId: workKanbanId,
                    column_type: "production",
                },
                {
                    title: "Materiale allocato",
                    identifier: buildDemoIdentifier("materiale-allocato", input.siteId),
                    position: 2,
                    kanbanId: workKanbanId,
                    column_type: "production",
                },
                {
                    title: "Pronto spedizione",
                    identifier: buildDemoIdentifier("pronto-spedizione", input.siteId),
                    position: 3,
                    kanbanId: workKanbanId,
                    column_type: "production",
                },
                {
                    title: "Consegnato",
                    identifier: buildDemoIdentifier("consegnato", input.siteId),
                    position: 4,
                    kanbanId: workKanbanId,
                    column_type: "won",
                },
            ]
            : [
                {
                    title: "Nuova richiesta",
                    identifier: buildDemoIdentifier("nuova-richiesta", input.siteId),
                    position: 1,
                    kanbanId: offerKanbanId,
                    column_type: "normal",
                    is_creation_column: true,
                },
                {
                    title: "Offerta inviata",
                    identifier: buildDemoIdentifier("offerta-inviata", input.siteId),
                    position: 2,
                    kanbanId: offerKanbanId,
                    column_type: "normal",
                },
                {
                    title: "Trattativa",
                    identifier: buildDemoIdentifier("trattativa", input.siteId),
                    position: 3,
                    kanbanId: offerKanbanId,
                    column_type: "normal",
                },
                {
                    title: "Vinta",
                    identifier: buildDemoIdentifier("vinta", input.siteId),
                    position: 4,
                    kanbanId: offerKanbanId,
                    column_type: "won",
                },
                {
                    title: "Pianificazione",
                    identifier: buildDemoIdentifier("pianificazione", input.siteId),
                    position: 1,
                    kanbanId: workKanbanId,
                    column_type: "production",
                },
                {
                    title: "In produzione",
                    identifier: buildDemoIdentifier("in-produzione", input.siteId),
                    position: 2,
                    kanbanId: workKanbanId,
                    column_type: "production",
                },
                {
                    title: "Montaggio",
                    identifier: buildDemoIdentifier("montaggio", input.siteId),
                    position: 3,
                    kanbanId: workKanbanId,
                    column_type: "production",
                },
                {
                    title: "Consegnato",
                    identifier: buildDemoIdentifier("consegnato", input.siteId),
                    position: 4,
                    kanbanId: workKanbanId,
                    column_type: "won",
                },
            ])
        .select("id, title, kanbanId")
        .order("id", { ascending: true });

    if (columnsError || !columns) {
        throw new Error(columnsError?.message || "Unable to seed kanban columns");
    }

    const byTitle = (title: string) => columns.find((column) => column.title === title);

    const taskRows = isSpeedywood
        ? [
            {
                site_id: input.siteId,
                title: "Profili lamellari per serramenti",
                name: "Profili lamellari per serramenti",
                unique_code: "OFF-2026-001",
                status: "open",
                clientId: clients[0]?.id,
                sellProductId: sellProducts[0]?.id,
                kanbanId: offerKanbanId,
                kanbanColumnId: byTitle("In trattativa")?.id,
                column_id: byTitle("In trattativa")?.id,
                column_position: 1,
                deliveryDate: addDays(new Date(), 12).toISOString(),
                sellPrice: 14600,
                percentStatus: 40,
                positions: ["Larice lamellare", "Profili finestra", "Taglio su misura"],
                task_type: "OFFERTA",
                offer_send_date: subDays(new Date(), 2).toISOString(),
                material: true,
                ferramenta: false,
                metalli: false,
                legno: true,
            },
            {
                site_id: input.siteId,
                title: "Pannelli MDF e multistrato per arredo retail",
                name: "Pannelli MDF e multistrato per arredo retail",
                unique_code: "OFF-2026-002",
                status: "sent",
                clientId: clients[1]?.id,
                sellProductId: sellProducts[1]?.id,
                kanbanId: offerKanbanId,
                kanbanColumnId: byTitle("Preventivo inviato")?.id,
                column_id: byTitle("Preventivo inviato")?.id,
                column_position: 2,
                deliveryDate: addDays(new Date(), 9).toISOString(),
                sellPrice: 22400,
                percentStatus: 55,
                positions: ["MDF grezzo", "Multistrato betulla", "Pannelli su misura"],
                task_type: "OFFERTA",
                offer_send_date: subDays(new Date(), 1).toISOString(),
                material: true,
                ferramenta: false,
                metalli: false,
                legno: true,
            },
            {
                site_id: input.siteId,
                title: "Ordine tavole piallate per cantiere chalet",
                name: "Ordine tavole piallate per cantiere chalet",
                unique_code: "COM-2026-003",
                status: "production",
                clientId: clients[2]?.id,
                sellProductId: sellProducts[2]?.id,
                kanbanId: workKanbanId,
                kanbanColumnId: byTitle("Materiale allocato")?.id,
                column_id: byTitle("Materiale allocato")?.id,
                column_position: 1,
                deliveryDate: addDays(new Date(), 6).toISOString(),
                sellPrice: 19800,
                percentStatus: 72,
                positions: ["Abete piallato", "Listelli supporto", "Preparazione pallet"],
                task_type: "LAVORO",
                material: true,
                ferramenta: false,
                metalli: false,
                legno: true,
            },
            {
                site_id: input.siteId,
                title: "Ordine porte interne in rovere",
                name: "Ordine porte interne in rovere",
                unique_code: "COM-2026-004",
                status: "planning",
                clientId: clients[3]?.id || clients[0]?.id,
                sellProductId: sellProducts[3]?.id,
                kanbanId: workKanbanId,
                kanbanColumnId: byTitle("In preparazione")?.id,
                column_id: byTitle("In preparazione")?.id,
                column_position: 2,
                deliveryDate: addDays(new Date(), 15).toISOString(),
                sellPrice: 9200,
                percentStatus: 20,
                positions: ["Rovere", "Elementi porta", "Finitura trasparente"],
                task_type: "LAVORO",
                material: true,
                ferramenta: true,
                metalli: false,
                legno: true,
            },
        ]
        : [
            {
                site_id: input.siteId,
                title: "Reception showroom Milano",
                name: "Reception showroom Milano",
                unique_code: "OFF-2026-001",
                status: "open",
                clientId: clients[0]?.id,
                sellProductId: sellProducts[0]?.id,
                kanbanId: offerKanbanId,
                kanbanColumnId: byTitle("Trattativa")?.id,
                column_id: byTitle("Trattativa")?.id,
                column_position: 1,
                deliveryDate: addDays(new Date(), 21).toISOString(),
                sellPrice: 18500,
                percentStatus: 35,
                positions: ["Bancone", "Retro banco", "Led integrati"],
                task_type: "offer",
                offer_send_date: subDays(new Date(), 2).toISOString(),
                material: false,
                ferramenta: false,
                metalli: false,
            },
            {
                site_id: input.siteId,
                title: "Camere executive hotel",
                name: "Camere executive hotel",
                unique_code: "OFF-2026-002",
                status: "sent",
                clientId: clients[2]?.id,
                sellProductId: sellProducts[1]?.id,
                kanbanId: offerKanbanId,
                kanbanColumnId: byTitle("Offerta inviata")?.id,
                column_id: byTitle("Offerta inviata")?.id,
                column_position: 2,
                deliveryDate: addDays(new Date(), 35).toISOString(),
                sellPrice: 29400,
                percentStatus: 55,
                positions: ["12 minibar", "12 scrivanie", "12 pannelli TV"],
                task_type: "offer",
                offer_send_date: subDays(new Date(), 1).toISOString(),
                material: false,
                ferramenta: false,
                metalli: false,
            },
            {
                site_id: input.siteId,
                title: "Corner retail flagship",
                name: "Corner retail flagship",
                unique_code: "COM-2026-003",
                status: "production",
                clientId: clients[1]?.id,
                sellProductId: sellProducts[3]?.id,
                kanbanId: workKanbanId,
                kanbanColumnId: byTitle("In produzione")?.id,
                column_id: byTitle("In produzione")?.id,
                column_position: 1,
                deliveryDate: addDays(new Date(), 14).toISOString(),
                sellPrice: 21800,
                percentStatus: 72,
                positions: ["Parete dogata", "Banco cassa", "Espositori"],
                task_type: "work",
                material: true,
                ferramenta: true,
                metalli: false,
            },
            {
                site_id: input.siteId,
                title: "Testate imbottite hotel",
                name: "Testate imbottite hotel",
                unique_code: "COM-2026-004",
                status: "planning",
                clientId: clients[2]?.id,
                sellProductId: sellProducts[2]?.id,
                kanbanId: workKanbanId,
                kanbanColumnId: byTitle("Pianificazione")?.id,
                column_id: byTitle("Pianificazione")?.id,
                column_position: 2,
                deliveryDate: addDays(new Date(), 18).toISOString(),
                sellPrice: 9800,
                percentStatus: 20,
                positions: ["20 camere", "Tessuto ignifugo"],
                task_type: "work",
                material: true,
                ferramenta: false,
                metalli: false,
            },
        ];

    const { data: tasks, error: taskError } = await supabase.from("Task").insert(taskRows)
        .select("id, title, unique_code, kanbanId, kanbanColumnId");

    if (taskError || !tasks) {
        throw new Error(taskError?.message || "Unable to seed tasks");
    }

    await supabase.from("TaskHistory").insert(
        tasks.slice(0, 2).map((task) => ({
            taskId: task.id,
            snapshot: {
                title: task.title,
                unique_code: task.unique_code,
                updated_for_demo: true,
            },
        })),
    );

    await supabase.from("TaskSupplier").insert([
        {
            taskId: tasks[2]?.id,
            supplierId: suppliers[0]?.id,
            deliveryDate: addDays(new Date(), 4).toISOString(),
        },
        {
            taskId: tasks[3]?.id,
            supplierId: suppliers[1]?.id,
            deliveryDate: addDays(new Date(), 6).toISOString(),
        },
    ]);

    const today = new Date();
    const timetrackingRows = seededProfiles.flatMap((profile, index) => {
        const relatedTask = tasks[index % tasks.length];
        const day = subDays(today, index + 1);
        return [
            {
                site_id: input.siteId,
                task_id: relatedTask?.id,
                employee_id: profile.profileId,
                hours: 4,
                minutes: 30,
                totalTime: 4.5,
                description: isSpeedywood
                    ? `Preparazione ordine ${relatedTask?.title}`
                    : `Avanzamento lavorazione ${relatedTask?.title}`,
                activity_type: "project",
                startTime: new Date(day.setHours(8, 0, 0, 0)).toISOString(),
                endTime: new Date(day.setHours(12, 30, 0, 0)).toISOString(),
                use_cnc: false,
                created_at: new Date(day).toISOString(),
            },
            {
                site_id: input.siteId,
                employee_id: profile.profileId,
                hours: 1,
                minutes: 0,
                totalTime: 1,
                description: isSpeedywood
                    ? "Allineamento commerciale e disponibilita materiali"
                    : "Riunione avanzamento commessa",
                activity_type: "internal",
                internal_activity: "riunione",
                startTime: new Date(day.setHours(14, 0, 0, 0)).toISOString(),
                endTime: new Date(day.setHours(15, 0, 0, 0)).toISOString(),
                use_cnc: false,
                created_at: new Date(day).toISOString(),
            },
        ];
    });

    const { data: timetrackingRowsInserted, error: timetrackingError } = await supabase
        .from("Timetracking")
        .insert(timetrackingRows)
        .select("id");

    if (timetrackingError) {
        throw new Error(
            timetrackingError.message || "Unable to seed timetracking data",
        );
    }

    const timetrackingRoleLinks = (timetrackingRowsInserted || []).map((entry, index) => ({
        A: roles[(index + 1) % roles.length]?.id ?? roles[0].id,
        B: entry.id,
    }));

    if (timetrackingRoleLinks.length > 0) {
        await supabase.from("_RolesToTimetracking").insert(timetrackingRoleLinks);
    }

    const attendanceRows = seededProfiles.flatMap((profile, index) => {
        const statuses = ["presente", "presente", "presente", "smart_working", "presente"];
        return statuses.map((status, statusIndex) => ({
            site_id: input.siteId,
            user_id: profile.authId,
            date: format(subDays(today, statusIndex + index), "yyyy-MM-dd"),
            status,
            created_by: input.ownerAuthId,
            notes: status === "smart_working"
                ? (isSpeedywood ? "Aggiornamento listini da remoto" : "Lavoro da casa")
                : null,
        }));
    });

    await supabase.from("attendance_entries").upsert(attendanceRows, {
        onConflict: "site_id,user_id,date",
    });

    await supabase.from("leave_requests").insert([
        {
            site_id: input.siteId,
            user_id: seededProfiles[0]?.authId,
            leave_type: "vacanze",
            start_date: format(addDays(today, 9), "yyyy-MM-dd"),
            end_date: format(addDays(today, 11), "yyyy-MM-dd"),
            status: "approved",
            reviewed_by: input.ownerAuthId,
            reviewed_at: new Date().toISOString(),
            notes: isSpeedywood ? "Assenza pianificata demo" : "Ferie pianificate demo",
        },
    ]);

    const inventoryCategoryRows = isSpeedywood
        ? [
            {
                site_id: input.siteId,
                name: "Legno massello e lamellare",
                code: "WOOD",
                description: "Abete, larice, rovere e lavorati per serramenti e falegnameria",
            },
            {
                site_id: input.siteId,
                name: "Pannelli tecnici",
                code: "PANEL",
                description: "MDF, truciolare, multistrato e pannelli tecnici",
            },
        ]
        : [
            {
                site_id: input.siteId,
                name: "Pannelli",
                code: "PAN",
                description: "Pannelli e semilavorati",
            },
            {
                site_id: input.siteId,
                name: "Ferramenta",
                code: "FER",
                description: "Accessori tecnici e ferramenta",
            },
        ];

    const { data: inventoryCategories, error: inventoryCategoryError } = await supabase
        .from("inventory_categories")
        .insert(inventoryCategoryRows)
        .select("id, name")
        .order("created_at", { ascending: true });

    if (inventoryCategoryError || !inventoryCategories) {
        throw new Error(
            inventoryCategoryError?.message ||
                "Unable to seed inventory categories",
        );
    }

    const inventorySupplierRows = isSpeedywood
        ? [
            {
                site_id: input.siteId,
                name: "Swiss Timber Hub Stock",
                code: "INV-WOOD",
                notes: "Disponibilita massello e lamellare sincronizzata con acquisti",
            },
            {
                site_id: input.siteId,
                name: "Panel Trade Suisse Stock",
                code: "INV-PANEL",
                notes: "Disponibilita pannelli tecnici e materiali compositi",
            },
        ]
        : [
            {
                site_id: input.siteId,
                name: "Magazzino Pannelli Nord",
                code: "INV-PAN",
                notes: "Fornitore demo sincronizzato con acquisti",
            },
            {
                site_id: input.siteId,
                name: "Magazzino Ferramenta Pro",
                code: "INV-FER",
                notes: "Fornitore demo ferramenta",
            },
        ];

    const { data: inventorySuppliers, error: inventorySupplierError } = await supabase
        .from("inventory_suppliers")
        .insert(inventorySupplierRows)
        .select("id, name")
        .order("created_at", { ascending: true });

    if (inventorySupplierError || !inventorySuppliers) {
        throw new Error(
            inventorySupplierError?.message ||
                "Unable to seed inventory suppliers",
        );
    }

    const warehouseRows = isSpeedywood
        ? [
            {
                site_id: input.siteId,
                name: "Magazzino centrale",
                code: "WH-CEN",
                description: "Deposito principale per tavole, pannelli e semilavorati",
            },
            {
                site_id: input.siteId,
                name: "Area spedizioni",
                code: "WH-SHP",
                description: "Materiali pronti per evasione ordine e consegna",
            },
        ]
        : [
            {
                site_id: input.siteId,
                name: "Magazzino centrale",
                code: "WH-CEN",
                description: "Magazzino principale",
            },
            {
                site_id: input.siteId,
                name: "Area montaggio",
                code: "WH-MON",
                description: "Materiali pronti per installazione",
            },
        ];

    const { data: warehouses, error: warehouseError } = await supabase
        .from("inventory_warehouses")
        .insert(warehouseRows)
        .select("id, name")
        .order("created_at", { ascending: true });

    if (warehouseError || !warehouses) {
        throw new Error(warehouseError?.message || "Unable to seed warehouses");
    }

    const inventoryItemRows = isSpeedywood
        ? [
            {
                site_id: input.siteId,
                name: "Tavola abete piallata 27mm",
                description: "Tavole piallate per strutture leggere e falegnameria",
                item_type: "wood",
                category_id: inventoryCategories[0]?.id,
                supplier_id: inventorySuppliers[0]?.id,
            },
            {
                site_id: input.siteId,
                name: "Pannello MDF grezzo 19mm",
                description: "Pannello MDF per taglio e lavorazioni su misura",
                item_type: "panel",
                category_id: inventoryCategories[1]?.id,
                supplier_id: inventorySuppliers[1]?.id,
            },
        ]
        : [
            {
                site_id: input.siteId,
                name: "Pannello rovere naturale 19mm",
                description: "Pannello nobilitato per reception e camere",
                item_type: "panel",
                category_id: inventoryCategories[0]?.id,
                supplier_id: inventorySuppliers[0]?.id,
            },
            {
                site_id: input.siteId,
                name: "Guida cassetto soft-close",
                description: "Ferramenta cassetti e mobili tecnici",
                item_type: "hardware",
                category_id: inventoryCategories[1]?.id,
                supplier_id: inventorySuppliers[1]?.id,
            },
        ];

    const { data: inventoryItems, error: inventoryItemError } = await supabase
        .from("inventory_items")
        .insert(inventoryItemRows)
        .select("id, name")
        .order("created_at", { ascending: true });

    if (inventoryItemError || !inventoryItems) {
        throw new Error(
            inventoryItemError?.message || "Unable to seed inventory items",
        );
    }

    const variantRows = isSpeedywood
        ? [
            {
                item_id: inventoryItems[0]?.id,
                site_id: input.siteId,
                internal_code: "WOOD-ABE-27",
                supplier_code: "STH-ABE-27",
                producer: suppliers[0]?.name,
                purchase_unit_price: 42,
                attributes: {
                    material: "Abete",
                    category: "Tavole piallate",
                    thickness: 27,
                    length: 4000,
                },
            },
            {
                item_id: inventoryItems[1]?.id,
                site_id: input.siteId,
                internal_code: "PAN-MDF-19",
                supplier_code: "PTS-MDF-19",
                producer: suppliers[1]?.name,
                purchase_unit_price: 31,
                attributes: {
                    material: "MDF",
                    category: "Pannelli MDF",
                    thickness: 19,
                    width: 2070,
                    length: 2800,
                },
            },
        ]
        : [
            {
                item_id: inventoryItems[0]?.id,
                site_id: input.siteId,
                internal_code: "PAN-ROV-19",
                supplier_code: "NORD-ROV-19",
                producer: manufacturers[1]?.name,
                purchase_unit_price: 78,
                attributes: { finish: "Rovere naturale", thickness: 19 },
            },
            {
                item_id: inventoryItems[1]?.id,
                site_id: input.siteId,
                internal_code: "FER-GUI-500",
                supplier_code: "PRO-GUI-500",
                producer: suppliers[1]?.name,
                purchase_unit_price: 12,
                attributes: { length: 500, soft_close: true },
            },
        ];

    const { data: variants, error: variantsError } = await supabase
        .from("inventory_item_variants")
        .insert(variantRows)
        .select("id")
        .order("created_at", { ascending: true });

    if (variantsError || !variants) {
        throw new Error(
            variantsError?.message || "Unable to seed inventory variants",
        );
    }

    await supabase.from("inventory_stock_movements").insert([
        {
            site_id: input.siteId,
            variant_id: variants[0]?.id,
            warehouse_id: warehouses[0]?.id,
            movement_type: "opening",
            quantity: isSpeedywood ? 160 : 48,
            reason: "Stock iniziale demo",
        },
        {
            site_id: input.siteId,
            variant_id: variants[1]?.id,
            warehouse_id: warehouses[0]?.id,
            movement_type: "opening",
            quantity: isSpeedywood ? 96 : 120,
            reason: "Stock iniziale demo",
        },
        {
            site_id: input.siteId,
            variant_id: variants[1]?.id,
            warehouse_id: warehouses[1]?.id,
            movement_type: "out",
            quantity: isSpeedywood ? 18 : 12,
            reason: isSpeedywood ? "Preparazione ordine cliente" : "Preparazione kit montaggio",
        },
    ]);

    return { generatedUsers };
}

async function deleteAuthUsers(supabase: Awaited<SupabaseClient>, ids: string[]) {
    for (const id of ids.filter(Boolean)) {
        try {
            await supabase.auth.admin.deleteUser(id);
        } catch {
            // Ignore already deleted or orphaned demo users.
        }
    }
}

async function cleanupWorkspaceResources(
    supabase: Awaited<SupabaseClient>,
    workspace: DemoWorkspace,
) {
    const generatedUsers = workspace.seed_config?.generatedUsers || [];
    const idsToDelete = [workspace.demo_user_id, ...generatedUsers.map((user) => user.authId)];

    await deleteAuthUsers(supabase, idsToDelete);

    await supabase.from("organizations").delete().eq("id", workspace.organization_id);
}

async function fetchSiteById(
    supabase: Awaited<SupabaseClient>,
    siteId: string,
) {
    const { data } = await supabase
        .from("sites")
        .select("id, name, subdomain, logo, image")
        .eq("id", siteId)
        .maybeSingle();

    return data;
}

async function getDemoUserEmail(
    supabase: Awaited<SupabaseClient>,
    authUserId: string,
) {
    const { data, error } = await supabase.auth.admin.getUserById(authUserId);

    if (error) {
        throw new Error(error.message);
    }

    return data.user?.email || null;
}

function buildDefaultInputFromTemplate(input: CreateDemoWorkspaceInput) {
    const template = getDemoTemplateByKey(input.templateKey);
    return {
        ...input,
        enabledModules: input.enabledModules.length > 0
            ? input.enabledModules
            : template.defaultEnabledModules,
        recommendedModules: input.recommendedModules.length > 0
            ? input.recommendedModules
            : template.defaultRecommendedModules,
        painPoints: input.painPoints.length > 0
            ? input.painPoints
            : template.defaultPainPoints,
        desiredOutcomes: input.desiredOutcomes.length > 0
            ? input.desiredOutcomes
            : template.defaultDesiredOutcomes,
        landingTitle: input.landingTitle || template.defaultLandingTitle,
        landingSubtitle: input.landingSubtitle || template.defaultLandingSubtitle,
        introNarrative: input.introNarrative || template.defaultIntroNarrative,
        ctaLabel: input.ctaLabel || template.defaultCtaLabel,
        expiresInDays: input.expiresInDays || DEFAULT_EXPIRES_IN_DAYS,
    };
}

export async function createDemoWorkspace(
    rawInput: CreateDemoWorkspaceInput,
    createdBy: string,
) {
    const supabase = createServiceClient();
    const input = buildDefaultInputFromTemplate(rawInput);
    const organizationName = await ensureUniqueOrganizationName(
        supabase,
        input.customerCompany || `${input.customerName} Demo`,
    );
    const subdomain = await ensureUniqueSubdomain(
        supabase,
        `${input.customerName}-${input.templateKey}`,
    );
    const expiresAt = addDays(new Date(), input.expiresInDays).toISOString();

    const { data: organization, error: organizationError } = await supabase
        .from("organizations")
        .insert({
            name: organizationName,
        })
        .select("id, name")
        .single();

    if (organizationError || !organization) {
        throw new Error(
            organizationError?.message || "Unable to create demo organization",
        );
    }

    const { data: site, error: siteError } = await supabase.from("sites").insert({
        organization_id: organization.id,
        name: input.demoName,
        description: input.landingSubtitle || null,
        subdomain,
        logo: input.customerLogoUrl || null,
        image: input.heroImageUrl || null,
    }).select("id, name, subdomain").single();

    if (siteError || !site) {
        throw new Error(siteError?.message || "Unable to create demo site");
    }

    const ownerAuthUser = await createAuthUser(supabase, {
        email: buildDemoEmail(subdomain, "owner"),
        givenName: input.customerName,
        familyName: "Demo",
        role: "admin",
        picture: input.customerLogoUrl,
    });

    await linkUserToWorkspace(supabase, {
        authUserId: ownerAuthUser.id,
        organizationId: organization.id,
        siteId: site.id,
    });

    const ownerProfile = await ensureUserProfile(supabase, {
        authId: ownerAuthUser.id,
        email: ownerAuthUser.email || buildDemoEmail(subdomain, "owner"),
        givenName: input.customerName,
        familyName: "Demo",
        role: "admin",
        picture: input.customerLogoUrl,
        color: input.primaryColor,
    });

    const { data: workspace, error: workspaceError } = await supabase
        .from("demo_workspaces")
        .insert({
            organization_id: organization.id,
            site_id: site.id,
            demo_user_id: ownerAuthUser.id,
            template_key: input.templateKey,
            sector_key: input.sectorKey,
            scenario_type: input.scenarioType,
            display_name: input.demoName,
            customer_name: input.customerName,
            customer_company: input.customerCompany || null,
            customer_contact_name: input.customerContactName || null,
            customer_contact_email: input.customerContactEmail || null,
            status: "provisioning",
            branding_config: {
                customerName: input.customerName,
                customerLogoUrl: input.customerLogoUrl,
                heroImageUrl: input.heroImageUrl,
                primaryColor: input.primaryColor,
            },
            landing_config: {
                landingTitle: input.landingTitle,
                landingSubtitle: input.landingSubtitle,
                introNarrative: input.introNarrative,
                ctaLabel: input.ctaLabel,
                painPoints: input.painPoints,
                recommendedModules: input.recommendedModules,
            },
            seed_config: buildSeedConfig(input, []),
            notes: input.notes || input.salesNotes || null,
            expires_at: expiresAt,
            created_by: createdBy,
        })
        .select("*")
        .single();

    if (workspaceError || !workspace) {
        throw new Error(
            workspaceError?.message || "Unable to create demo workspace",
        );
    }

    try {
        const { generatedUsers } = await seedDemoWorkspaceData(supabase, {
            siteId: site.id,
            organizationId: organization.id,
            workspaceId: workspace.id,
            customerName: input.customerName,
            customerCompany: input.customerCompany,
            customerLogoUrl: input.customerLogoUrl,
            ownerProfileId: ownerProfile.id,
            ownerAuthId: ownerAuthUser.id,
            templateKey: input.templateKey,
            primaryColor: input.primaryColor,
            enabledModules: input.enabledModules,
            dataIntensity: input.dataIntensity,
        });

        const tokenResult = await createPublicToken(supabase, {
            workspaceId: workspace.id,
            createdBy,
            tokenPolicy: input.tokenPolicy,
            expiresAt,
        });

        const { data: updatedWorkspace, error: updateError } = await supabase
            .from("demo_workspaces")
            .update({
                status: "active",
                seed_config: buildSeedConfig(input, generatedUsers),
            })
            .eq("id", workspace.id)
            .select("*")
            .single();

        if (updateError || !updatedWorkspace) {
            throw new Error(
                updateError?.message || "Unable to activate demo workspace",
            );
        }

        return {
            workspace: updatedWorkspace as DemoWorkspace,
            token: tokenResult.token,
            publicUrl: tokenResult.publicUrl,
            statsPath: `/administration/demos/${workspace.id}`,
            demoUserEmail: ownerAuthUser.email,
            siteSubdomain: site.subdomain,
        };
    } catch (error) {
        await supabase
            .from("demo_workspaces")
            .update({ status: "failed" })
            .eq("id", workspace.id);
        throw error;
    }
}

export async function listDemoWorkspaces(): Promise<DemoWorkspaceListItem[]> {
    const supabase = createServiceClient();
    const nowIso = new Date().toISOString();

    await supabase
        .from("demo_workspaces")
        .update({ status: "expired" })
        .eq("status", "active")
        .lt("expires_at", nowIso);

    const { data: workspaces, error } = await supabase
        .from("demo_workspaces")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    const workspaceRows = (workspaces || []) as DemoWorkspace[];
    const siteIds = workspaceRows.map((workspace) => workspace.site_id);
    const workspaceIds = workspaceRows.map((workspace) => workspace.id);

    const [{ data: sites }, { data: tokens }] = await Promise.all([
        supabase.from("sites").select("id, name, subdomain, logo").in("id", siteIds),
        supabase.from("demo_access_tokens")
            .select("*")
            .in("workspace_id", workspaceIds)
            .order("created_at", { ascending: false }),
    ]);

    const siteMap = new Map((sites || []).map((site: any) => [site.id, site]));
    const tokenGroups = new Map<string, DemoAccessToken[]>();

    for (const token of (tokens || []) as DemoAccessToken[]) {
        const list = tokenGroups.get(token.workspace_id) || [];
        list.push(token);
        tokenGroups.set(token.workspace_id, list);
    }

    return workspaceRows.map((workspace) => {
        const activeToken = (tokenGroups.get(workspace.id) || []).find((token) =>
            !token.revoked_at && !isTokenExpired(token.expires_at)
        ) || null;

        return {
            workspace,
            site: siteMap.get(workspace.site_id) || null,
            activeToken,
            activeUrl: activeToken ? buildDemoPublicUrlFromTokenId(activeToken.id) : null,
        };
    });
}

export async function getDemoWorkspaceDetails(
    workspaceId: string,
): Promise<DemoWorkspaceDetails | null> {
    const supabase = createServiceClient();
    const { data: workspace, error } = await supabase
        .from("demo_workspaces")
        .select("*")
        .eq("id", workspaceId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!workspace) {
        return null;
    }

    const [site, tokensResult, eventsResult] = await Promise.all([
        fetchSiteById(supabase, workspace.site_id),
        supabase
            .from("demo_access_tokens")
            .select("*")
            .eq("workspace_id", workspace.id)
            .order("created_at", { ascending: false }),
        supabase
            .from("demo_access_events")
            .select("*")
            .eq("workspace_id", workspace.id)
            .order("created_at", { ascending: false })
            .limit(100),
    ]);

    if (tokensResult.error) {
        throw new Error(tokensResult.error.message);
    }

    if (eventsResult.error) {
        throw new Error(eventsResult.error.message);
    }

    const tokens = (tokensResult.data || []) as DemoAccessToken[];
    const activeToken = tokens.find((token) =>
        !token.revoked_at && !isTokenExpired(token.expires_at)
    ) || null;

    return {
        workspace: workspace as DemoWorkspace,
        site: site || null,
        tokens,
        events: (eventsResult.data || []) as DemoAccessEvent[],
        activeToken,
        activeUrl: activeToken ? buildDemoPublicUrlFromTokenId(activeToken.id) : null,
    };
}

async function updateWorkspaceAnalytics(
    supabase: Awaited<SupabaseClient>,
    workspace: DemoWorkspace,
    eventType: DemoAccessEventType,
    context: DemoRequestContext,
) {
    const updatePayload: Record<string, unknown> = {
        last_accessed_at: new Date().toISOString(),
    };

    if (context.ipAddress) {
        updatePayload.last_ip_address = context.ipAddress;
    }

    if (context.userAgent) {
        updatePayload.last_user_agent = context.userAgent;
    }

    if (eventType === "landing_view") {
        updatePayload.first_landing_view_at = workspace.first_landing_view_at ||
            new Date().toISOString();
        updatePayload.landing_view_count = (workspace.landing_view_count || 0) + 1;
    }

    if (eventType === "magic_link_generated") {
        updatePayload.magic_link_count = (workspace.magic_link_count || 0) + 1;
        updatePayload.last_magic_link_at = new Date().toISOString();
    }

    if (eventType === "login_success" || eventType === "session_started") {
        updatePayload.first_login_at = workspace.first_login_at ||
            new Date().toISOString();
        updatePayload.last_login_at = new Date().toISOString();
        updatePayload.login_count = (workspace.login_count || 0) + 1;
    }

    const { error } = await supabase
        .from("demo_workspaces")
        .update(updatePayload)
        .eq("id", workspace.id);

    if (error) {
        throw new Error(error.message);
    }
}

export async function recordDemoAccessEvent(
    workspace: DemoWorkspace,
    accessTokenId: string | null,
    eventType: DemoAccessEventType,
    context: DemoRequestContext = {},
    eventMetadata: Record<string, unknown> = {},
) {
    const supabase = createServiceClient();

    const { error } = await supabase.from("demo_access_events").insert({
        workspace_id: workspace.id,
        access_token_id: accessTokenId,
        event_type: eventType,
        ip_address: context.ipAddress || null,
        user_agent: context.userAgent || null,
        country: context.country || null,
        city: context.city || null,
        referrer: context.referrer || null,
        landing_path: context.landingPath || null,
        redirect_path: context.redirectPath || null,
        customer_name_snapshot: workspace.customer_name,
        customer_company_snapshot: workspace.customer_company || null,
        event_metadata: eventMetadata,
    });

    if (error) {
        throw new Error(error.message);
    }

    await updateWorkspaceAnalytics(supabase, workspace, eventType, context);
}

export async function validateDemoToken(
    rawToken: string,
): Promise<DemoTokenWithWorkspace | null> {
    const supabase = createServiceClient();
    const tokenId = parseRawToken(rawToken);

    if (!tokenId) {
        return null;
    }

    const { data, error } = await supabase
        .from("demo_access_tokens")
        .select("*, workspace:demo_workspaces(*)")
        .eq("id", tokenId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!data?.workspace) {
        return null;
    }

    const expectedRawToken = buildRawDemoToken(data.id);
    const expectedHash = createHash(expectedRawToken);

    if (expectedRawToken !== rawToken || data.token_hash !== expectedHash) {
        return null;
    }

    return {
        ...(data as any),
        workspace: data.workspace as DemoWorkspace,
    };
}

export async function getDemoLandingData(rawToken: string) {
    const tokenRecord = await validateDemoToken(rawToken);

    if (!tokenRecord) {
        return {
            tokenRecord: null,
            availability: "invalid" as const,
        };
    }

    const availability = getDemoLandingAvailability({
        workspaceStatus: tokenRecord.workspace.status,
        workspaceExpiresAt: tokenRecord.workspace.expires_at,
        tokenExpiresAt: tokenRecord.expires_at,
        tokenRevokedAt: tokenRecord.revoked_at,
        tokenUsePolicy: tokenRecord.use_policy,
        tokenUsesCount: tokenRecord.uses_count,
        tokenMaxUses: tokenRecord.max_uses,
    });

    return {
        tokenRecord,
        availability,
    };
}

export async function generateDemoMagicLink(
    rawToken: string,
    requestContext: DemoRequestContext = {},
) {
    const supabase = createServiceClient();
    const landing = await getDemoLandingData(rawToken);

    if (!landing.tokenRecord || landing.availability !== "active") {
        return {
            ok: false as const,
            availability: landing.availability,
        };
    }

    const tokenRecord = landing.tokenRecord;
    const site = await fetchSiteById(supabase, tokenRecord.workspace.site_id);

    if (!site?.subdomain) {
        throw new Error("Demo site not found for magic link generation");
    }

    await recordDemoAccessEvent(
        tokenRecord.workspace,
        tokenRecord.id,
        "cta_click",
        requestContext,
    );

    const redirectPath = `/sites/${site.subdomain}${
        tokenRecord.redirect_path.startsWith("/")
            ? tokenRecord.redirect_path
            : `/${tokenRecord.redirect_path}`
    }`;

    const redirectTo = `${getBaseUrl()}/auth/callback?next=${
        encodeURIComponent(redirectPath)
    }&demo_token=${encodeURIComponent(rawToken)}`;

    const demoUserEmail = await getDemoUserEmail(
        supabase,
        tokenRecord.workspace.demo_user_id,
    );

    const { data, error } = await (supabase.auth.admin as any).generateLink({
        type: "magiclink",
        email: demoUserEmail || buildDemoEmail(site.subdomain, "owner"),
        options: {
            redirectTo,
        },
    });

    if (error) {
        throw new Error(error.message);
    }

    const actionLink = data?.properties?.action_link || data?.action_link;

    if (!actionLink) {
        throw new Error("Supabase did not return a magic link");
    }

    const { error: tokenUpdateError } = await supabase
        .from("demo_access_tokens")
        .update({
            uses_count: tokenRecord.uses_count + 1,
            last_used_at: new Date().toISOString(),
        })
        .eq("id", tokenRecord.id);

    if (tokenUpdateError) {
        throw new Error(tokenUpdateError.message);
    }

    await recordDemoAccessEvent(
        tokenRecord.workspace,
        tokenRecord.id,
        "magic_link_generated",
        {
            ...requestContext,
            redirectPath,
        },
        {
            subdomain: site.subdomain,
        },
    );

    return {
        ok: true as const,
        actionLink,
    };
}

export async function recordDemoLoginFromToken(
    rawToken: string,
    requestContext: DemoRequestContext = {},
) {
    const tokenRecord = await validateDemoToken(rawToken);

    if (!tokenRecord) {
        return;
    }

    await recordDemoAccessEvent(
        tokenRecord.workspace,
        tokenRecord.id,
        "login_success",
        requestContext,
    );
}

export async function revokeDemoToken(workspaceId: string) {
    const supabase = createServiceClient();
    await revokeActiveTokens(supabase, workspaceId);

    const { error } = await supabase
        .from("demo_workspaces")
        .update({ status: "revoked" })
        .eq("id", workspaceId);

    if (error) {
        throw new Error(error.message);
    }
}

export async function regenerateDemoToken(
    workspaceId: string,
    createdBy: string,
) {
    const supabase = createServiceClient();
    const { data: workspace, error } = await supabase
        .from("demo_workspaces")
        .select("*")
        .eq("id", workspaceId)
        .single();

    if (error || !workspace) {
        throw new Error(error?.message || "Demo workspace not found");
    }

    await revokeActiveTokens(supabase, workspaceId);

    const tokenResult = await createPublicToken(supabase, {
        workspaceId,
        createdBy,
        tokenPolicy: "multi_use",
        expiresAt: workspace.expires_at || addDays(new Date(), 14).toISOString(),
    });

    await supabase
        .from("demo_workspaces")
        .update({ status: "active" })
        .eq("id", workspaceId);

    return tokenResult;
}

export async function extendDemoWorkspace(workspaceId: string, days: number) {
    const supabase = createServiceClient();
    const { data: workspace, error } = await supabase
        .from("demo_workspaces")
        .select("id, expires_at")
        .eq("id", workspaceId)
        .single();

    if (error || !workspace) {
        throw new Error(error?.message || "Demo workspace not found");
    }

    const baseDate = workspace.expires_at ? new Date(workspace.expires_at) : new Date();
    const nextExpiration = addDays(baseDate, days).toISOString();

    const { error: workspaceError } = await supabase
        .from("demo_workspaces")
        .update({
            expires_at: nextExpiration,
            status: "active",
        })
        .eq("id", workspaceId);

    if (workspaceError) {
        throw new Error(workspaceError.message);
    }

    const { error: tokenError } = await supabase
        .from("demo_access_tokens")
        .update({ expires_at: nextExpiration })
        .eq("workspace_id", workspaceId)
        .is("revoked_at", null);

    if (tokenError) {
        throw new Error(tokenError.message);
    }
}

export async function resetDemoWorkspace(workspaceId: string, createdBy: string) {
    const supabase = createServiceClient();
    const details = await getDemoWorkspaceDetails(workspaceId);

    if (!details) {
        throw new Error("Demo workspace not found");
    }

    const workspace = details.workspace;

    await revokeActiveTokens(supabase, workspaceId);

    const tokenResult = await createPublicToken(supabase, {
        workspaceId,
        createdBy,
        tokenPolicy: "multi_use",
        expiresAt: workspace.expires_at || addDays(new Date(), 14).toISOString(),
        label: "QR rigenerato dopo reset",
    });

    await supabase
        .from("demo_workspaces")
        .update({
            status: "active",
            last_accessed_at: null,
            first_landing_view_at: null,
            first_login_at: null,
            last_login_at: null,
            last_magic_link_at: null,
            last_ip_address: null,
            last_user_agent: null,
            login_count: 0,
            landing_view_count: 0,
            magic_link_count: 0,
        })
        .eq("id", workspaceId);

    await supabase.from("demo_access_events").delete().eq("workspace_id", workspaceId);

    return tokenResult;
}

export async function cleanupExpiredDemoWorkspaces(retentionDays = 30) {
    const supabase = createServiceClient();
    const nowIso = new Date().toISOString();
    const cutoffIso = subDays(new Date(), retentionDays).toISOString();

    await supabase
        .from("demo_workspaces")
        .update({ status: "expired" })
        .eq("status", "active")
        .lt("expires_at", nowIso);

    const { data: expiredWorkspaces, error } = await supabase
        .from("demo_workspaces")
        .select("*")
        .eq("status", "expired")
        .lt("expires_at", cutoffIso);

    if (error) {
        throw new Error(error.message);
    }

    const deletedWorkspaceIds: string[] = [];

    for (const workspace of (expiredWorkspaces || []) as DemoWorkspace[]) {
        await cleanupWorkspaceResources(supabase, workspace);
        deletedWorkspaceIds.push(workspace.id);
    }

    return {
        deletedCount: deletedWorkspaceIds.length,
        deletedWorkspaceIds,
        retentionDays,
    };
}
