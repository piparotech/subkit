import { z } from 'zod'

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
    packages: z.array(
      z
        .object({
          identifier: z.string().min(1),
          label: z.string().min(1),
          amountMicros: z.number().int().nonnegative(),
          currencyCode: z.string().regex(/^[A-Z]{3}$/),
          billingPeriodIso: z.string().min(1),
        })
        .strict(),
    ),
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
