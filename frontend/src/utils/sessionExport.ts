/** Backend PDF export requires a persisted simulation UUID in Postgres. */

const SESSION_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isExportableSessionId(session: string | null | undefined): boolean {
  return Boolean(session && session !== 'offline' && SESSION_UUID_RE.test(session))
}

export function exportSimulationPdfUrl(sessionId: string): string {
  return `/api/simulation/${sessionId}/export`
}
