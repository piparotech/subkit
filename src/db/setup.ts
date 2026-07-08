import { createServerFn } from '@tanstack/react-start'

import { migrate } from 'drizzle-orm/libsql/migrator'

import { db } from './client'

let databaseReady: Promise<void> | null = null

export function ensureDatabaseReady(): Promise<void> {
  databaseReady ??= prepareDatabase()
  return databaseReady
}

async function prepareDatabase(): Promise<void> {
  await migrate(db, { migrationsFolder: './drizzle' })
}

export const prepareSubKitConsoleDatabase = createServerFn({ method: 'POST' }).handler(async () => {
  await ensureDatabaseReady()
  return { ok: true }
})
