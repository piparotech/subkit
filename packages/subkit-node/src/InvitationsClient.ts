import { z } from 'zod'

import {
  type ServerInvitationClaimRequest,
  type ServerInvitationClaimStatusRequest,
  type ServerInvitationDeliveryRequest,
  type ServerInvitationFormatReadRequest,
  type ServerInvitationFormatUpdateRequest,
  type ServerInvitationIssueRequestInput,
  type ServerInvitationPreviewRequest,
  type ServerInvitationRotateRequest,
  type ServerOrganizationInvitationListRequest,
  serverInvitationClaimRequestSchema,
  serverInvitationClaimResponseSchema,
  serverInvitationClaimStatusRequestSchema,
  serverInvitationClaimStatusResponseSchema,
  serverInvitationDeliveryRequestSchema,
  serverInvitationDeliveryResponseSchema,
  serverInvitationFormatReadRequestSchema,
  serverInvitationFormatResponseSchema,
  serverInvitationFormatUpdateRequestSchema,
  serverInvitationIssueRequestSchema,
  serverInvitationPreviewRequestSchema,
  serverInvitationPreviewResponseSchema,
  serverInvitationRotateRequestSchema,
  serverOrganizationInvitationListRequestSchema,
  serverOrganizationInvitationListResponseSchema,
} from '@piparotech/subkit-core'

import type { HttpClient } from './HttpClient.js'
import { SubKitApiError } from './errors.js'
import type { SubKitMutationOptions, SubKitRequestOptions } from './requestOptions.js'

type AppInput<T extends { appId: string }> = Omit<T, 'appId'> & { appId?: string }
export type IssueInvitationInput = AppInput<ServerInvitationIssueRequestInput>
export type GetInvitationDeliveryInput = AppInput<ServerInvitationDeliveryRequest>
export type RotateInvitationCodeInput = AppInput<ServerInvitationRotateRequest>
export type PreviewInvitationInput = AppInput<ServerInvitationPreviewRequest>
export type ClaimInvitationInput = AppInput<ServerInvitationClaimRequest>
export type GetInvitationClaimStatusInput = AppInput<ServerInvitationClaimStatusRequest>
export type GetInvitationFormatInput = AppInput<ServerInvitationFormatReadRequest>
export type UpdateInvitationFormatInput = AppInput<ServerInvitationFormatUpdateRequest>
export type ListOrganizationInvitationsInput = AppInput<ServerOrganizationInvitationListRequest>

type ReservationIdentity = {
  appId: string
  reservationId: string
  poolId: string
  accessSourceId: string
}

export class InvitationsClient {
  private readonly options: { appId: string | undefined; http: HttpClient }

  constructor(options: { appId: string | undefined; http: HttpClient }) {
    this.options = options
  }

  issue(input: IssueInvitationInput, options: SubKitMutationOptions) {
    requireMutationKey(options)
    const request = parseInvitationInput(serverInvitationIssueRequestSchema, this.withApp(input))
    return this.options.http
      .post('/api/server/access-invitations', {
        ...options,
        body: request,
        responseSchema: serverInvitationDeliveryResponseSchema.refine(
          (result) =>
            result.appId === request.appId &&
            result.poolId === request.poolId &&
            result.quantity === request.quantity &&
            result.codeVersion === 1 &&
            (request.expiresAt === undefined ||
              Date.parse(result.expiresAt) === Date.parse(request.expiresAt)),
          { message: 'Invitation does not match the requested issuance' },
        ),
      })
      .catch(redactInvitationError)
  }

  getDelivery(input: GetInvitationDeliveryInput, options: SubKitMutationOptions) {
    requireMutationKey(options)
    const request = parseInvitationInput(serverInvitationDeliveryRequestSchema, this.withApp(input))
    return this.options.http
      .post('/api/server/access-invitations/delivery', {
        ...options,
        body: request,
        responseSchema: serverInvitationDeliveryResponseSchema.refine(
          (result) =>
            sameReservation(result, request) && result.codeVersion === request.expectedCodeVersion,
          { message: 'Invitation delivery does not match the requested reservation and version' },
        ),
      })
      .catch(redactInvitationError)
  }

  rotateCode(input: RotateInvitationCodeInput, options: SubKitMutationOptions) {
    requireMutationKey(options)
    const request = parseInvitationInput(serverInvitationRotateRequestSchema, this.withApp(input))
    return this.options.http
      .post('/api/server/access-invitations/rotate', {
        ...options,
        body: request,
        responseSchema: serverInvitationDeliveryResponseSchema.refine(
          (result) =>
            sameReservation(result, request) &&
            result.codeVersion === request.expectedCodeVersion + 1,
          {
            message:
              'Invitation rotation does not match the requested reservation and next version',
          },
        ),
      })
      .catch(redactInvitationError)
  }

  preview(input: PreviewInvitationInput, options: SubKitRequestOptions = {}) {
    const request = parseInvitationInput(serverInvitationPreviewRequestSchema, this.withApp(input))
    return this.options.http
      .post('/api/server/access-invitations/preview', {
        ...options,
        body: request,
        responseSchema: serverInvitationPreviewResponseSchema.refine(
          (result) => result.appId === request.appId && result.subjectId === request.subjectId,
          { message: 'Invitation preview does not match the requested app and recipient' },
        ),
      })
      .catch(redactInvitationError)
  }

  claim(input: ClaimInvitationInput, options: SubKitMutationOptions) {
    requireMutationKey(options)
    const request = parseInvitationInput(serverInvitationClaimRequestSchema, this.withApp(input))
    return this.options.http
      .post('/api/server/access-invitations/claim', {
        ...options,
        body: request,
        responseSchema: serverInvitationClaimResponseSchema.refine(
          (result) =>
            sameReservation(result, request) &&
            result.subjectId === request.subjectId &&
            result.codeVersion === request.codeVersion,
          {
            message:
              'Invitation claim does not match the reviewed reservation, recipient and version',
          },
        ),
      })
      .catch(redactInvitationError)
  }

  getClaimStatus(input: GetInvitationClaimStatusInput, options: SubKitRequestOptions = {}) {
    const request = parseInvitationInput(
      serverInvitationClaimStatusRequestSchema,
      this.withApp(input),
    )
    return this.options.http
      .post('/api/server/access-invitations/claim/status', {
        ...options,
        body: request,
        responseSchema: serverInvitationClaimStatusResponseSchema.refine(
          (result) =>
            sameReservation(result, request) &&
            result.subjectId === request.subjectId &&
            result.codeVersion === request.codeVersion,
          {
            message:
              'Invitation claim status does not match the original reservation, recipient and version',
          },
        ),
      })
      .catch(redactInvitationError)
  }

  getFormat(input: GetInvitationFormatInput = {}, options: SubKitRequestOptions = {}) {
    const request = parseInvitationInput(
      serverInvitationFormatReadRequestSchema,
      this.withApp(input),
    )
    const query = new URLSearchParams({ appId: request.appId })
    return this.options.http
      .get(`/api/server/invitation-code-format?${query}`, {
        ...options,
        responseSchema: serverInvitationFormatResponseSchema.refine(
          (result) => result.appId === request.appId,
          { message: 'Invitation format does not match the requested app' },
        ),
      })
      .catch(redactInvitationError)
  }

  updateFormat(input: UpdateInvitationFormatInput, options: SubKitMutationOptions) {
    requireMutationKey(options)
    const request = parseInvitationInput(
      serverInvitationFormatUpdateRequestSchema,
      this.withApp(input),
    )
    return this.options.http
      .patch('/api/server/invitation-code-format', {
        ...options,
        body: request,
        responseSchema: serverInvitationFormatResponseSchema.refine(
          (result) =>
            result.appId === request.appId &&
            result.revision === request.expectedRevision + 1 &&
            result.format !== null &&
            result.format.prefix === request.format.prefix &&
            result.format.randomLength === request.format.randomLength &&
            result.format.alphabet === request.format.alphabet &&
            result.format.groupSize === request.format.groupSize,
          { message: 'Invitation format does not match the requested update and next revision' },
        ),
      })
      .catch(redactInvitationError)
  }

  /** One page of an organization's managed invitations, newest first. Never includes codes. */
  listForOrganization(input: ListOrganizationInvitationsInput, options: SubKitRequestOptions = {}) {
    const request = parseInvitationInput(
      serverOrganizationInvitationListRequestSchema,
      this.withApp(input),
    )
    const query = new URLSearchParams({ appId: request.appId })
    if (request.limit !== undefined) query.set('limit', String(request.limit))
    if (request.cursor !== undefined) query.set('cursor', request.cursor)
    return this.options.http
      .get(
        `/api/server/organizations/${encodeURIComponent(request.organizationSubjectId)}/access-invitations?${query}`,
        {
          ...options,
          responseSchema: serverOrganizationInvitationListResponseSchema.refine(
            (result) =>
              result.appId === request.appId &&
              result.organizationSubjectId === request.organizationSubjectId &&
              result.items.length <= (request.limit ?? 50),
            { message: 'Invitation list does not match the requested app, organization and page' },
          ),
        },
      )
      .catch(redactInvitationError)
  }

  private withApp<T extends { appId?: string }>(input: T) {
    if (this.options.appId && input.appId && input.appId !== this.options.appId) {
      throw new Error('Invitation app does not match the configured client')
    }
    return { ...input, appId: input.appId ?? this.options.appId }
  }
}

function requireMutationKey(options: SubKitMutationOptions): void {
  parseInvitationInput(z.string().min(8).max(200), options.idempotencyKey)
}

function parseInvitationInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new SubKitApiError({
      code: 'validation_failed',
      status: 0,
      message: 'Invalid invitation request',
    })
  }
  return result.data
}

function redactInvitationError(error: unknown): never {
  const retry =
    error instanceof SubKitApiError && error.code === 'rate_limited'
      ? z.object({ retryAfterSeconds: z.number().int().min(1).max(3600) }).safeParse(error.details)
      : null
  throw new SubKitApiError({
    code: error instanceof SubKitApiError ? error.code : 'network',
    status: error instanceof SubKitApiError ? error.status : 0,
    message: 'SubKit invitation request failed',
    details: retry?.success ? retry.data : undefined,
  })
}

function sameReservation(left: ReservationIdentity, right: ReservationIdentity): boolean {
  return (
    left.appId === right.appId &&
    left.reservationId === right.reservationId &&
    left.poolId === right.poolId &&
    left.accessSourceId === right.accessSourceId
  )
}
