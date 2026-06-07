import { toast as radixToast } from "@/components/ui/use-toast";

type ToastOptions = {
  description?: string;
};

/** Sonner-compatible API backed by the canonical Radix toast system. */
export const toast = {
  success(title: string | undefined, options?: ToastOptions) {
    return radixToast({ title: title ?? "Operazione completata", description: options?.description });
  },
  error(title: string | undefined, options?: ToastOptions) {
    return radixToast({
      title: title ?? "Errore",
      description: options?.description,
      variant: "destructive",
    });
  },
  info(title: string | undefined, options?: ToastOptions) {
    return radixToast({ title: title ?? "", description: options?.description });
  },
  warning(title: string | undefined, options?: ToastOptions) {
    return radixToast({ title: title ?? "", description: options?.description });
  },
  message(title: string | undefined, options?: ToastOptions) {
    return radixToast({ title: title ?? "", description: options?.description });
  },
};
