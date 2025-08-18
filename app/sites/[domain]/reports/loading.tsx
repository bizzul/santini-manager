"use client";
import React from "react";
import { Structure } from "@/components/structure/structure";
import { Skeleton } from "@/components/ui/skeleton";

import { faSquarePollVertical } from "@fortawesome/free-solid-svg-icons";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function Loading() {
  return (
    <div className="container mx-auto ">
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 4 }, (v, k) => (
          <Card key={k}>
            <CardHeader>
              {" "}
              <Skeleton className="w-[50px] h-[10px] " />{" "}
              <Skeleton className="w-[80px] h-[10px] " />
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default Loading;
