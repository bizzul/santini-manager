import {
  NextApiRequest,
  NextApiResponse,
  NormalizeError,
} from "next/dist/shared/lib/utils";
import { ZodTypeAny } from "zod";

export class ServiceResponse {
  success: boolean = false;
  status: number = 400;
  payload: any | undefined = undefined;
  error_code: string | undefined = undefined;
  errors: any[];
  stack: string | Error | undefined = undefined;
  constructor(values: ServiceResponseT) {
    this.success = values.success;
    this.status = values.status;
    this.payload = values.payload;
    this.error_code = values.error_code;
    this.errors = values.errors;
    this.stack = values.stack;
  }
  nextApiResponse = (req: NextApiRequest, res: NextApiResponse) => {
    return res.status(this.status).json(
      this.success
        ? this.payload
        : {
            error_code: this.error_code,
            error: this.errors,
            stack: this.stack,
          }
    );
  };
}

export type ServiceResponseT = {
  success: boolean;
  status: number;
  payload?: any;
  error_code?: ServiceError;
  errors?: any;
  stack?: string | Error;
};

export enum ServiceError {
  GENERIC = "SERVICE_GENERIC_ERROR",
  DB = "SERVICE_DB_ERROR",
  VALIDATION_FAILED = "SERVICE_VALIDATION_FAILED",
  UNIQUE_CONSTRAINT_FAILED = "SERVICE_UNIQUE_CONSTRAINT_FAILED",
  ID_NOT_FOUND = "ID_NOT_FOUND",
}

/**
 * Returns an errored response based on a failed zod validated result
 * @param v ZodValidationResult
 * @returns ServiceResponse
 */
export const getValidationError = (v: any) => {
  return new ServiceResponse({
    success: false,
    status: 401,
    error_code: ServiceError.VALIDATION_FAILED,
    errors: v.error.issues,
  });
};

/**
 * Returns an errored response object based on default Error object
 * @param e Error
 * @returns ServiceResponse
 */
export const getNormalizedError = (e: any) => {
  //The given error object is a string
  // console.log(e)
  if (e instanceof Error) {
    return new ServiceResponse({
      success: false,
      status: 400,
      error_code: ServiceError.GENERIC,
      stack: e.toString(),
    });
  }
  return e;
};
