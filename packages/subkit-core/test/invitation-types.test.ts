import type {
  InvitationRecipient,
  ServerInvitationClaimRequest,
  ServerInvitationClaimResponse,
  ServerInvitationDeliveryResponse,
  ServerInvitationFormatResponse,
  ServerInvitationIssueRequestInput,
} from '../src/index.js'

const recipient: InvitationRecipient = { kind: 'reference', reference: 'verified-reference' }
const issue: ServerInvitationIssueRequestInput = {
  appId: 'app',
  poolId: 'pool',
  recipient,
  reason: 'Invite',
}

// @ts-expect-error Managed issuance always requires an intended recipient.
const unbound: ServerInvitationIssueRequestInput = {
  appId: 'app',
  poolId: 'pool',
  reason: 'Invite',
}

// @ts-expect-error Recipient binding chooses exactly one kind.
const mixed: InvitationRecipient = { kind: 'subject', subjectId: 'subject', reference: 'other' }

// @ts-expect-error Claim cannot omit the reviewed reservation identity and version.
const unreviewed: ServerInvitationClaimRequest = {
  appId: 'app',
  subjectId: 'subject',
  code: 'CLUB-23456789',
  reason: 'Claim',
}

// @ts-expect-error Exact claim recovery always includes the reviewed code version.
const unversioned: ServerInvitationClaimResponse = {
  appId: 'app',
  subjectId: 'subject',
  reservationId: 'reservation',
  poolId: 'pool',
  accessSourceId: 'source',
  status: 'claimed',
  allocationId: 'allocation',
}

function deliveryMetadata(result: ServerInvitationDeliveryResponse): {
  quantity: number
  formatRevision: number
} {
  return { quantity: result.quantity, formatRevision: result.formatRevision }
}

function allocationOf(result: ServerInvitationClaimResponse): string | null {
  if (result.status === 'claimed') return result.allocationId
  // @ts-expect-error Rejected claims do not contain an allocation.
  result.allocationId
  return null
}

function prefixOf(result: ServerInvitationFormatResponse): string | null {
  if (result.format === null) return null
  return result.format.prefix
}

export { allocationOf, deliveryMetadata, issue, mixed, prefixOf, unbound, unreviewed, unversioned }
