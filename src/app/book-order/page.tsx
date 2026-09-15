import { Suspense } from "react";
import { BookOrderForm } from "@/components/book-order-form";

export default function BookOrderPage() {
  const agentEmbedUrl = process.env.AGENT_EMBED_URL?.trim() ?? "";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {agentEmbedUrl ? (
        <Suspense fallback={null}>
          <BookOrderForm agentEmbedUrl={agentEmbedUrl} />
        </Suspense>
      ) : (
        <div className="p-6 text-sm text-destructive">
          Missing <code>AGENT_EMBED_URL</code> in environment.
        </div>
      )}
    </div>
  );
}
