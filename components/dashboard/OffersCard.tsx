"use client";

import { useState } from "react";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OffersCard() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  // Dati mockup
  const offersData = {
    week: {
      todo: 2,
      inProgress: 3,
      sent: 8,
      won: 4,
      lost: 5,
      totalValue: 45000,
    },
    month: {
      todo: 5,
      inProgress: 8,
      sent: 18,
      won: 12,
      lost: 8,
      totalValue: 187000,
    },
    year: {
      todo: 15,
      inProgress: 25,
      sent: 156,
      won: 98,
      lost: 72,
      totalValue: 2340000,
    },
  };

  const data = offersData[period];
  const maxValue = Math.max(data.todo, data.inProgress, data.sent);

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6 col-span-2 lg:col-span-3">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Offerte</h3>
            <p className="text-sm text-muted-foreground">Gestione offerte</p>
          </div>
        </div>

        <Select
          value={period}
          onValueChange={(value: "week" | "month" | "year") => setPeriod(value)}
        >
          <SelectTrigger className="w-[140px] bg-white/10 border-white/20 backdrop-blur-sm">
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Settimana</SelectItem>
            <SelectItem value="month">Mese</SelectItem>
            <SelectItem value="year">Anno</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grafico a colonne */}
      <div className="mb-6">
        <div className="flex items-end justify-around gap-4 h-48">
          {/* Todo */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-full flex flex-col justify-end h-40 mb-2">
              <div
                className="w-full bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-t-lg transition-all duration-500 relative group"
                style={{
                  height: `${(data.todo / maxValue) * 100}%`,
                  minHeight: "20px",
                }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg" />
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-bold text-lg">
                  {data.todo}
                </span>
              </div>
            </div>
            <span className="text-xs font-medium text-center">To do</span>
          </div>

          {/* In elaborazione */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-full flex flex-col justify-end h-40 mb-2">
              <div
                className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500 relative group"
                style={{
                  height: `${(data.inProgress / maxValue) * 100}%`,
                  minHeight: "20px",
                }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg" />
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-bold text-lg">
                  {data.inProgress}
                </span>
              </div>
            </div>
            <span className="text-xs font-medium text-center">
              In elaborazione
            </span>
          </div>

          {/* Inviate */}
          <div className="flex flex-col items-center flex-1">
            <div className="w-full flex flex-col justify-end h-40 mb-2">
              <div
                className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg transition-all duration-500 relative group"
                style={{
                  height: `${(data.sent / maxValue) * 100}%`,
                  minHeight: "20px",
                }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg" />
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-bold text-lg">
                  {data.sent}
                </span>
              </div>
            </div>
            <span className="text-xs font-medium text-center">Inviate</span>
          </div>
        </div>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
        {/* Totale Valore */}
        <div className="backdrop-blur-sm bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <p className="text-xs text-muted-foreground font-medium">
              Valore Totale
            </p>
          </div>
          <p className="text-2xl font-bold">
            CHF {(data.totalValue / 1000).toFixed(0)}k
          </p>
        </div>

        {/* Vinte */}
        <div className="backdrop-blur-sm bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <p className="text-xs text-muted-foreground font-medium">Vinte</p>
          </div>
          <p className="text-2xl font-bold text-green-500">{data.won}</p>
        </div>

        {/* Perse */}
        <div className="backdrop-blur-sm bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-400" />
            <p className="text-xs text-muted-foreground font-medium">Perse</p>
          </div>
          <p className="text-2xl font-bold text-red-500">{data.lost}</p>
        </div>
      </div>
    </div>
  );
}
