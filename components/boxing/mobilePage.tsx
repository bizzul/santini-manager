"use client";
import React, { useState } from "react";
import { useToast } from "../ui/use-toast";

import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

import { useRouter } from "next/navigation";

// Define types based on Supabase schema
interface PackingControl {
  id: number;
  passed: string;
  task?: {
    unique_code?: string;
    sellProduct?: {
      name?: string;
    };
  };
}

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
  packing,
  onClick,
}: {
  packing: PackingControl;
  onClick: (packing: PackingControl) => void;
}) => {
  return (
    <Card
      onClick={() => onClick(packing)}
      className="hover:bg-tremor-background-emphasis pointer-events-auto select-none w-64 h-32"
    >
      <CardHeader>
        <CardTitle>{packing.task?.unique_code}</CardTitle>
        <CardDescription>
          <span className="text-sm font-light">
            {packing.task?.sellProduct?.name}{" "}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`${packing.passed === "NOT_DONE" && "text-red-500"} ${
            packing.passed === "PARTIALLY_DONE" && "text-amber-500"
          } ${packing.passed === "DONE" && "text-green-500"}`}
        >
          {statusText(packing.passed)}
        </div>
      </CardContent>
    </Card>
  );
};

function MobilePage({
  session,
  data,
}: {
  session: any;
  data: {
    packing: PackingControl[];
  };
}) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handlePackingClick = (packing: PackingControl) => {
    router.push(`/boxing/edit/${packing.id}`);
  };

  return (
    <div>
      <div className="flex justify-center w-auto h-auto flex-col items-center text-slate-200 ">
        <div className="py-4 md:w-1/2 w-full md:px-0 px-10">
          <p className="mt-4 text-xl font-bold text-gray-200">
            Check imballaggio
          </p>
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          {data.packing.map((packing) => (
            <TaskCard
              key={packing.id}
              packing={packing}
              onClick={handlePackingClick}
            />
          ))}
        </div>

        {loading && (
          <div className="absolute top-0 left-0 w-screen h-screen bg-black/50"></div>
        )}
      </div>
    </div>
  );
}

export default MobilePage;
