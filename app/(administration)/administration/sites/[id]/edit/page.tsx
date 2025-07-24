import { getSiteById, getSiteUsers, updateSiteWithUsers } from "../../actions";
import { getOrganizations, getUsers } from "../../../actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import EditSiteForm from "./EditSiteForm";
import { redirect } from "next/navigation";

export default async function EditSitePage({
  params,
}: {
  params: { id: string };
}) {
  const site = await getSiteById(params.id);
  const siteUsers = await getSiteUsers(params.id);
  const organizations = await getOrganizations();
  const users = (await getUsers()).filter((u: any) => u.role !== "admin");

  if (!site) return <div>Site not found.</div>;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="mb-4 flex items-center gap-2">
        <Link href={`/administration/sites/${site.id}`}>
          <Button variant="ghost" size="icon" aria-label="Back to Site Details">
            <svg
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Site {site.name}</h1>
      </div>
      <EditSiteForm
        site={site}
        siteUsers={siteUsers}
        organizations={organizations}
        users={users}
      />
    </div>
  );
}
