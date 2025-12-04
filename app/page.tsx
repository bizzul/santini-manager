import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import TopBar from "@/components/top-bar";
import { createClient } from "@/utils/supabase/server";
import { BarChart3, Target, Network, Zap, Lock, Rocket } from "lucide-react";

// Force dynamic rendering to prevent static generation errors with Supabase
export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  const { data: userData, error: userError } = await supabase
    .from("User")
    .select("*")
    .eq("authId", user.user?.id)
    .single();

  return (
    <>
      <TopBar user={userData} />
      <div className="relative min-h-screen overflow-hidden">
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/video/background_intro.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40 z-0" />

        <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4 py-12">
          {/* Hero Section */}
          <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl p-12 max-w-5xl w-full">
            {/* Logo and Title */}
            <div className="flex flex-col items-center justify-center mb-8 space-y-6">
              <div>
                <Image
                  src="/logo-bianco.svg"
                  alt="Full Data Manager Logo"
                  width={120}
                  height={120}
                  className="drop-shadow-2xl"
                />
              </div>

              <h1 className="text-5xl md:text-6xl font-bold text-center bg-gradient-to-r from-white to-gray-300 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                Full Data Manager
              </h1>
            </div>

            {/* Welcome Message for Logged Users */}
            {userData && (
              <div className="text-center mb-4 space-y-3">
                <p className="text-2xl text-white/90 dark:text-white/90">
                  È bello rivederti
                </p>
                <p className="text-3xl font-bold text-white">
                  {userData?.given_name} {userData?.family_name}
                </p>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4">
              {userData ? (
                <Link href="/sites/select">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white hover:scale-105 shadow-lg hover:shadow-2xl transition-all duration-300 text-lg px-8 py-6 font-semibold"
                  >
                    I miei spazi →
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white hover:scale-105 shadow-lg hover:shadow-2xl transition-all duration-300 text-lg px-8 py-6 font-semibold"
                    >
                      Accedi →
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Description */}
            <div className="text-center mb-10 space-y-4 max-w-3xl mx-auto">
              <p className="text-xl text-white/90 dark:text-white/80 leading-relaxed">
                La soluzione completa per la gestione aziendale moderna
              </p>

              <p>Esplora le funzionalita</p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="group backdrop-blur-sm bg-white/5 dark:bg-white/5 border-2 border-white/30 dark:border-white/20 rounded-xl p-6 hover:bg-white/20 hover:shadow-2xl transition-all duration-300 hover:scale-110 hover:border-white/60 cursor-pointer">
                <div className="mb-4 inline-block">
                  <BarChart3
                    className="w-12 h-12 text-white/80 group-hover:text-white transition-all duration-500 group-hover:scale-125 group-hover:rotate-6"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white transition-all">
                  Dashboard avanzate
                </h3>
                <p className="text-sm text-white/70 group-hover:text-white/90 transition-all">
                  Visualizza dati e KPI in tempo reale con grafici interattivi
                </p>
              </div>

              <div className="group backdrop-blur-sm bg-white/5 dark:bg-white/5 border-2 border-white/30 dark:border-white/20 rounded-xl p-6 hover:bg-white/20 hover:shadow-2xl transition-all duration-300 hover:scale-110 hover:border-white/60 cursor-pointer">
                <div className="mb-4 inline-block">
                  <Target
                    className="w-12 h-12 text-white/80 group-hover:text-white transition-all duration-500 group-hover:scale-125 group-hover:rotate-12"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white transition-all">
                  Gestione progetti
                </h3>
                <p className="text-sm text-white/70 group-hover:text-white/90 transition-all">
                  Organizza task, timeline e risorse in modo efficiente
                </p>
              </div>

              <div className="group backdrop-blur-sm bg-white/5 dark:bg-white/5 border-2 border-white/30 dark:border-white/20 rounded-xl p-6 hover:bg-white/20 hover:shadow-2xl transition-all duration-300 hover:scale-110 hover:border-white/60 cursor-pointer">
                <div className="mb-4 inline-block">
                  <Network
                    className="w-12 h-12 text-white/80 group-hover:text-white transition-all duration-500 group-hover:scale-125 group-hover:rotate-12"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white transition-all">
                  Integrazione completa
                </h3>
                <p className="text-sm text-white/70 group-hover:text-white/90 transition-all">
                  Integra tutti i tuoi dati senza limiti
                </p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-12 pt-8 border-t border-white/20">
              <div className="flex items-center justify-center gap-8 text-sm">
                <div className="flex items-center gap-2 group">
                  <Zap
                    className="w-5 h-5 text-white/60 group-hover:text-yellow-400 transition-all duration-300 group-hover:scale-110"
                    strokeWidth={2}
                  />
                  <span className="text-white/60 group-hover:text-white/80 transition-colors">
                    Potente
                  </span>
                </div>
                <div className="flex items-center gap-2 group">
                  <Lock
                    className="w-5 h-5 text-white/60 group-hover:text-green-400 transition-all duration-300 group-hover:scale-110"
                    strokeWidth={2}
                  />
                  <span className="text-white/60 group-hover:text-white/80 transition-colors">
                    Sicuro
                  </span>
                </div>
                <div className="flex items-center gap-2 group">
                  <Rocket
                    className="w-5 h-5 text-white/60 group-hover:text-blue-400 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12"
                    strokeWidth={2}
                  />
                  <span className="text-white/60 group-hover:text-white/80 transition-colors">
                    Veloce
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
