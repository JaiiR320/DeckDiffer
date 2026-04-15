import { dash } from '@better-auth/infra'
import dotenv from 'dotenv'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '#/db'
import { schema } from '#/db/schema'

dotenv.config({ path: '.env.local' })
dotenv.config()

const authSecret =
  process.env.BETTER_AUTH_SECRET ??
  process.env.AUTH_SECRET ??
  process.env.SECRET ??
  (process.env.NODE_ENV === 'production' ? undefined : 'deckdiffer-dev-auth-secret')

if (!process.env.BETTER_AUTH_URL) {
  throw new Error('BETTER_AUTH_URL is not configured.')
}

const authBaseURL = process.env.BETTER_AUTH_URL

export const auth = betterAuth({
  baseURL: authBaseURL,
  secret: authSecret,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [tanstackStartCookies(), dash()],
})
