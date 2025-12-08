import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getOrganizations, getSites } from "../actions";
import { CreateUserForm } from "./form";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import Image from "next/image";

// Force dynamic rendering to prevent static generation errors with cookies
export const dynamic = "force-dynamic";

export default async function CreateUserPage() {
  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  const { role } = userContext;

  // Only allow admin and superadmin access
  if (role !== "admin" && role !== "superadmin") {
    redirect("/");
  }

  // Fetch both organizations and sites
  const [organizations, sites] = await Promise.all([
    getOrganizations(),
    getSites(),
  ]);

  return (
    <div className="relative z-10 flex flex-col items-center min-h-screen px-4 py-12">
      {/* Header */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex flex-col items-center justify-center mb-8 space-y-6">
          <Image
            src="/logo-bianco.svg"
            alt="Full Data Manager Logo"
            width={60}
            height={60}
            className="drop-shadow-2xl"
          />
          <Link href="/administration/users">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/20 transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna agli Utenti
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-center text-white">
            Crea Nuovo Utente
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-2xl">
        <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-white/10">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Dettagli Utente</h2>
          </div>
          <CreateUserForm 
            organizations={organizations} 
            sites={sites || []}
            userRole={role} 
          />
        </div>
      </div>
    </div>
  );
}
