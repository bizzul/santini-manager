import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldX, Home, ArrowLeft } from "lucide-react";
import Image from "next/image";

// Force dynamic rendering to prevent static generation errors with cookies
export const dynamic = "force-dynamic";

export default async function UnauthorizedPage() {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
      <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-12 max-w-lg w-full text-center">
        <div className="flex flex-col items-center space-y-6">
          <Image
            src="/logo-bianco.svg"
            alt="Full Data Manager Logo"
            width={60}
            height={60}
            className="drop-shadow-2xl"
          />
          
          <div className="p-4 rounded-full bg-red-500/20 border border-red-400/50">
            <ShieldX className="h-12 w-12 text-red-300" />
          </div>

          <h1 className="text-4xl font-bold text-white">Unauthorized Access</h1>
          
          <p className="text-white/70 text-lg">
            You don&apos;t have permission to access this area. Please contact
            your administrator.
          </p>

          <div className="flex gap-4 pt-4">
            <Link href="/">
              <Button
                variant="outline"
                className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300"
              >
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </Link>
            <Link href="/sites/select">
              <Button
                variant="outline"
                className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                My Spaces
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
