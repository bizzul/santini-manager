import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="container mx-auto px-4 py-6">
            <div className="mb-6">
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-72" />
            </div>
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-[250px]" />
                    <Skeleton className="h-10 w-[180px]" />
                </div>
                <div className="rounded-md border">
                    <div className="p-4">
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-4"
                                >
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-6 w-24" />
                                    <Skeleton className="h-6 w-20" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

