"use client";
import React, { useState } from "react";
import { QualityControl, User } from "@/types/supabase";
import { useToast } from "../ui/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";

import { useRouter } from "next/navigation";

export const statusText = (status: string) => {
  let statusText;
  switch (status) {
    case "NOT_DONE":
      statusText = "Non completato";
      break;
    case "PARTIALLY_DONE":
      statusText = "Parzialmente completato";
      break;
    case "DONE":
      statusText = "Completato";
      break;
    default:
      statusText = "Unknown Status"; // Fallback for unrecognized status
  }
  return statusText;
};

const TaskCard = ({
  quality,
  onClick,
}: {
  quality: QualityControl;
  onClick: any;
}) => {
  return (
    <Card
      onClick={() => onClick(quality)}
      className="hover:bg-tremor-background-emphasis pointer-events-auto select-none w-64 h-32"
    >
      <CardHeader>
        <CardTitle>
          {/* @ts-ignore */}
          {quality.task?.unique_code} -{" "}
          <span className="text-sm">POS.{quality.position_nr}</span>
        </CardTitle>
        <CardDescription>
          <span className="text-sm font-light">
            {/* @ts-ignore */}
            {quality.task?.sellProduct?.name}{" "}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`${quality.passed === "NOT_DONE" && "text-red-500"} ${
            quality.passed === "PARTIALLY_DONE" && "text-amber-500"
          } ${quality.passed === "DONE" && "text-green-500"}`}
        >
          {statusText(quality.passed || "PENDING")}
        </div>
      </CardContent>
    </Card>
  );
};

function MobilePage({
  data,
  session,
}: {
  data: {
    quality: QualityControl[];
  };
  session: any;
}) {
  const router = useRouter();

  const handleQualityClick = (quality: QualityControl) => {
    router.push(`/qualityControl/edit/${quality.id}`);
  };

  return (
    <div>
      <div className="flex justify-center w-auto h-auto flex-col items-center text-slate-200 ">
        <div className="py-4 md:w-1/2 w-full md:px-0 px-10">
          <p className="mt-4 text-xl font-bold text-gray-200">
            Quality Control
          </p>
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          {data.quality.map((quality) => (
            <TaskCard
              key={quality.id}
              quality={quality}
              onClick={handleQualityClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default MobilePage;
