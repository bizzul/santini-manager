import {
  getNormalizedError,
  getValidationError,
  ServiceError,
  ServiceResponse,
} from "../../../package/service";
import { ReqPaginator } from "../../../package/utils/api/req-paginator";
import { createClient } from "../../../utils/supabase/client";

export const list = async (
  pagination: any,
  filters: any,
): Promise<ServiceResponse> => {
  try {
    const supabase = createClient();

    let query = supabase
      .from("Errortracking")
      .select("*, files(*), supplier(*), task(*), user(*)");

    if (filters.q) {
      // Use OR logic for multiple field search
      query = query.or(
        `supplier.name.ilike.%${filters.q}%,error_category.ilike.%${filters.q}%`,
      );
    }

    // Get total count first
    const { count: items_total } = await supabase
      .from("Errortracking")
      .select("*", { count: "exact", head: true });

    // Apply pagination to main query
    query = query.range(pagination.skip, pagination.skip + pagination.take - 1);

    const { data: items, error } = await query;

    if (error) {
      throw error;
    }

    return new ServiceResponse({
      success: true,
      status: 200,
      payload: {
        query: filters.q,
        //Returning readable pagination results
        pagination: ReqPaginator.forResponse({
          pagination: pagination,
          items_in_page: items?.length || 0,
          items_total: items_total || 0,
        }),
        //The found items
        items: items || [],
      },
    });
  } catch (e: any) {
    return getNormalizedError(e);
  }
};
