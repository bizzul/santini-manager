"use client";
import React, { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Task, Client, KanbanColumn } from "@/types/supabase";
import { DateManager } from "../../package/utils/dates/date-manager";

interface OfferMiniCardProps {
  id: number;
  data: Task & {
    client?: Client;
    sellProduct?: { type?: string; name?: string };
    column?: KanbanColumn;
    positions?: string[];
    numero_pezzi?: number | null;
    isPreview?: boolean;
    locked?: boolean;
  };
  onCardClick: (task: Task) => void;
  domain?: string;
}

export default function OfferMiniCard({
  id,
  data,
  onCardClick,
  domain,
}: OfferMiniCardProps) {
  // Calculate if card should be orange (7 days since sent_date)
  const { isOverdue, daysSinceSent } = useMemo(() => {
    const sentDate = data.sent_date || data.sentDate;
    if (!sentDate) {
      return { isOverdue: false, daysSinceSent: 0 };
    }

    const sent = new Date(sentDate);
    const now = new Date();
    const diffTime = now.getTime() - sent.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return {
      isOverdue: diffDays >= 7,
      daysSinceSent: diffDays,
    };
  }, [data.sent_date, data.sentDate]);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: id.toString(),
      data: {
        id,
        fromColumn: data.column?.identifier,
      },
      disabled: data.locked || data.isPreview,
    });

  const dragStyle = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  // Get client display name
  const clientName = useMemo(() => {
    if (!data.client) return "-";
    if (data.client.clientType === "BUSINESS") {
      return data.client.businessName || "-";
    }
    const firstName = data.client.individualFirstName || "";
    const lastName = data.client.individualLastName || "";
    return `${firstName} ${lastName}`.trim() || "-";
  }, [data.client]);

  // Get product info
  const productInfo = data.sellProduct?.type || data.sellProduct?.name || "-";

  // Format sent date
  const sentDateFormatted = useMemo(() => {
    const sentDate = data.sent_date || data.sentDate;
    if (!sentDate) return "-";
    return DateManager.formatEUDate(sentDate);
  }, [data.sent_date, data.sentDate]);

  // Priorità a numero_pezzi, altrimenti conta le posizioni riempite
  const piecesOrPositions = useMemo(() => {
    // Se numero_pezzi è definito, usa quello
    if (data.numero_pezzi && data.numero_pezzi > 0) {
      return { value: data.numero_pezzi, label: 'pz' };
    }
    // Altrimenti conta le posizioni riempite
    if (!data.positions) return { value: 0, label: 'pos.' };
    const count = data.positions.filter((p) => p && p.trim() !== "").length;
    return { value: count, label: 'pos.' };
  }, [data.positions, data.numero_pezzi]);

  // Background class based on overdue status
  const getBackgroundClass = () => {
    if (isOverdue) {
      return "bg-orange-500 dark:bg-orange-600 animate-pulse";
    }
    return "bg-slate-600 dark:bg-slate-700";
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click if dragging
    if (isDragging) return;
    // Prevent click on drag handle
    if (e.target instanceof Element && e.target.closest("[data-drag-handle]"))
      return;

    onCardClick(data);
  };

  return (
    <div
      ref={data.isPreview ? undefined : setNodeRef}
      style={{
        ...dragStyle,
        opacity: isDragging ? 0.5 : 1,
        cursor: data.isPreview ? "not-allowed" : "pointer",
      }}
      {...(data.isPreview ? {} : { ...listeners, ...attributes })}
      onClick={handleClick}
      className={`
        w-full mb-2 p-3 shadow-md select-none rounded-sm
        ${data.isPreview ? "opacity-75 cursor-not-allowed" : "hover:brightness-110"}
        ${getBackgroundClass()}
        text-white text-sm
        transition-all duration-200
      `}
    >
      {/* Header: Code & Sent Date */}
      <div className="flex justify-between items-start mb-1">
        <span className="font-bold text-xs">{data.unique_code}</span>
        <span className="text-xs opacity-80">{sentDateFormatted}</span>
      </div>

      {/* Product Type */}
      <div className="text-xs opacity-90 mb-1 truncate">{productInfo}</div>

      {/* Client Name */}
      <div className="font-semibold text-sm truncate mb-1">{clientName}</div>

      {/* Footer: Pezzi/Positions & Value */}
      <div className="flex justify-between items-center mt-2 pt-1 border-t border-white/20">
        <span className="text-xs">
          {piecesOrPositions.value > 0 ? `${piecesOrPositions.value} ${piecesOrPositions.label}` : "-"}
        </span>
        <span className="font-bold text-sm">
          {((data.sellPrice || 0) / 1000).toFixed(2)} K
        </span>
      </div>

      {/* Days indicator if approaching overdue */}
      {daysSinceSent >= 5 && daysSinceSent < 7 && (
        <div className="mt-1 text-xs text-yellow-200">
          ⚠️ {7 - daysSinceSent} giorni al follow-up
        </div>
      )}
      {isOverdue && (
        <div className="mt-1 text-xs font-medium">
          🔔 Da {daysSinceSent} giorni
        </div>
      )}
    </div>
  );
}

