import { requireAuth } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Home, Settings, LogOut } from "lucide-react";

export async function SelectTopBar() {
  const userContext = await requireAuth();
  const userRole = userContext.role;

  return (
    <div className="relative z-20 backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/20 hover:scale-105 transition-all duration-300"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            {(userRole === "superadmin" || userRole === "admin") && (
              <Link href="/administration">
                <Button
                  variant="outline"
                  className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white hover:scale-105 shadow-lg hover:shadow-2xl transition-all duration-300 font-semibold"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Amministrazione
                </Button>
              </Link>
            )}

            <Link href="/logout">
              <Button
                variant="outline"
                className="border-2 border-white/40 text-white hover:bg-red-500/30 hover:border-red-400 hover:scale-105 shadow-lg hover:shadow-2xl transition-all duration-300 font-semibold"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SelectTopBarSkeleton() {
  return (
    <div className="relative z-20 backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="h-10 w-24 bg-white/20 rounded animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-10 w-36 bg-white/20 rounded animate-pulse" />
            <div className="h-10 w-24 bg-white/20 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

