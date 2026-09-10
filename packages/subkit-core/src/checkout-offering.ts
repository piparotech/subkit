import { z } from 'zod'

import { runtimePlanEntitlementSchema, runtimePlanPoolSchema } from './schemas.js'

export const directCheckoutAudienceSchema = z.enum(['individual', 'organization'])

export const directCheckoutPackageSchema = z
  .strictObject({
    identifier: z.string().min(1),
    selectionRevision: z.string().regex(/^[a-f0-9]{64}$/),
    label: z.string().min(1),
    amountMicros: z.number().int().nonnegative(),
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    billingPeriodIso: z.iso.duration(),
    audience: directCheckoutAudienceSchema,
    entitlements: z.array(runtimePlanEntitlementSchema),
    pools: z.array(runtimePlanPoolSchema),
  })
  .superRefine((value, context) => {
    for (const field of ['pools', 'entitlements'] as const) {
      if (new Set(value[field].map((item) => item.key)).size !== value[field].length) {
        context.addIssue({ code: 'custom', message: `Duplicate ${field} keys`, path: [field] })
      }
    }
  })

export const serverDirectCheckoutOfferingRequestSchema = z
  .object({
    appId: z.string().trim().min(1),
    offeringIdentifier: z.string().trim().min(1),
  })
  .strict()

export const serverDirectCheckoutOfferingResponseSchema = z
  .object({
    environment: z.enum(['sandbox', 'production']),
    identifier: z.string().min(1),
    packages: z.array(directCheckoutPackageSchema),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.packages.map((item) => item.identifier)).size !== value.packages.length) {
      context.addIssue({
        code: 'custom',
        message: 'Duplicate checkout package identifiers',
        path: ['packages'],
      })
    }
  })

export type ServerDirectCheckoutOfferingRequest = z.infer<
  typeof serverDirectCheckoutOfferingRequestSchema
>
export type ServerDirectCheckoutOfferingResponse = z.infer<
  typeof serverDirectCheckoutOfferingResponseSchema
>
