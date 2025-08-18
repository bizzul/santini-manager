"use client";
import React from "react";
import { Structure } from "@/components/structure/structure";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { faBox } from "@fortawesome/free-solid-svg-icons";

function Loading() {
  return (
    <div className="container mx-auto ">
      <div className="flex items-center py-4">
        <Skeleton className="w-[100px] h-[10px] " />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {Array.from({ length: 1 }, (v, k) => (
              <TableRow key={k}>
                <TableHead>
                  {Array.from({ length: 1 }, (v, k) => (
                    <Skeleton key={k} className="w-[100px] h-[10px] " />
                  ))}
                </TableHead>
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }, (v, k) => (
              <TableRow key={k}>
                {Array.from({ length: 6 }, (v, k) => (
                  <TableCell key={k}>
                    <Skeleton className="w-[50px] h-[20px] " />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default Loading;
