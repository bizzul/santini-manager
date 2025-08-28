import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateOrganizationForm } from "./form";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

// Force dynamic rendering to prevent static generation errors with cookies
export const dynamic = "force-dynamic";

export default async function CreateOrganizationPage() {
  const userContext = await getUserContext();

  if (!userContext) {
    redirect("/login");
  }

  const { role } = userContext;

  // Only allow superadmin access
  if (role !== "superadmin") {
    redirect("/administration");
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 ">
      <div className="flex justify-between items-center align-middle mb-4">
        <div className="flex items-center gap-2">
          <Link href="/administration/organizations">
            <Button
              variant="outline"
              size="icon"
              aria-label="Back to Organizations"
            >
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
          <h1 className="text-2xl font-bold ">Create New Organization</h1>
        </div>
      </div>
      <CreateOrganizationForm />
    </div>
  );
}
