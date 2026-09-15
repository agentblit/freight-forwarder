"use client";

type Props = {
  src?: string;
};

export function AgentPanel({
  src = "https://agents-os0pw66fpl.agentblit.com?embed=1",
}: Props) {
  return (
    <aside className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <iframe
        src={src}
        title="Agent chat"
        className="min-h-0 w-full flex-1 border-0 bg-white"
        allow="clipboard-write"
      />
    </aside>
  );
}
