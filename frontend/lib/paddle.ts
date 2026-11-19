/**
 * Paddle.js (checkout overlay), loaded once and only when someone upgrades.
 *
 * Env (frontend/.env.local, or your host's dashboard):
 *   NEXT_PUBLIC_PADDLE_CLIENT_TOKEN   test_... (sandbox) / live_... (production)
 *   NEXT_PUBLIC_PADDLE_ENVIRONMENT    sandbox | production
 */
import { initializePaddle, type Paddle } from '@paddle/paddle-js'

const CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || ''
const ENVIRONMENT = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox'

let paddlePromise: Promise<Paddle | undefined> | null = null

export const paddleConfigured = () => Boolean(CLIENT_TOKEN)

export function getPaddle(): Promise<Paddle | undefined> {
  if (!CLIENT_TOKEN) return Promise.resolve(undefined)
  if (!paddlePromise) {
    paddlePromise = initializePaddle({ token: CLIENT_TOKEN, environment: ENVIRONMENT }).catch((err) => {
      console.error('Paddle.js failed to load', err)
      paddlePromise = null
      return undefined
    })
  }
  return paddlePromise
}
