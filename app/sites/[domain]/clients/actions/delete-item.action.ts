"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export const removeItem = async (formData: any) => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("Client")
      .delete()
      .eq("id", Number(formData.id));

    if (error) {
      return { message: `Failed to delete item: ${error.message}` };
    }
    return revalidatePath("/clients");
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};

export const batchDeleteClients = async (ids: number[], domain?: string) => {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("Client")
      .delete()
      .in("id", ids);

    if (error) {
      return {
        success: false,
        message: `Errore durante l'eliminazione: ${error.message}`,
      };
    }

    if (domain) {
      revalidatePath(`/sites/${domain}/clients`);
    } else {
      revalidatePath("/clients");
    }

    return { success: true, deleted: ids.length };
  } catch (e) {
    return { success: false, message: `Errore durante l'eliminazione: ${e}` };
  }
};
