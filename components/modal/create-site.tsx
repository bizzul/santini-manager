"use client";

import { createSite } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import LoadingDots from "@/components/icons/loading-dots";
import { useModal } from "./provider";
import va from "@vercel/analytics";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function CreateSiteModal() {
  const router = useRouter();
  const modal = useModal();
  const { toast } = useToast();

  const [data, setData] = useState({
    name: "",
    subdomain: "",
    description: "",
  });

  useEffect(() => {
    if (data.name) {
      const generatedSubdomain = data.name
        .toLowerCase()
        .trim()
        .replace(/[\W_]+/g, "-");

      setData((prev) => ({
        ...prev,
        subdomain: generatedSubdomain,
      }));
    }
  }, [data.name]);

  return (
    <form
      action={async (data: FormData) =>
        createSite(data).then((res: any) => {
          if (res.error) {
            toast({
              title: "Error",
              description: res.error,
            });
          } else {
            va.track("Created Site");
            const { subdomain } = res;
            router.refresh();
            router.push(`/sites/${subdomain}`);
            modal?.hide();
            toast({
              title: "Success",
              description: `Successfully created site!`,
            });
          }
        })
      }
      className="w-full rounded-md bg-white md:max-w-md md:border md:border-stone-200 md:shadow-sm dark:bg-black dark:md:border-stone-700"
    >
      <div className="relative flex flex-col space-y-4 p-5 md:p-10">
        <h2 className="font-cal text-2xl dark:text-white">Create a new site</h2>

        <div className="flex flex-col space-y-2">
          <label
            htmlFor="name"
            className="text-sm font-medium text-stone-500 dark:text-stone-400"
          >
            Site Name
          </label>
          <input
            name="name"
            type="text"
            placeholder="My Awesome Site"
            autoFocus
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            maxLength={32}
            required
            className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-hidden focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
          />
        </div>

        <div className="flex flex-col space-y-2">
          <label
            htmlFor="subdomain"
            className="text-sm font-medium text-stone-500"
          >
            Subdomain
          </label>
          <div className="flex w-full max-w-md">
            <input
              name="subdomain"
              type="text"
              placeholder="subdomain"
              value={data.subdomain}
              onChange={(e) => {
                const value = e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9\-]/g, "");
                setData({ ...data, subdomain: value });
              }}
              autoCapitalize="off"
              pattern="[a-z0-9\-]+" // only allow lowercase letters, numbers, and dashes
              maxLength={32}
              required
              className="w-full rounded-l-lg border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-hidden focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
            />
            <div className="flex items-center rounded-r-lg border border-l-0 border-stone-200 bg-stone-100 px-3 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400">
              .{process.env.NEXT_PUBLIC_ROOT_DOMAIN}
            </div>
          </div>
          {data.subdomain && (
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Your site will be available at: {data.subdomain}.
              {process.env.NEXT_PUBLIC_ROOT_DOMAIN}
            </p>
          )}
        </div>

        <div className="flex flex-col space-y-2">
          <label
            htmlFor="description"
            className="text-sm font-medium text-stone-500"
          >
            Description
          </label>
          <textarea
            name="description"
            placeholder="Description about why my site is so awesome"
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            maxLength={140}
            rows={3}
            className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black  focus:outline-hidden focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
          />
        </div>
      </div>
      <div className="flex items-center justify-end rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 md:px-10 dark:border-stone-700 dark:bg-stone-800">
        <CreateSiteFormButton />
      </div>
    </form>
  );
}
function CreateSiteFormButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className={cn(
        "flex h-10 w-full items-center justify-center space-x-2 rounded-md border text-sm transition-all focus:outline-hidden",
        pending
          ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
          : "border-black bg-black text-white hover:bg-white hover:text-black dark:border-stone-700 dark:hover:border-stone-200 dark:hover:bg-black dark:hover:text-white dark:active:bg-stone-800"
      )}
      disabled={pending}
    >
      {pending ? <LoadingDots color="#808080" /> : <p>Create Site</p>}
    </button>
  );
}
