import React from "react";
import { createClient } from "@/utils/server";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";
import { requireServerSiteContext, fetchProjectFiles } from "@/lib/server-data";
import { ProjectDocuments } from "@/components/project/project-documents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Package, Folder } from "lucide-react";
import Link from "next/link";

async function getData(id: number, siteId: string): Promise<any> {
  const supabase = await createClient();
  const { data: task, error: taskError } = await supabase
    .from("Task")
    .select(`
      *,
      sellProduct:SellProduct!sellProductId(id, name),
      client:Client!clientId(id, businessName),
      column:KanbanColumn!kanbanColumnId(id, title)
    `)
    .eq("id", id)
    .eq("site_id", siteId)
    .single();
  
  if (taskError) {
    logger.error("Error fetching task:", taskError);
    throw new Error("Failed to fetch task");
  }
  
  return task;
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: number; domain: string }>;
}) {
  const { id, domain } = await params;

  const session = await getUserContext();

  if (!session || !session.user || !session.user.id) {
    return redirect("/login");
  }

  const siteContext = await requireServerSiteContext(domain);
  const { siteId } = siteContext;

  const [data, files] = await Promise.all([
    getData(id, siteId),
    fetchProjectFiles(id, siteId),
  ]);

  const update = new Date(data.updated_at);
  const created = new Date(data.created_at);
  const deliveryDate = data.deliveryDate ? new Date(data.deliveryDate) : null;

  logger.debug(data);
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <div className="mb-6">
          <Link 
            href={`/sites/${domain}/projects`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna ai progetti
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Progetto #{data.unique_code}
            </h1>
            <p className="text-muted-foreground">
              {data.title || data.name || "Senza nome"}
            </p>
          </div>
          <Badge variant={data.archived ? "secondary" : "default"}>
            {data.archived ? "Archiviato" : "Attivo"}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Dettagli Progetto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Prodotto</span>
                <span className="font-medium">{data.sellProduct?.name ?? "-"}</span>
                
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-medium">{data.client?.businessName ?? "-"}</span>
                
                <span className="text-muted-foreground">Fase</span>
                <span className="font-medium">{data.column?.title ?? "-"}</span>
                
                <span className="text-muted-foreground">Valore</span>
                <span className="font-medium">
                  {data.sellPrice ? `${data.sellPrice.toLocaleString("it-CH")} CHF` : "-"}
                </span>
                
                <span className="text-muted-foreground">Numero Pezzi</span>
                <span className="font-medium">{data.numero_pezzi ?? "-"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Date e Stato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Data Consegna</span>
                <span className="font-medium">
                  {deliveryDate ? deliveryDate.toLocaleDateString("it-IT") : "-"}
                </span>
                
                <span className="text-muted-foreground">Creazione</span>
                <span className="font-medium">{created.toLocaleDateString("it-IT")}</span>
                
                <span className="text-muted-foreground">Ultimo Aggiornamento</span>
                <span className="font-medium">{update.toLocaleDateString("it-IT")}</span>
                
                <span className="text-muted-foreground">Materiale Disponibile</span>
                <span className="font-medium">{data.material ? "Sì" : "No"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Documenti di Progetto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectDocuments 
              projectId={id} 
              siteId={siteId} 
              initialFiles={files}
            />
          </CardContent>
        </Card>

        {data.other && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Note</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{data.other}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
