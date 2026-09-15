"use client";

import { useMemo } from "react";

type Props = {
  src: string;
  /** When set, opens the embed on this chat session (creates it if new). */
  sessionId?: string | null;
};

function buildEmbedSrc(baseSrc: string, sessionId?: string | null): string {
  try {
    const url = new URL(baseSrc);
    url.searchParams.set("embed", "1");
    const trimmed = sessionId?.trim();
    if (trimmed) {
      url.searchParams.set("session_id", trimmed);
    }
    return url.toString();
  } catch {
    return baseSrc;
  }
}

export function AgentPanel({ src, sessionId }: Props) {
  const embedSrc = useMemo(
    () => buildEmbedSrc(src, sessionId),
    [src, sessionId],
  );

  return (
    <aside className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <iframe
        key={embedSrc}
        src={embedSrc}
        title="Agent chat"
        className="min-h-0 w-full flex-1 border-0 bg-white"
        allow="clipboard-write"
      />
    </aside>
  );
}
