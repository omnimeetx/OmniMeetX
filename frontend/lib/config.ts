/**
 * Backend endpoints — the single place the frontend learns where the API lives.
 *
 * Set in `.env.local` for development and in your host's dashboard (Vercel,
 * Cloudflare Pages…) for production:
 *   NEXT_PUBLIC_API_URL        REST API base, e.g. https://api.yourdomain.com
 *   NEXT_PUBLIC_SOCKET_SERVER  Socket.IO server (defaults to the API URL)
 */
const DEFAULT_BACKEND_URL = 'http://localhost:5000'

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, '')

export const API_URL = stripTrailingSlash(process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND_URL)

export const SOCKET_URL = stripTrailingSlash(process.env.NEXT_PUBLIC_SOCKET_SERVER || API_URL)
