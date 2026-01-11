import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft, Mail } from "lucide-react";

export default function Page() {
  return (
    <div className="w-full px-4">
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl p-8 sm:p-12 max-w-md mx-auto">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-8 space-y-4">
          <Image
            src="/logo-bianco.svg"
            alt="Logo"
            width={80}
            height={80}
            className="drop-shadow-2xl"
          />
          <h1 className="text-3xl sm:text-4xl font-bold text-center text-white">
            Registrazione Completata!
          </h1>
        </div>

        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-400/50 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-white/90 text-base font-medium">
              Grazie per esserti registrato!
            </p>
            <p className="text-white/70 text-sm">
              Ti abbiamo inviato un&apos;email di conferma. Controlla la tua casella di posta e clicca sul link per attivare il tuo account.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-white/60 text-xs bg-white/5 rounded-lg p-3">
            <Mail className="w-4 h-4" />
            <span>Controlla anche la cartella spam</span>
          </div>

          <Link href="/login">
            <Button
              variant="outline"
              className="w-full border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna al Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
