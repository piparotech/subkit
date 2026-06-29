import { defineConfig } from 'drizzle-kit'

import { parseServerEnv } from './src/server/env'

const { DATABASE_URL } = parseServerEnv(process.env)

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: DATABASE_URL,
  },
})
