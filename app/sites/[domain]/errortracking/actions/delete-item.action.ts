"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";

export const removeItem = async (
  formData: { id: number | string },
  domain?: string
) => {
  try {
    const supabase = createServiceClient();
    const id = Number(formData?.id ?? formData);
    if (!id || Number.isNaN(id)) {
      return { message: "ID non valido" };
    }

    // Unlink File records first (FK constraint: File.errortrackingId -> Errortracking.id)
    await supabase
      .from("File")
      .update({ errortrackingId: null })
      .eq("errortrackingId", id);

    const { error } = await supabase
      .from("Errortracking")
      .delete()
      .eq("id", id);

    if (error) {
      return { message: `Errore eliminazione: ${error.message}` };
    }

    revalidatePath("/errortracking");
    if (domain) {
      revalidatePath(`/sites/${domain}/errortracking`);
    }
    return { success: true };
  } catch (e: any) {
    return { message: `Errore: ${e?.message || e}` };
  }
};
