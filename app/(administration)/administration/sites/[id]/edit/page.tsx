import { getSiteById, getSiteUsers, updateSiteWithUsers } from "../../actions";
import { getOrganizations, getUsers } from "../../../actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import EditSiteForm from "./EditSiteForm";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { ArrowLeft, Globe } from "lucide-react";
import Image from "next/image";

export default async function EditSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  const { role } = userContext;

  // Only allow superadmin access
  if (role !== "superadmin") {
    redirect("/administration/sites");
  }

  const site = await getSiteById(id);
  const siteUsers = await getSiteUsers(id);
  const organizations = await getOrganizations();
  const users = (await getUsers()).filter((u: any) => u.role !== "admin");

  if (!site)
    return (
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-12 text-center">
          <p className="text-white text-lg">Site not found.</p>
        </div>
      </div>
    );

  return (
    <div className="relative z-10 flex flex-col items-center min-h-screen px-4 py-12">
      {/* Header */}
      <div className="w-full max-w-4xl mb-8">
        <div className="flex flex-col items-center justify-center mb-8 space-y-6">
          <Image
            src="/logo-bianco.svg"
            alt="Full Data Manager Logo"
            width={60}
            height={60}
            className="drop-shadow-2xl"
          />
          <Link href={`/administration/sites/${site.id}`}>
            <Button
              variant="ghost"
              className="text-white hover:bg-white/20 transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Site Details
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-center text-white">
            Edit Site {site.name}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-4xl">
        <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-white/10">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Edit Site Details</h2>
          </div>
          <EditSiteForm
            site={site}
            siteUsers={siteUsers}
            organizations={organizations}
            users={users}
            userRole={userContext?.role}
          />
        </div>
      </div>
    </div>
  );
}
