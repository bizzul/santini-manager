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
      .from("product_category")
      .select("*", { count: "exact" });

    if (filters.q) {
      query = query.ilike("name", `%${filters.q}%`);
    }

    // Apply pagination
    query = query.range(pagination.skip, pagination.skip + pagination.take - 1);

    const { data: items, error, count } = await query;

    if (error) {
      throw error;
    }

    const items_total = count || 0;

    return new ServiceResponse({
      success: true,
      status: 200,
      payload: {
        query: filters.q,
        //Returning readable pagination results
        pagination: ReqPaginator.forResponse({
          pagination: pagination,
          items_in_page: items?.length || 0,
          items_total: items_total,
        }),
        //The found items
        items: items || [],
      },
    });
  } catch (e: any) {
    return getNormalizedError(e);
  }
};
