import { Button } from "@/components/ui/button";
import { CreateSiteForm } from "../form";
import Link from "next/link";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

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
    <div className="max-w-md mx-auto mt-10 p-6 ">
      <div className="flex justify-start items-center align-middle mb-4 gap-2">
        <Link href="/administration/sites">
          <Button variant="outline" size="icon" aria-label="Back to Sites">
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
        <h1 className="text-2xl font-bold  ">Create New Site</h1>
      </div>
      <CreateSiteForm />
    </div>
  );
}
