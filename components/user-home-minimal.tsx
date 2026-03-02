import Link from "next/link";
import { AVAILABLE_MODULES, ModuleConfig } from "@/lib/module-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWaveSquare,
  faTable,
  faClock,
  faUser,
  faExclamation,
  faSquarePollVertical,
  faCheckSquare,
  faBox,
  faHelmetSafety,
  faUserTie,
  faWarehouse,
  faCalendarDays,
  faIndustry,
  faListUl,
  faMicrophone,
} from "@fortawesome/free-solid-svg-icons";

interface UserHomeMinimalProps {
  userName: string;
  domain: string;
  availableModules: string[];
}

const iconMap: Record<string, any> = {
  faWaveSquare,
  faTable,
  faClock,
  faUser,
  faExclamation,
  faSquarePollVertical,
  faCheckSquare,
  faBox,
  faHelmetSafety,
  faUserTie,
  faWarehouse,
  faCalendarDays,
  faIndustry,
  faListUl,
  faMicrophone,
};

const categoryLabels: Record<string, string> = {
  core: "Principale",
  management: "Gestione",
  tools: "Strumenti",
  reports: "Report",
};

const categoryOrder = ["core", "management", "tools", "reports"];

export function UserHomeMinimal({ userName, domain, availableModules }: UserHomeMinimalProps) {
  const basePath = `/sites/${domain}`;
  
  // Filter modules that user has access to and that have a valid href
  const accessibleModules = AVAILABLE_MODULES.filter(
    (module) => 
      availableModules.includes(module.name) && 
      module.href && 
      module.name !== "dashboard" // Exclude dashboard since user doesn't have access
  );

  // Group modules by category
  const modulesByCategory = accessibleModules.reduce((acc, module) => {
    const category = module.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(module);
    return acc;
  }, {} as Record<string, ModuleConfig[]>);

  // Check if user has timetracking access for quick action
  const hasTimetracking = availableModules.includes("timetracking");

  return (
    <PageLayout>
      <PageHeader>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Benvenuto{userName ? `, ${userName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Accedi rapidamente ai tuoi moduli disponibili
          </p>
        </div>
      </PageHeader>
      <PageContent>
        <div className="space-y-8">
          {/* Quick Actions */}
          {hasTimetracking && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Azioni Rapide</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`${basePath}/timetracking`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    <FontAwesomeIcon icon={faClock} className="w-4 h-4" />
                    Registra Ore
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Modules by Category */}
          {categoryOrder.map((category) => {
            const modules = modulesByCategory[category];
            if (!modules || modules.length === 0) return null;

            return (
              <div key={category}>
                <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                  {categoryLabels[category] || category}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {modules.map((module) => {
                    const icon = iconMap[module.icon];
                    return (
                      <Link
                        key={module.name}
                        href={`${basePath}${module.href}`}
                        className="block"
                      >
                        <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer">
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                              {icon && (
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <FontAwesomeIcon
                                    icon={icon}
                                    className="w-5 h-5 text-primary"
                                  />
                                </div>
                              )}
                              <CardTitle className="text-base">
                                {module.label}
                              </CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <CardDescription className="text-sm">
                              {module.description}
                            </CardDescription>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {accessibleModules.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Non hai ancora accesso a nessun modulo.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Contatta un amministratore per richiedere l&apos;accesso.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContent>
    </PageLayout>
  );
}
