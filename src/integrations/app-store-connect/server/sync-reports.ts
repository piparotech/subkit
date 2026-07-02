import { db } from '~/db/client'
import { createRandomToken } from '~/server/auth/crypto'
import { appStoreConnectSalesReports } from '~/db/schema'
import { downloadDailySalesReport, type AppStoreConnectCredentials } from '~/server/app-store-connect/client'
import type { AppStoreConnectReportSyncResult } from '~/integrations/app-store-connect/types'

import { recordAppStoreConnectAudit, safeErrorDetail } from './sync-shared'

export async function syncAppStoreConnectSalesReportSnapshot({
  appId,
  credentialId,
  credentials,
  reportDate = defaultReportDate(),
  tenantId,
  userId,
  vendorNumber,
}: {
  appId: string | null
  credentialId: string
  credentials: AppStoreConnectCredentials
  reportDate?: string
  tenantId: string
  userId: string
  vendorNumber: string
}): Promise<AppStoreConnectReportSyncResult> {
  try {
    const report = await downloadDailySalesReport({ credentials, reportDate, vendorNumber })
    await db.insert(appStoreConnectSalesReports).values({
      appId,
      createdAt: new Date(),
      credentialId,
      errorDetail: null,
      id: `asr_${createRandomToken(14)}`,
      rawText: report.rawText,
      reportDate,
      rowCount: report.rowCount,
      status: 'imported',
      vendorNumber,
    })
    await recordAppStoreConnectAudit({
      action: 'reports.synced',
      appId,
      credentialId,
      detail: `Daily Sales Report ${reportDate} imported with ${report.rowCount} rows.`,
      tenantId,
      userId,
    })
    return { reportDate, rowCount: report.rowCount, status: 'imported' }
  } catch (error) {
    const detail = safeErrorDetail(error)
    await db.insert(appStoreConnectSalesReports).values({
      appId,
      createdAt: new Date(),
      credentialId,
      errorDetail: detail,
      id: `asr_${createRandomToken(14)}`,
      rawText: null,
      reportDate,
      rowCount: 0,
      status: 'failed',
      vendorNumber,
    })
    await recordAppStoreConnectAudit({
      action: 'reports.failed',
      appId,
      credentialId,
      detail: `Daily Sales Report ${reportDate} failed: ${detail}`,
      tenantId,
      userId,
    })
    return { reportDate, rowCount: 0, status: 'failed' }
  }
}

function defaultReportDate(): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}
