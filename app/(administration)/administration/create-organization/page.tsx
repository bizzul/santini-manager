import { CreateOrganizationForm } from "./form";

export default function CreateOrganizationPage() {
  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-black">
        Create New Organization
      </h1>
      <CreateOrganizationForm />
    </div>
  );
}
