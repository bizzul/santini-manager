"use client";
import React from "react";
import { Structure } from "../../../components/structure/structure";
import { Skeleton } from "../../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { faBox } from "@fortawesome/free-solid-svg-icons";

function Loading() {
  return <div>Caricamento in corso...</div>;
}

export default Loading;
