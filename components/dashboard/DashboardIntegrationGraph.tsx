"use client";

import dynamic from "next/dynamic";
import { DiagramSkeleton } from "@/components/diagram/diagram-skeleton";

export type {
  OperationalDashboardNode,
  CountryDashboardNode,
  DashboardIntegrationGraphProps,
} from "@/components/dashboard/dashboard-integration-graph-canvas";

const DashboardIntegrationGraph = dynamic(
  () => import("@/components/dashboard/dashboard-integration-graph-canvas"),
  {
    ssr: false,
    loading: () => <DiagramSkeleton />,
  },
);

export default DashboardIntegrationGraph;
