"use client";

import dynamic from "next/dynamic";
import { DiagramSkeleton } from "@/components/diagram/diagram-skeleton";

export type {
  FocusDiagramRoot,
  FocusDiagramChild,
  FocusDiagramProps,
} from "@/components/diagram/focus-diagram-canvas";

const FocusDiagramCanvas = dynamic(
  () => import("@/components/diagram/focus-diagram-canvas"),
  {
    ssr: false,
    loading: () => <DiagramSkeleton />,
  },
);

export default FocusDiagramCanvas;
