"use client";

import { useEffect, useRef } from "react";

type Options = {
  enabled?: boolean;
  /** Required session id — must match the embedded agent session. */
  sessionId: string;
  /** Called with `form_data.data` from each SSE event (skipped when empty). */
  onData: (data: Record<string, unknown>) => void;
  onStatus?: (status: "connecting" | "live" | "error") => void;
};

/**
 * Browser → freight-forwarder `/api/form-fill/stream?session_id=…` → connector SSE.
 * API key stays on the server (X-API-Key header); never sent to the browser.
 */
export function useFormFillStream({
  enabled = true,
  sessionId,
  onData,
  onStatus,
}: Options) {
  const onDataRef = useRef(onData);
  const onStatusRef = useRef(onStatus);
  onDataRef.current = onData;
  onStatusRef.current = onStatus;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const trimmed = sessionId.trim();
    if (!trimmed) return;

    const url = `/api/form-fill/stream?session_id=${encodeURIComponent(trimmed)}`;

    onStatusRef.current?.("connecting");
    const source = new EventSource(url);

    const handleFormData = (event: Event) => {
      const message = event as MessageEvent<string>;
      try {
        const payload = JSON.parse(message.data) as { data?: unknown };
        onStatusRef.current?.("live");

        if (
          !payload.data ||
          typeof payload.data !== "object" ||
          Array.isArray(payload.data)
        ) {
          return;
        }

        const data = payload.data as Record<string, unknown>;
        if (Object.keys(data).length === 0) return;

        onDataRef.current(data);
      } catch (error) {
        console.error("Failed to parse form_data SSE event", error);
        onStatusRef.current?.("error");
      }
    };

    source.addEventListener("form_data", handleFormData);
    source.onopen = () => onStatusRef.current?.("live");
    source.onerror = () => onStatusRef.current?.("error");

    return () => {
      source.removeEventListener("form_data", handleFormData);
      source.close();
    };
  }, [enabled, sessionId]);
}
