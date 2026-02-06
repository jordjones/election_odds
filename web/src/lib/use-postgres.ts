/**
 * Runtime check for whether to use PostgreSQL.
 * Uses bracket notation to prevent Next.js/webpack from replacing
 * process.env.DATABASE_URL at build time via DefinePlugin.
 */
export function usePostgres(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(process.env as any)['DATABASE_URL'];
}
