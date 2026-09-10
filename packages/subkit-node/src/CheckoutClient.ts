import {
  type ServerDirectCheckoutRecoveryRequest,
  serverDirectCheckoutRecoveryRequestSchema,
  type ServerDirectCheckoutOfferingRequest,
  type ServerDirectCheckoutOfferingResponse,
  type ServerDirectCheckoutSessionRequest,
  type ServerDirectCheckoutSessionResponse,
  type ServerDirectCheckoutStatusRequest,
  type ServerDirectCheckoutStatusResponse,
  type ServerGuestCheckoutAssociationRequest,
  type ServerGuestCheckoutSessionRequest,
  type ServerGuestCheckoutStatusRequest,
  type ServerOrganizationAssociationRequest,
  type ServerOrganizationPurchaseRequest,
  serverDirectCheckoutOfferingRequestSchema,
  serverDirectCheckoutOfferingResponseSchema,
  serverDirectCheckoutSessionResponseSchema,
  serverDirectCheckoutStatusRequestSchema,
  serverDirectCheckoutStatusResponseSchema,
  serverGuestCheckoutAssociationRequestSchema,
  serverGuestCheckoutAssociationResponseSchema,
  serverGuestCheckoutSessionRequestSchema,
  serverGuestCheckoutStatusRequestSchema,
  serverGuestCheckoutStatusResponseSchema,
  serverOrganizationAccessResponseSchema,
  serverOrganizationAssociationRequestSchema,
  serverOrganizationAssociationResponseSchema,
  serverOrganizationPurchaseRequestSchema,
} from '@piparotech/subkit-core'

import type { HttpClient } from './HttpClient.js'
import type { SubKitMutationOptions, SubKitRequestOptions } from './requestOptions.js'

export type CreateDirectCheckoutSessionInput = Omit<ServerDirectCheckoutSessionRequest, 'appId'> & {
  appId?: string
}

export type GetDirectCheckoutStatusInput = Omit<ServerDirectCheckoutStatusRequest, 'appId'> & {
  appId?: string
}

export type GetDirectCheckoutOfferingInput = Omit<ServerDirectCheckoutOfferingRequest, 'appId'> & {
  appId?: string
}

interface CheckoutClientOptions {
  appId: string | undefined
  http: HttpClient
}

export class CheckoutClient {
  private readonly appId: string | undefined
  private readonly http: HttpClient

  constructor(options: CheckoutClientOptions) {
    this.appId = options.appId
    this.http = options.http
  }

  createGuestSession(
    input: Omit<ServerGuestCheckoutSessionRequest, 'appId'> & { appId?: string },
    options: SubKitMutationOptions,
  ) {
    return this.http.post('/api/server/guest-checkout/sessions', {
      ...options,
      body: serverGuestCheckoutSessionRequestSchema.parse({
        ...input,
        appId: resolveAppId(input.appId, this.appId),
      }),
      responseSchema: serverDirectCheckoutSessionResponseSchema,
    })
  }

  getGuestStatus(
    input: Omit<ServerGuestCheckoutStatusRequest, 'appId'> & { appId?: string },
    options: SubKitRequestOptions = {},
  ) {
    return this.http.post('/api/server/guest-checkout/status', {
      ...options,
      body: serverGuestCheckoutStatusRequestSchema.parse({
        ...input,
        appId: resolveAppId(input.appId, this.appId),
      }),
      responseSchema: serverGuestCheckoutStatusResponseSchema,
    })
  }

  associateGuestPurchase(
    input: Omit<ServerGuestCheckoutAssociationRequest, 'appId'> & { appId?: string },
    options: SubKitMutationOptions,
  ) {
    const body = serverGuestCheckoutAssociationRequestSchema.parse({
      ...input,
      appId: resolveAppId(input.appId, this.appId),
    })
    return this.http.post('/api/server/guest-checkout/associate', {
      ...options,
      body,
      responseSchema: serverGuestCheckoutAssociationResponseSchema.refine(
        (value) =>
          value.subjectId === body.subjectId && value.purchaseReference === body.purchaseReference,
        { message: 'Guest association does not match request' },
      ),
    })
  }

  associateOrganizationGuestPurchase(
    input: Omit<ServerOrganizationAssociationRequest, 'appId'> & { appId?: string },
    options: SubKitMutationOptions,
  ) {
    const body = serverOrganizationAssociationRequestSchema.parse({
      ...input,
      appId: resolveAppId(input.appId, this.appId),
    })
    return this.http.post('/api/server/guest-checkout/organization-associate', {
      ...options,
      body,
      responseSchema: serverOrganizationAssociationResponseSchema.refine(
        (value) =>
          value.subjectId === body.subjectId && value.purchaseReference === body.purchaseReference,
        { message: 'Organization association does not match request' },
      ),
    })
  }

  getOrganizationGuestAccess(
    input: Omit<ServerOrganizationPurchaseRequest, 'appId'> & { appId?: string },
    options: SubKitRequestOptions = {},
  ) {
    const body = serverOrganizationPurchaseRequestSchema.parse({
      ...input,
      appId: resolveAppId(input.appId, this.appId),
    })
    return this.http.post('/api/server/guest-checkout/organization-access', {
      ...options,
      body,
      responseSchema: serverOrganizationAccessResponseSchema.refine(
        (value) =>
          value.appId === body.appId &&
          value.subjectId === body.subjectId &&
          value.purchaseReference === body.purchaseReference,
        { message: 'Organization access does not match request' },
      ),
    })
  }

  getOffering(
    input: GetDirectCheckoutOfferingInput,
    options: SubKitRequestOptions = {},
  ): Promise<ServerDirectCheckoutOfferingResponse> {
    const body = serverDirectCheckoutOfferingRequestSchema.parse({
      ...input,
      appId: resolveAppId(input.appId, this.appId),
    })
    return this.http.post('/api/server/direct-checkout/offering', {
      ...options,
      body,
      responseSchema: serverDirectCheckoutOfferingResponseSchema.refine(
        (offering) => offering.identifier === body.offeringIdentifier,
        { message: 'Checkout offering does not match the request' },
      ),
    })
  }

  getStatus(
    input: GetDirectCheckoutStatusInput,
    options: SubKitRequestOptions = {},
  ): Promise<ServerDirectCheckoutStatusResponse> {
    const body = serverDirectCheckoutStatusRequestSchema.parse({
      ...input,
      appId: resolveAppId(input.appId, this.appId),
    })
    return this.http.post('/api/server/direct-checkout/status', {
      ...options,
      body,
      responseSchema: serverDirectCheckoutStatusResponseSchema.refine(
        (status) => status.checkoutIntentId === body.checkoutIntentId,
        { message: 'Checkout status reference does not match the request' },
      ),
    })
  }

  recoverStatus(
    input: Omit<ServerDirectCheckoutRecoveryRequest, 'appId'> & { appId?: string },
    options: SubKitRequestOptions = {},
  ): Promise<ServerDirectCheckoutStatusResponse> {
    const body = serverDirectCheckoutRecoveryRequestSchema.parse({
      ...input,
      appId: resolveAppId(input.appId, this.appId),
    })
    return this.http.post('/api/server/direct-checkout/status', {
      ...options,
      body,
      responseSchema: serverDirectCheckoutStatusResponseSchema,
    })
  }

  createSession(
    input: CreateDirectCheckoutSessionInput,
    options: SubKitMutationOptions,
  ): Promise<ServerDirectCheckoutSessionResponse> {
    return this.http.post('/api/server/direct-checkout/sessions', {
      ...options,
      body: {
        appId: resolveAppId(input.appId, this.appId),
        offeringIdentifier: input.offeringIdentifier,
        packageIdentifier: input.packageIdentifier,
        reason: input.reason,
        ...(input.returnTarget == null ? {} : { returnTarget: input.returnTarget }),
        subjectId: input.subjectId,
      },
      responseSchema: serverDirectCheckoutSessionResponseSchema,
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
