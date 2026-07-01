import { desc, eq } from 'drizzle-orm'

import { db } from '~/db/client'
import {
  appStoreConnectAuditEvents,
  appStoreConnectCapabilities,
  appStoreConnectCredentials,
  appStoreConnectSalesReports,
} from '~/db/schema'

import type { AppStoreConnectCapability, AppStoreConnectConnection } from '~/integrations/app-store-connect/types'

export async function readAppStoreConnectConnectionForTenant(tenantId: string): Promise<AppStoreConnectConnection | null> {
  const [credentialRows, capabilityRows, reportRows, auditRows] = await Promise.all([
    db.select().from(appStoreConnectCredentials).where(eq(appStoreConnectCredentials.tenantId, tenantId)).limit(1),
    db.select().from(appStoreConnectCapabilities),
    db.select().from(appStoreConnectSalesReports).orderBy(desc(appStoreConnectSalesReports.createdAt)),
    db.select().from(appStoreConnectAuditEvents).orderBy(desc(appStoreConnectAuditEvents.createdAt)),
  ])

  const credential = credentialRows[0]
  if (credential == null) return null

  return {
    auditEvents: auditRows
      .filter((event) => event.credentialId === credential.id)
      .slice(0, 8)
      .map((event) => ({
        action: event.action,
        createdAt: formatDateTime(event.createdAt),
        detail: event.detail,
        id: event.id,
      })),
    capabilities: capabilityRows
      .filter((capabilityRow) => capabilityRow.credentialId === credential.id)
      .map((capabilityRow): AppStoreConnectCapability => ({
        checkedAt: formatDateTime(capabilityRow.checkedAt),
        description: capabilityRow.description,
        detail: capabilityRow.detail,
        key: capabilityRow.key,
        label: capabilityRow.label,
        status: capabilityRow.status,
      })),
    hasPrivateKey: credential.privateKeyCiphertext != null,
    id: credential.id,
    issuerId: credential.issuerId,
    keyFingerprint: credential.privateKeySha256 == null ? null : credential.privateKeySha256.slice(0, 16),
    keyId: credential.keyId,
    lastError: credential.lastError,
    lastValidatedAt: credential.lastValidatedAt == null ? null : formatDateTime(credential.lastValidatedAt),
    salesReports: reportRows
      .filter((report) => report.credentialId === credential.id)
      .slice(0, 6)
      .map((report) => ({
        createdAt: formatDateTime(report.createdAt),
        errorDetail: report.errorDetail,
        id: report.id,
        reportDate: report.reportDate,
        rowCount: formatInteger(report.rowCount),
        status: report.status,
        vendorNumber: report.vendorNumber,
      })),
    status: credential.status,
    tenantId: credential.tenantId,
    vendorNumber: credential.vendorNumber,
  }
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}
