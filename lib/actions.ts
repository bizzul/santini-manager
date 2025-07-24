"use server";

import { createClient } from "@/utils/supabase/server";
import {
  addDomainToVercel,
  removeDomainFromVercelProject,
  validDomainRegex,
} from "@/lib/domains";
import { customAlphabet } from "nanoid";
import { revalidateTag } from "next/cache";
import { withSiteAuth } from "./auth";
import { v4 as uuidv4 } from "uuid";

// Define types for our database tables
interface Site {
  id: string;
  name: string;
  description: string;
  subdomain: string;
  customDomain?: string | null;
  userId: string;
  image?: string;
  imageBlurhash?: string;
  logo?: string;
}

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  7,
);

export const createSite = async (formData: FormData) => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Not authenticated",
    };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const subdomain = formData.get("subdomain") as string;

  // Get the user's organization_id from the tenants table
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (tenantError || !tenant) {
    return {
      error: "User is not associated with any organization",
    };
  }

  try {
    const { data: response, error } = await supabase
      .from("sites")
      .insert({
        name,
        description,
        subdomain,
        organization_id: tenant.organization_id,
      })
      .select()
      .single();

    if (error) throw error;

    revalidateTag(
      `${subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-metadata`,
    );
    return response;
  } catch (error: any) {
    if (error.code === "23505") { // Supabase unique constraint error
      return {
        error: `This subdomain is already taken`,
      };
    } else {
      return {
        error: error.message,
      };
    }
  }
};

export const updateSite = withSiteAuth(
  async (formData: FormData, site: Site, key: string) => {
    const supabase = await createClient();
    const value = formData.get(key) as string;

    try {
      let response;

      if (key === "customDomain") {
        if (value.includes("vercel.app")) {
          return {
            error: "Cannot use vercel.pub subdomain as your custom domain",
          };
        } else if (validDomainRegex.test(value)) {
          const { data, error } = await supabase
            .from("sites")
            .update({ custom_domain: value })
            .eq("id", site.id)
            .select()
            .single();

          if (error) throw error;
          response = data;

          await Promise.all([
            addDomainToVercel(value),
          ]);
        } else if (value === "") {
          const { data, error } = await supabase
            .from("sites")
            .update({ custom_domain: null })
            .eq("id", site.id)
            .select()
            .single();

          if (error) throw error;
          response = data;
        }

        if (site.customDomain && site.customDomain !== value) {
          await removeDomainFromVercelProject(site.customDomain);
        }
      } else if (key === "image" || key === "logo") {
        const file = formData.get(key) as File;
        const fileExt = file.type.split("/")[1];
        const fileName = `${uuidv4()}.${fileExt}`;
        const bucket = key === "image" ? "site-images" : "site-logos";

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from(bucket)
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL for the uploaded file
        const { data: { publicUrl: url } } = supabase
          .storage
          .from(bucket)
          .getPublicUrl(fileName);

        // Delete old file if it exists
        if (site[key as "image" | "logo"]) {
          const oldFileName = site[key as "image" | "logo"]?.split("/").pop();
          if (oldFileName) {
            await supabase
              .storage
              .from(bucket)
              .remove([oldFileName]);
          }
        }

        const { data, error } = await supabase
          .from("sites")
          .update({
            [key]: url,
          })
          .eq("id", site.id)
          .select()
          .single();

        if (error) throw error;
        response = data;
      } else {
        const { data, error } = await supabase
          .from("sites")
          .update({ [key]: value })
          .eq("id", site.id)
          .select()
          .single();

        if (error) throw error;
        response = data;
      }

      revalidateTag(
        `${site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-metadata`,
      );
      if (site.customDomain) {
        revalidateTag(`${site.customDomain}-metadata`);
      }

      return response;
    } catch (error: any) {
      if (error.code === "23505") { // Supabase unique constraint error
        return {
          error: `This ${key} is already taken`,
        };
      } else {
        return {
          error: error.message,
        };
      }
    }
  },
);

export const deleteSite = withSiteAuth(
  async (_: FormData, site: Site) => {
    const supabase = await createClient();

    try {
      const { data: response, error } = await supabase
        .from("sites")
        .delete()
        .eq("id", site.id)
        .select()
        .single();

      if (error) throw error;

      revalidateTag(
        `${site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}-metadata`,
      );
      if (site.customDomain) {
        revalidateTag(`${site.customDomain}-metadata`);
      }

      return response;
    } catch (error: any) {
      return {
        error: error.message,
      };
    }
  },
);
