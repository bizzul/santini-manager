import { cn } from "@/lib/utils";

function getDepthIndentClass(depth: number) {
  if (depth === 0) return "w-0";
  if (depth === 1) return "w-6";
  return "w-12";
}

interface HierarchyLeadingCellProps {
  depth: number;
  children?: React.ReactNode;
}

export function HierarchyLeadingCell({
  depth,
  children,
}: HierarchyLeadingCellProps) {
  return (
    <div className="flex items-center">
      <span
        className={cn("inline-block shrink-0", getDepthIndentClass(depth))}
        aria-hidden="true"
      />
      {children ? (
        <div className="flex shrink-0 items-center gap-0.5">{children}</div>
      ) : null}
    </div>
  );
}
