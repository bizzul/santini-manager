import Form from "@/components/form";
import { redirect } from "next/navigation";
// import { editUser } from "@/lib/actions";
import { createClient } from "@/utils/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: userData } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", user.id)
    .single();

  const handleSubmit = async (formData: FormData) => {
    "use server";
    console.log(formData);
  };
  return (
    <div className="flex max-w-screen-xl flex-col space-y-12 p-8">
      <div className="flex flex-col space-y-6">
        <h1 className="font-cal text-3xl font-bold dark:text-white">
          Settings
        </h1>
        <Form
          title="Name"
          description="Your name on this app."
          helpText="Please use 32 characters maximum."
          inputAttrs={{
            name: "name",
            type: "text",
            defaultValue: user.user_metadata?.name || user.email!,
            placeholder: "Brendon Urie",
            maxLength: 32,
          }}
          handleSubmit={handleSubmit}
        />
        <Form
          title="Email"
          description="Your email on this app."
          helpText="Please enter a valid email."
          inputAttrs={{
            name: "email",
            type: "email",
            defaultValue: user.email!,
            placeholder: "panic@thedis.co",
          }}
          handleSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
