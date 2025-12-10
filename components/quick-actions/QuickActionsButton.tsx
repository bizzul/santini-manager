"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Users, FolderKanban, Package, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuickActionType = "client" | "project" | "product" | "timetracking";

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
    id: "project",
    label: "Progetto",
    icon: <FolderKanban className="w-5 h-5" />,
    color: "text-green-500",
    bgColor: "bg-green-500/10 hover:bg-green-500/20",
  },
  {
    id: "product",
    label: "Articolo",
    icon: <Package className="w-5 h-5" />,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10 hover:bg-purple-500/20",
  },
  {
    id: "timetracking",
    label: "Ore",
    icon: <Clock className="w-5 h-5" />,
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
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
            }}
            className="absolute top-full right-0 mt-2 z-50"
          >
            <div className="bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-2 min-w-[200px]">
              {/* Header */}
              <div className="px-3 py-2 border-b border-border/50 mb-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Creazione rapida
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-1">
                {quickActions.map((action, index) => (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: index * 0.05,
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                    }}
                    onClick={() => handleActionClick(action.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                      "hover:scale-[1.02] active:scale-[0.98]",
                      action.bgColor
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-9 h-9 rounded-lg bg-background shadow-sm",
                        action.color
                      )}
                    >
                      {action.icon}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">
                        {action.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Aggiungi nuovo
                      </span>
                    </div>
                    <Plus className={cn("w-4 h-4 ml-auto", action.color)} />
                  </motion.button>
                ))}
              </div>
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
          "bg-gradient-to-br from-primary to-primary/80",
          "text-primary-foreground shadow-lg",
          "hover:shadow-xl hover:shadow-primary/25",
          "transition-all duration-300",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background"
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
