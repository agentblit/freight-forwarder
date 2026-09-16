const SESSION_STORAGE_KEY = "ff-booking-session-id";

/** Stable per-tab booking/agent session id. */
export function getOrCreateBookingSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing?.trim()) return existing.trim();
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function persistBookingSessionId(sessionId: string) {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  } catch {
    // ignore
  }
}
