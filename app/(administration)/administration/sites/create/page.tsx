import { Button } from "@/components/ui/button";
import { CreateSiteForm } from "../form";
import Link from "next/link";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { ArrowLeft, Globe } from "lucide-react";
import Image from "next/image";

export default async function CreateSitePage() {
  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  const { role } = userContext;

  // Only allow admin and superadmin access
  if (role !== "admin" && role !== "superadmin") {
    redirect("/administration/sites");
  }

  return (
    <div className="relative z-10 flex flex-col items-center min-h-screen px-4 py-12">
      {/* Header */}
      <div className="w-full max-w-md mb-8">
        <div className="flex flex-col items-center justify-center mb-8 space-y-6">
          <Image
            src="/logo-bianco.svg"
            alt="Full Data Manager Logo"
            width={60}
            height={60}
            className="drop-shadow-2xl"
          />
          <Link href="/administration/sites">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/20 transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sites
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-center text-white">
            Create New Site
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-white/10">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Site Details</h2>
          </div>
          <CreateSiteForm />
        </div>
      </div>
    </div>
  );
}
