"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Users,
  FolderKanban,
  Package,
  FileText,
  Truck,
  UserRoundCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type QuickActionType =
  | "client"
  | "offer"
  | "project"
  | "product"
  | "supplier"
  | "collaborator";

interface QuickActionItem {
  id: QuickActionType;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const quickActions: QuickActionItem[] = [
  {
    id: "client",
    label: "Cliente",
    icon: <Users className="w-5 h-5" />,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10 hover:bg-blue-500/20",
  },
  {
    id: "offer",
    label: "Offerta",
    icon: <FileText className="w-5 h-5" />,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10 hover:bg-cyan-500/20",
  },
  {
    id: "project",
    label: "Progetto",
    icon: <FolderKanban className="w-5 h-5" />,
    color: "text-green-500",
    bgColor: "bg-green-500/10 hover:bg-green-500/20",
  },
  {
    id: "product",
    label: "Prodotto",
    icon: <Package className="w-5 h-5" />,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10 hover:bg-purple-500/20",
  },
  {
    id: "supplier",
    label: "Fornitore",
    icon: <Truck className="w-5 h-5" />,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10 hover:bg-amber-500/20",
  },
  {
    id: "collaborator",
    label: "Collaboratore",
    icon: <UserRoundCog className="w-5 h-5" />,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10 hover:bg-orange-500/20",
  },
];

interface QuickActionsButtonProps {
  onActionClick: (action: QuickActionType) => void;
}

export function QuickActionsButton({ onActionClick }: QuickActionsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleActionClick = useCallback(
    (action: QuickActionType) => {
      setIsOpen(false);
      onActionClick(action);
    },
    [onActionClick]
  );

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Quick Actions Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 28,
            }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[180px]"
          >
            <div className="rounded-2xl border border-[hsl(var(--sidebar-border)/0.8)] bg-[hsl(var(--sidebar-card)/0.98)] p-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
              <TooltipProvider delayDuration={120}>
                <div className="grid grid-cols-3 gap-2">
                {quickActions.map((action, index) => (
                  <Tooltip key={action.id}>
                    <TooltipTrigger asChild>
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: index * 0.05,
                          type: "spring",
                          stiffness: 400,
                          damping: 25,
                        }}
                        onClick={() => handleActionClick(action.id)}
                        title={action.label}
                        aria-label={action.label}
                        className={cn(
                          "w-full aspect-square rounded-xl border border-border/40 transition-all duration-200",
                          "flex items-center justify-center",
                          "hover:scale-[1.02] active:scale-[0.98]",
                          action.bgColor
                        )}
                      >
                        <div
                          className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--sidebar-card-strong))] shadow-sm dark:bg-slate-800",
                            action.color
                          )}
                        >
                          {action.icon}
                        </div>
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {action.label}
                    </TooltipContent>
                  </Tooltip>
                ))}
                </div>
              </TooltipProvider>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Button */}
      <motion.button
        onClick={toggleMenu}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative flex items-center justify-center",
          "w-10 h-10 rounded-xl",
          "bg-gradient-to-br from-[hsl(var(--sidebar-card))] to-[hsl(var(--sidebar-card-strong))] dark:from-primary dark:to-primary/80",
          "text-[hsl(var(--sidebar-foreground))] shadow-lg dark:text-primary-foreground",
          "hover:shadow-xl hover:shadow-[hsl(var(--sidebar-card-shadow)/0.2)] dark:hover:shadow-primary/25",
          "transition-all duration-300",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-[hsl(var(--sidebar))]"
        )}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </motion.div>
      </motion.button>
    </div>
  );
}
