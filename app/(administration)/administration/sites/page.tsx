import React from "react";
import Link from "next/link";
import { getSites } from "../actions";
import { Button } from "@/components/ui/button";
import { SitesList } from "./SitesList";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { Plus, ArrowLeft, Globe } from "lucide-react";
import Image from "next/image";

// Force dynamic rendering to prevent static generation errors with cookies
export const dynamic = "force-dynamic";

export default async function SitesPage() {
  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  const { role } = userContext;

  // Only allow admin and superadmin access
  if (role !== "admin" && role !== "superadmin") {
    redirect("/");
  }

  const sites = await getSites();

  return (
    <div className="relative z-10 flex flex-col items-center min-h-screen px-4 py-12">
      {/* Header */}
      <div className="w-full max-w-6xl mb-8">
        <div className="flex flex-col items-center justify-center mb-8 space-y-6">
          <Image
            src="/logo-bianco.svg"
            alt="Full Data Manager Logo"
            width={60}
            height={60}
            className="drop-shadow-2xl"
          />
          <div className="flex items-center gap-4">
            <Link href="/administration">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/20 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-center text-white">
            {role === "superadmin"
              ? "Manage All Sites"
              : "My Organization Sites"}
          </h1>
        </div>

        <div className="flex justify-center gap-3 mb-8">
          <Link href="/administration/sites/create">
            <Button
              variant="outline"
              className="border-2 border-white/40 text-white hover:bg-white/30 hover:border-white hover:scale-105 transition-all duration-300 font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Site
            </Button>
          </Link>
        </div>
      </div>

      {/* Sites List */}
      <div className="w-full max-w-6xl">
        <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/10">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {role === "superadmin" ? "All Sites" : "Organization Sites"}
              </h2>
            </div>
          </div>
          <div className="p-6">
            <SitesList sites={sites} />
          </div>
        </div>
      </div>
    </div>
  );
}
