"use client";

import dynamic from "next/dynamic";
import { DiagramSkeleton } from "@/components/diagram/diagram-skeleton";

export type { AreaTreeDiagramProps } from "@/components/diagram/area-tree-canvas";

const AreaTreeCanvas = dynamic(
  () => import("@/components/diagram/area-tree-canvas"),
  {
    ssr: false,
    loading: () => <DiagramSkeleton />,
  },
);

export default AreaTreeCanvas;
