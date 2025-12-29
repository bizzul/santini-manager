"use client";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function Loading() {
  return (
    <div className="min-h-screen pb-24">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-40" />
              </div>
            </div>
            {/* Avatar Skeleton */}
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Progress Summary Card Skeleton */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background/60 rounded-xl p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="bg-background/60 rounded-xl p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </CardContent>
        </Card>

        {/* Entry Card Skeleton */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <div className="flex gap-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-16" />
                ))}
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Button Skeleton */}
        <Skeleton className="w-full h-14 rounded-md" />
      </div>

      {/* Bottom Bar Skeleton */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 border-t p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-[2]" />
        </div>
      </div>
    </div>
  );
}

export default Loading;
