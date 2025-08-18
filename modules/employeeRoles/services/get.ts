import {
  getNormalizedError,
  ServiceError,
  ServiceResponse,
} from "../../../package/service";
import { createClient } from "../../../utils/supabase/client";

export const get = async (id: number): Promise<ServiceResponse> => {
  try {
    const supabase = createClient();
    
    const { data: result, error } = await supabase
      .from("roles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    if (result) {
      //[R200] Reading Found and returned
      return new ServiceResponse({
        success: true,
        status: 200,
        payload: result,
      });
    } else {
      //[!R400] Reading id not found
      return new ServiceResponse({
        success: false,
        status: 401,
        error_code: ServiceError.ID_NOT_FOUND,
      });
    }
  } catch (e: any) {
    return getNormalizedError(e);
  }
};
