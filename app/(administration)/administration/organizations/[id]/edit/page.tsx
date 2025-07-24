import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { getOrganizationById, updateOrganization } from "../../../actions";

interface EditOrganizationPageProps {
  params: { id: string };
}

export default async function EditOrganizationPage({
  params,
}: EditOrganizationPageProps) {
  const { id } = params;
  const organization = await getOrganizationById(id);
  if (!organization) return notFound();

  async function handleSubmit(formData: FormData) {
    "use server";
    const updates = {
      name: formData.get("name"),
      code: formData.get("code"),
    };
    await updateOrganization(id, updates);
    redirect(`/administration/organizations/${id}`);
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="mb-4">
        <Link href={`/administration/organizations/${id}`}>
          <Button variant="ghost" className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Details
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Edit Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4 max-w-lg">
            <div>
              <label className="block font-semibold mb-1" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={organization.name}
                className="w-full border rounded-sm px-3 py-2"
                required
              />
            </div>
            {/* <div>
              <label className="block font-semibold mb-1" htmlFor="domain">
                Domain
              </label>
              <input
                id="domain"
                name="domain"
                type="text"
                defaultValue={organization.domain || ""}
                className="w-full border rounded-sm px-3 py-2"
              />
            </div> */}
            <div>
              <label className="block font-semibold mb-1" htmlFor="code">
                Code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                defaultValue={organization.code || ""}
                className="w-full border rounded-sm px-3 py-2"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="default">
                Save
              </Button>
              <Link href={`/administration/organizations/${id}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
