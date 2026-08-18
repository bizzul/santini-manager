import {
  SITE_NAV_GROUPS,
  buildSiteNavigation,
  collectOpenKeysForActivePath,
  roleMeetsMin,
} from "@/lib/navigation";

const t = (key: string) => key;

const ALL_MODULES = [
  "dashboard",
  "dashboard-forecast",
  "projects",
  "kanban",
  "calendar",
  "attendance",
  "clients",
  "suppliers",
  "manufacturers",
  "resellers",
  "collaborators",
  "products",
  "inventory",
  "categories",
];

describe("SITE_NAV_GROUPS", () => {
  it("defines the six areas in the specified order", () => {
    expect(SITE_NAV_GROUPS.map((group) => group.id)).toEqual([
      "panoramica",
      "lavoro",
      "pianificazione",
      "anagrafiche",
      "listino",
      "configurazione",
    ]);
  });

  it("keeps item order inside each area", () => {
    expect(SITE_NAV_GROUPS[0].items.map((item) => item.key)).toEqual([
      "overview",
      "forecast",
    ]);
    expect(SITE_NAV_GROUPS[1].items.map((item) => item.key)).toEqual([
      "projects",
      "kanban",
      "documents",
    ]);
    expect(SITE_NAV_GROUPS[2].items.map((item) => item.key)).toEqual([
      "calendars",
      "attendance",
    ]);
    expect(SITE_NAV_GROUPS[3].items.map((item) => item.key)).toEqual([
      "contacts",
      "products",
      "warehouse",
    ]);
    expect(SITE_NAV_GROUPS[4].items.map((item) => item.key)).toEqual([
      "supplementi",
      "coefficienti",
    ]);
    expect(SITE_NAV_GROUPS[5].items.map((item) => item.key)).toEqual([
      "categories",
      "settings",
    ]);
  });

  it("does not include Home", () => {
    const keys = SITE_NAV_GROUPS.flatMap((group) =>
      group.items.flatMap(function collect(item): string[] {
        return [item.key, ...(item.children?.flatMap(collect) ?? [])];
      })
    );
    expect(keys).not.toContain("home");
  });

  it("keeps calendar and category children visible in the tree", () => {
    const calendars = SITE_NAV_GROUPS[2].items.find(
      (item) => item.key === "calendars"
    );
    expect(calendars?.children?.map((child) => child.key)).toEqual([
      "calendar-production",
      "calendar-installation",
      "calendar-service",
    ]);

    const categories = SITE_NAV_GROUPS[5].items.find(
      (item) => item.key === "categories"
    );
    expect(categories?.children?.map((child) => child.key)).toEqual([
      "categories-inventory",
      "categories-products",
      "categories-suppliers",
    ]);
  });
});

describe("roleMeetsMin", () => {
  it("treats user as below admin", () => {
    expect(roleMeetsMin("user", "admin")).toBe(false);
    expect(roleMeetsMin("admin", "admin")).toBe(true);
    expect(roleMeetsMin("superadmin", "admin")).toBe(true);
  });
});

describe("buildSiteNavigation", () => {
  it("hides anagrafiche, listino and configurazione from user", () => {
    const groups = buildSiteNavigation({
      basePath: "/sites/santini",
      enabledModules: ALL_MODULES,
      role: "user",
      t,
      settingsHref: "/administration/sites/1/edit",
    });
    expect(groups.map((group) => group.id)).toEqual([
      "panoramica",
      "lavoro",
      "pianificazione",
    ]);
  });

  it("shows all six areas to admin when modules are enabled", () => {
    const groups = buildSiteNavigation({
      basePath: "/sites/santini",
      enabledModules: ALL_MODULES,
      role: "admin",
      t,
      settingsHref: "/administration/sites/1/edit",
    });
    expect(groups.map((group) => group.id)).toEqual([
      "panoramica",
      "lavoro",
      "pianificazione",
      "anagrafiche",
      "listino",
      "configurazione",
    ]);
    expect(groups[1].items.map((item) => item.key)).toEqual([
      "projects",
      "kanban",
      "documents",
    ]);
    expect(groups[0].items[0].href).toBe("/sites/santini/dashboard");
  });

  it("collects open keys for a nested calendar route", () => {
    const groups = buildSiteNavigation({
      basePath: "/sites/santini",
      enabledModules: ALL_MODULES,
      role: "admin",
      t,
      settingsHref: "/administration/sites/1/edit",
    });
    expect(
      collectOpenKeysForActivePath(
        groups,
        "/sites/santini/calendar-installation",
        ""
      )
    ).toEqual(["calendars", "pianificazione"]);
  });
});
