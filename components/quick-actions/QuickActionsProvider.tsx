"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickActionType } from "./QuickActionsButton";

// Import the form components
import CreateClientForm from "@/app/sites/[domain]/clients/createForm";
import CreateProductFormComponent from "@/app/sites/[domain]/products/createProductForm";
import CreateProjectForm from "@/app/sites/[domain]/projects/createForm";
import CreateTimetrackingForm from "@/app/sites/[domain]/timetracking/createForm";
import { logger } from "@/lib/logger";

interface QuickActionsContextType {
  openDialog: (type: QuickActionType) => void;
  closeDialog: () => void;
}

const QuickActionsContext = createContext<QuickActionsContextType | null>(null);

export function useQuickActions() {
  const context = useContext(QuickActionsContext);
  if (!context) {
    throw new Error("useQuickActions must be used within QuickActionsProvider");
  }
  return context;
}

interface ProjectFormData {
  clients: any[];
  activeProducts: any[];
  kanbans: any[];
}

interface TimetrackingFormData {
  tasks: any[];
  users: any[];
  roles: any[];
}

interface ProductFormData {
  siteId: string;
}

const dialogConfig: Record<
  QuickActionType,
  { title: string; description: string }
> = {
  client: {
    title: "Nuovo Cliente",
    description: "Crea un nuovo cliente nel sistema",
  },
  project: {
    title: "Nuovo Progetto",
    description: "Crea un nuovo progetto",
  },
  product: {
    title: "Nuovo Articolo",
    description: "Aggiungi un nuovo articolo al catalogo",
  },
  timetracking: {
    title: "Nuovo Report Ore",
    description: "Registra le ore lavorate",
  },
};

export function QuickActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const domain = params?.domain as string;

  const [activeDialog, setActiveDialog] = useState<QuickActionType | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  // Data states for forms that require external data
  const [projectData, setProjectData] = useState<ProjectFormData | null>(null);
  const [timetrackingData, setTimetrackingData] =
    useState<TimetrackingFormData | null>(null);
  const [productData, setProductData] = useState<ProductFormData | null>(null);

  const fetchProjectData = useCallback(async () => {
    if (!domain) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/quick-actions/data?domain=${encodeURIComponent(
          domain
        )}&type=project`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setProjectData({
        clients: data.clients || [],
        activeProducts: data.activeProducts || [],
        kanbans: data.kanbans || [],
      });
    } catch (error) {
      logger.error("Error fetching project data:", error);
      setProjectData({ clients: [], activeProducts: [], kanbans: [] });
    } finally {
      setIsLoading(false);
    }
  }, [domain]);

  const fetchTimetrackingData = useCallback(async () => {
    if (!domain) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/quick-actions/data?domain=${encodeURIComponent(
          domain
        )}&type=timetracking`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setTimetrackingData({
        tasks: data.tasks || [],
        users: data.users || [],
        roles: data.roles || [],
      });
    } catch (error) {
      console.error("Error fetching timetracking data:", error);
      setTimetrackingData({ tasks: [], users: [], roles: [] });
    } finally {
      setIsLoading(false);
    }
  }, [domain]);

  const fetchProductData = useCallback(async () => {
    if (!domain) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/quick-actions/data?domain=${encodeURIComponent(
          domain
        )}&type=product`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setProductData({
        siteId: data.siteId,
      });
    } catch (error) {
      logger.error("Error fetching product data:", error);
      setProductData(null);
    } finally {
      setIsLoading(false);
    }
  }, [domain]);

  const openDialog = useCallback(
    async (type: QuickActionType) => {
      setActiveDialog(type);

      // Fetch data if needed
      if (type === "project" && !projectData) {
        fetchProjectData();
      } else if (type === "timetracking" && !timetrackingData) {
        fetchTimetrackingData();
      } else if (type === "product" && !productData) {
        fetchProductData();
      }
    },
    [
      projectData,
      timetrackingData,
      productData,
      fetchProjectData,
      fetchTimetrackingData,
      fetchProductData,
    ]
  );

  const closeDialog = useCallback((success?: boolean) => {
    setActiveDialog(null);
    // If creation was successful, trigger a page refresh to update any cached data
    if (success) {
      window.location.reload();
    }
  }, []);

  const renderDialogContent = () => {
    if (!activeDialog) return null;

    const config = dialogConfig[activeDialog];

    // Loading skeleton
    const LoadingSkeleton = () => (
      <div className="space-y-4 py-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-2/3" />
      </div>
    );

    switch (activeDialog) {
      case "client":
        return <CreateClientForm handleClose={closeDialog} />;

      case "product":
        if (isLoading || !productData) {
          return <LoadingSkeleton />;
        }
        return (
          <CreateProductFormComponent
            handleClose={closeDialog}
            domain={domain}
            siteId={productData.siteId}
          />
        );

      case "project":
        if (isLoading || !projectData) {
          return <LoadingSkeleton />;
        }
        return (
          <CreateProjectForm handleClose={closeDialog} data={projectData} />
        );

      case "timetracking":
        if (isLoading || !timetrackingData) {
          return <LoadingSkeleton />;
        }
        return (
          <CreateTimetrackingForm
            handleClose={closeDialog}
            data={timetrackingData.tasks}
            users={timetrackingData.users}
            roles={timetrackingData.roles}
          />
        );

      default:
        return null;
    }
  };

  const getDialogWidth = () => {
    switch (activeDialog) {
      case "client":
        return "sm:max-w-[60%]";
      case "project":
        return "sm:max-w-[50%]";
      case "timetracking":
        return "sm:max-w-[40%]";
      case "product":
        return "sm:max-w-[425px]";
      default:
        return "sm:max-w-[425px]";
    }
  };

  return (
    <QuickActionsContext.Provider value={{ openDialog, closeDialog }}>
      {children}

      <Dialog open={!!activeDialog} onOpenChange={() => closeDialog()}>
        <DialogContent
          className={`${getDialogWidth()} max-h-[90vh] overflow-y-auto`}
        >
          {activeDialog && (
            <>
              <DialogHeader>
                <DialogTitle>{dialogConfig[activeDialog].title}</DialogTitle>
                <DialogDescription>
                  {dialogConfig[activeDialog].description}
                </DialogDescription>
              </DialogHeader>
              {renderDialogContent()}
            </>
          )}
        </DialogContent>
      </Dialog>
    </QuickActionsContext.Provider>
  );
}
