"use client";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

function Loading() {
  return (
    <div className="container mx-auto ">
      <div className="flex items-center py-4">
        <Skeleton className="w-[200px] h-[100px] " />
      </div>
    </div>
  );
}

export default Loading;
