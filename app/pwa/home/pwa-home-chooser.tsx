"use client";

import { useFormStatus } from "react-dom";
import Image from "next/image";
import { Clock, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PwaHomeMode } from "@/lib/pwa/home-mode";
import { setPwaHomeMode } from "./actions";

function ChoiceCard({
  mode,
  current,
  title,
  description,
  icon: Icon,
}: {
  mode: PwaHomeMode;
  current?: PwaHomeMode;
  title: string;
  description: string;
  icon: typeof LayoutDashboard;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      formAction={setPwaHomeMode.bind(null, mode)}
      className={cn(
        "min-h-44 rounded-2xl border-2 p-6 text-left backdrop-blur-xl transition",
        "bg-white/10 hover:bg-white/20",
        current === mode
          ? "border-white"
          : "border-white/20 hover:border-white/50",
        pending && "opacity-60",
      )}
    >
      <Icon className="mb-4 h-8 w-8 text-white" />
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-white/70">{description}</p>
    </button>
  );
}

function PendingHint() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <p className="col-span-full mt-2 text-center text-sm text-white/60">
      Salvataggio in corso…
    </p>
  );
}

export function PwaHomeChooser({
  current,
}: {
  current?: PwaHomeMode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950" />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 flex flex-col items-center space-y-4">
          <Image
            src="/logo-bianco.svg"
            alt="Full Data Manager"
            width={72}
            height={72}
            className="drop-shadow-2xl"
          />
          <h1 className="text-center text-3xl font-bold text-white sm:text-4xl">
            Come vuoi aprire l&apos;app?
          </h1>
          <p className="max-w-md text-center text-sm text-white/70 sm:text-base">
            Puoi cambiare questa scelta in qualsiasi momento dal menu utente
            o da &quot;Cambia vista&quot;.
          </p>
        </div>

        <form className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
          <ChoiceCard
            mode="manager"
            current={current}
            icon={LayoutDashboard}
            title="Manager completo"
            description="Dashboard, progetti, anagrafiche, documenti e foto."
          />
          <ChoiceCard
            mode="ore"
            current={current}
            icon={Clock}
            title="Solo ore"
            description="Solo la pagina del time tracking, senza il resto del manager."
          />
          <PendingHint />
        </form>
      </div>
    </div>
  );
}
