"use client";
import React from "react";
import { Skeleton } from "../../../components/ui/skeleton";

function Loading() {
  return (
    // <StructureKanban titleIcon={faListCheck} titleText="KANBAN">
    <div className="container mx-auto ">
      <>
        <div className="fixed flex justify-start">
          <Skeleton className="w-[50px] h-[20px] " />

          <Skeleton className="w-[50px] h-[20px] " />
        </div>
        <div>
          <div className="grid grid-flow-col gap-4 pt-12">
            {Array.from({ length: 6 }, (v, k) => (
              <Skeleton key={k} className="w-[200px] h-[500px] " />
            ))}
          </div>
        </div>

        <div className="flex items-center py-4">
          <Skeleton className="w-[100px] h-[10px] " />
        </div>
      </>
    </div>
    // </StructureKanban>
  );
}

export default Loading;
