import { z } from "zod";

/**
 * Auth0 user creation schema
 */
export const validation = z.object({
  individualTitle: z.string(),
  businessName: z.string().optional(),
  individualFirstName: z.string().optional(),
  individualLastName: z.string().optional(),
  address: z.string().optional(),
  addressExtra: z.string().optional(),
  city: z.string().optional(),
  clientType: z.string().optional(),
  countryCode: z.string().optional(),
  email: z.string().optional(),
  landlinePhone: z.string().optional(),
  clientLanguage: z.string().optional(),
  mobilePhone: z.string().optional(),
  zipCode: z.preprocess((val) => Number(val), z.number().optional()),
  CONSTRUCTION_SITE_address: z.string().optional(),
  CONSTRUCTION_SITE_addressExtra: z.string().optional(),
  CONSTRUCTION_SITE_countryCode: z.string().optional(),
  CONSTRUCTION_SITE_city: z.string().optional(),
  CONSTRUCTION_SITE_email: z.string().optional(),
  CONSTRUCTION_SITE_lastName: z.string().optional(),
  CONSTRUCTION_SITE_latitude: z.preprocess(
    (val) => Number(val),
    z.number().optional()
  ),
  CONSTRUCTION_SITE_longitude: z.preprocess(
    (val) => Number(val),
    z.number().optional()
  ),
  CONSTRUCTION_SITE_mobile: z.string().optional(),
  CONSTRUCTION_SITE_name: z.string().optional(),
  CONSTRUCTION_SITE_phone: z.string().optional(),
  CONSTRUCTION_SITE_typeDetail: z.string().optional(),
  CONSTRUCTION_SITE_zipCode: z.preprocess(
    (val) => Number(val),
    z.number().optional()
  ),
  OTHER_address: z.string().optional(),
  OTHER_addressExtra: z.string().optional(),
  OTHER_city: z.string().optional(),
  OTHER_countryCode: z.string().optional(),
  OTHER_email: z.string().optional(),
  OTHER_lastName: z.string().optional(),
  OTHER_latitude: z.preprocess((val) => Number(val), z.number()).optional(),
  OTHER_longitude: z.preprocess((val) => Number(val), z.number()).optional(),
  OTHER_mobile: z.string().optional(),
  OTHER_name: z.string().optional(),
  OTHER_phone: z.string().optional(),
  OTHER_sameAsMain: z.boolean().optional(),
  OTHER_typeDetail: z.string().optional(),
  OTHER_zipCode: z.preprocess((val) => Number(val), z.number().optional()),
});
