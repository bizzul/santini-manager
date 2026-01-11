import { CompleteSignupForm } from "@/components/complete-signup";
import { Suspense } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function CompleteSignupPage() {
  return (
    <div className="w-full px-4">
      <Suspense
        fallback={
          <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl p-8 sm:p-12 max-w-md mx-auto">
            <div className="flex flex-col items-center justify-center mb-8 space-y-4">
              <Image
                src="/logo-bianco.svg"
                alt="Logo"
                width={80}
                height={80}
                className="drop-shadow-2xl"
              />
              <h1 className="text-3xl sm:text-4xl font-bold text-center text-white">
                Caricamento...
              </h1>
            </div>
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
        }
      >
        <CompleteSignupForm />
      </Suspense>
    </div>
  );
}
