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
            name: {
              contains: filters.q,
              mode: "insensitive",
            },
          },
          {
            type: {
              contains: filters.q,
              mode: "insensitive",
            },
          },
        ],
      };
    }
    const [items, items_total] = await prisma.$transaction([
      prisma.sellProduct.findMany({
        skip: pagination.skip,
        take: pagination.take,
        //@ts-ignore
        where: whereQ,
      }),
      prisma.sellProduct.count({
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
