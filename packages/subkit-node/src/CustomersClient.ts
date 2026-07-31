import { z } from 'zod'

import {
  type ServerCustomerInfoRequest,
  type ServerCustomerInfoResponse,
  serverCustomerInfoResponseSchema,
} from '@piparotech/subkit-core'

import type { HttpClient } from './HttpClient.js'
import type { SubKitMutationOptions, SubKitRequestOptions } from './requestOptions.js'

const customerRecordSchema = z.object({ id: z.string(), status: z.string() })
const subjectAliasResultSchema = z.object({ aliasId: z.string(), subjectId: z.string() })
const organizationMembershipResultSchema = z.object({
  membershipId: z.string(),
  roleIds: z.array(z.string()),
  status: z.enum(['active', 'ended']),
})

export type CustomerRecord = z.infer<typeof customerRecordSchema>
export type SubjectAliasResult = z.infer<typeof subjectAliasResultSchema>
export type OrganizationMembershipResult = z.infer<typeof organizationMembershipResultSchema>

export interface UpsertSubjectInput {
  appId?: string
  countryCode?: string | null
  displayName?: string | null
  externalId: string
  kind: 'app_user' | 'organization' | 'service_account'
  locale?: string | null
  reason: string
}

export interface AddSubjectAliasInput {
  alias: string
  appId?: string
  reason: string
  subjectId: string
}

export interface StartOrganizationMembershipInput {
  appId?: string
  effectiveAt: Date
  memberSubjectId: string
  organizationSubjectId: string
  reason: string
  roles?: Array<'admin' | 'trainer'>
}

export type MutateOrganizationMembershipInput =
  | {
      action: 'assign_role' | 'end_role'
      appId?: string
      effectiveAt: Date
      membershipId: string
      organizationSubjectId: string
      reason: string
      role: 'admin' | 'trainer'
    }
  | {
      action: 'end'
      appId?: string
      effectiveAt: Date
      membershipId: string
      organizationSubjectId: string
      reason: string
    }

export interface CreateBillingAccountInput {
  displayName: string
  externalId?: string | null
  kind: 'individual' | 'organization'
  metadataJson?: string
  reason: string
}

interface CustomersClientOptions {
  appId: string | undefined
  http: HttpClient
}

export class CustomersClient {
  private readonly appId: string | undefined
  private readonly http: HttpClient

  constructor(options: CustomersClientOptions) {
    this.appId = options.appId
    this.http = options.http
  }

  addSubjectAlias(
    input: AddSubjectAliasInput,
    options: SubKitMutationOptions,
  ): Promise<SubjectAliasResult> {
    return this.http.post(`/api/server/subjects/${encodeURIComponent(input.subjectId)}/aliases`, {
      ...options,
      body: {
        alias: input.alias,
        appId: resolveAppId(input.appId, this.appId),
        reason: input.reason,
      },
      responseSchema: subjectAliasResultSchema,
    })
  }

  startOrganizationMembership(
    input: StartOrganizationMembershipInput,
    options: SubKitMutationOptions,
  ): Promise<OrganizationMembershipResult> {
    return this.http.post(
      `/api/server/organizations/${encodeURIComponent(input.organizationSubjectId)}/memberships`,
      {
        ...options,
        body: {
          appId: resolveAppId(input.appId, this.appId),
          effectiveAt: input.effectiveAt,
          memberSubjectId: input.memberSubjectId,
          reason: input.reason,
          roles: input.roles ?? [],
        },
        responseSchema: organizationMembershipResultSchema,
      },
    )
  }

  mutateOrganizationMembership(
    input: MutateOrganizationMembershipInput,
    options: SubKitMutationOptions,
  ): Promise<OrganizationMembershipResult> {
    return this.http.patch(
      `/api/server/organizations/${encodeURIComponent(input.organizationSubjectId)}/memberships`,
      {
        ...options,
        body: { ...input, appId: resolveAppId(input.appId, this.appId) },
        responseSchema: organizationMembershipResultSchema,
      },
    )
  }

  upsertSubject(
    input: UpsertSubjectInput,
    options: SubKitMutationOptions,
  ): Promise<CustomerRecord> {
    return this.http.post('/api/server/subjects/upsert', {
      ...options,
      body: { ...input, appId: resolveAppId(input.appId, this.appId) },
      responseSchema: customerRecordSchema,
    })
  }

  createBillingAccount(
    input: CreateBillingAccountInput,
    options: SubKitMutationOptions,
  ): Promise<CustomerRecord> {
    return this.http.post('/api/server/billing-accounts', {
      ...options,
      body: input,
      responseSchema: customerRecordSchema,
    })
  }

  getCustomerInfo(
    input: Omit<ServerCustomerInfoRequest, 'appId'> & { appId?: string },
    options: SubKitRequestOptions = {},
  ): Promise<ServerCustomerInfoResponse> {
    return this.http.post('/api/server/customer-info', {
      ...options,
      body: {
        accessContext: input.accessContext,
        appId: resolveAppId(input.appId, this.appId),
        appUserId: input.appUserId,
        environment: input.environment,
      },
      responseSchema: serverCustomerInfoResponseSchema,
    })
  }
}

function resolveAppId(inputAppId: string | undefined, defaultAppId: string | undefined): string {
  const appId = inputAppId ?? defaultAppId
  if (appId == null || appId.trim() === '') {
    throw new Error('SubKit appId is required. Pass appId to the client or to this request.')
  }
  return appId
}
