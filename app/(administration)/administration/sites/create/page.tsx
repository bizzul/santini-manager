import { CreateSiteForm } from "../form";

export default function CreateSitePage() {
  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-black">Create New Site</h1>
      <CreateSiteForm />
    </div>
  );
}
