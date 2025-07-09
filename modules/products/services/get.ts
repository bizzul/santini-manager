import {
  getNormalizedError,
  ServiceError,
  ServiceResponse,
} from "../../../package/service";
import { prisma } from "../../../prisma-global";
export const get = async (id: number): Promise<ServiceResponse> => {
  try {
    const result = await prisma.product.findUnique({
      where: {
        id: id,
      },
      include: { product_category: true, supplierInfo: true },
    });
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
