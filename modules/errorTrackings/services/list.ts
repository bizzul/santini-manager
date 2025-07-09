import {
  getNormalizedError,
  getValidationError,
  ServiceError,
  ServiceResponse,
} from "../../../package/service";
import { ReqPaginator } from "../../../package/utils/api/req-paginator";
import { prisma } from "../../../prisma-global";
export const list = async (
  pagination: any,
  filters: any
): Promise<ServiceResponse> => {
  try {
    let whereQ = undefined;
    if (filters.q) {
      whereQ = {
        OR: [
          {
            supplier: {
              name: {
                contains: filters.q,
                mode: "insensitive",
              },
            },
          },
          {
            error_category: {
              contains: filters.q,
              mode: "insensitive",
            },
          },
        ],
      };
    }
    const [items, items_total] = await prisma.$transaction([
      prisma.errortracking.findMany({
        skip: pagination.skip,
        take: pagination.take,
        //@ts-ignore
        where: whereQ,
        include: {
          files: true,
          supplier: true,
          task: true,
          user: true,
        },
      }),
      prisma.errortracking.count({
        //@ts-ignore
        where: whereQ,
      }),
    ]);

    return new ServiceResponse({
      success: true,
      status: 200,
      payload: {
        query: filters.q,
        //Returning readable pagination results
        pagination: ReqPaginator.forResponse({
          pagination: pagination,
          items_in_page: items.length,
          items_total: items_total,
        }),
        //The found items
        items: items,
      },
    });
  } catch (e: any) {
    return getNormalizedError(e);
  }
};
