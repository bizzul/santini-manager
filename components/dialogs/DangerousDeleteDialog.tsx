"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DangerousDeleteDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmationText: string;
  warningItems?: string[];
  onConfirm: () => Promise<void>;
  successMessage?: string;
}

export function DangerousDeleteDialog({
  trigger,
  title,
  description,
  confirmationText,
  warningItems = [],
  onConfirm,
  successMessage,
}: DangerousDeleteDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const isConfirmationValid =
    inputValue.toLowerCase() === confirmationText.toLowerCase();

  const handleConfirm = async () => {
    if (!isConfirmationValid) return;

    setIsDeleting(true);
    try {
      await onConfirm();
      setOpen(false);
      setInputValue("");
      // Show success toast if not handled by onConfirm
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (error: any) {
      console.error("Delete failed:", error);
      toast.error(error.message || "Errore durante l'eliminazione");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle className="text-xl">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-4">
            <p>{description}</p>

            {warningItems.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="font-semibold text-red-800 dark:text-red-300 mb-2">
                  Questa azione eliminerà definitivamente:
                </p>
                <ul className="list-disc list-inside space-y-1 text-red-700 dark:text-red-400 text-sm">
                  {warningItems.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-amber-800 dark:text-amber-300 text-sm">
                <strong>Attenzione:</strong> Questa operazione non può essere
                annullata. Tutti i dati saranno persi definitivamente.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Label
            htmlFor="confirmation"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Per confermare, scrivi{" "}
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-red-600 dark:text-red-400">
              {confirmationText}
            </span>
          </Label>
          <Input
            id="confirmation"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Scrivi "${confirmationText}" per confermare`}
            className="mt-2"
            disabled={isDeleting}
            autoComplete="off"
          />
          {inputValue && !isConfirmationValid && (
            <p className="text-sm text-red-500 mt-1">
              Il testo non corrisponde
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmationValid || isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Eliminazione...
              </>
            ) : (
              "Elimina definitivamente"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
