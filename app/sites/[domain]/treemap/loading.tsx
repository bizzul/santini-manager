import { Skeleton } from "@/components/ui/skeleton";

export default function TreemapLoading() {
  return (
    <div className="container mx-auto space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="min-h-[520px] h-[70vh] max-h-[640px] w-full rounded-xl" />
    </div>
  );
}
