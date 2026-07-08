import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { parseServerEnv } from '~/server/env'

import * as schema from './schema'

const { DATABASE_URL } = parseServerEnv(process.env)

export const dbClient = createClient({ url: DATABASE_URL })
export const db = drizzle(dbClient, { schema })
