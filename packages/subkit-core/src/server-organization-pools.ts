import { z } from 'zod'

const identifier = z.string().trim().min(1).max(512)

export const serverOrganizationPoolListRequestSchema = z
  .object({
    appId: identifier,
    organizationSubjectId: identifier,
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().min(1).max(2048).optional(),
  })
  .strict()
export type ServerOrganizationPoolListRequest = z.infer<
  typeof serverOrganizationPoolListRequestSchema
>

/**
 * One observed page of the pools an active organization licensee holds. It is not a
 * reservation guarantee and names no payer or member. Read every page before deciding.
 */
export const serverOrganizationPoolListResponseSchema = z
  .object({
    appId: identifier,
    organizationSubjectId: identifier,
    environment: z.enum(['sandbox', 'production']).nullable(),
    checkedAt: z.iso.datetime(),
    items: z.array(
      z
        .object({
          accessSourceId: identifier,
          poolId: identifier,
          poolKey: z.string().min(1),
          active: z.boolean(),
          sourceState: z.string().min(1),
          sourceVerificationState: z.string().min(1),
          sourceValidFrom: z.iso.datetime(),
          sourceValidUntil: z.iso.datetime().nullable(),
          poolState: z.string().min(1),
          poolValidFrom: z.iso.datetime(),
          poolValidUntil: z.iso.datetime().nullable(),
          entitlementKeys: z.array(z.string().min(1)),
          capacity: z.number().int().nonnegative().nullable(),
          used: z.number().int().nonnegative(),
          reserved: z.number().int().nonnegative(),
          available: z.number().int().nullable(),
        })
        .strict(),
    ),
    nextCursor: z.string().min(1).max(2048).nullable(),
  })
  .strict()
export type ServerOrganizationPoolListResponse = z.infer<
  typeof serverOrganizationPoolListResponseSchema
>
export type ServerOrganizationPool = ServerOrganizationPoolListResponse['items'][number]
