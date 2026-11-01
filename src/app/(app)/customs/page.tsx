"use client";

import { useEffect, useState } from "react";
import { FileStack, Loader2 } from "lucide-react";
import type { OrderSummary } from "@/lib/types";

export default function CustomsPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();
        if (!cancelled && res.ok) setOrders(data.orders ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl p-6">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2a9dba]">
          Clearance
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Customs</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Track clearance-related bookings and required product-specific
          documents for each shipment.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileStack className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Clearance queue</h2>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : orders.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">
            No shipments in customs yet. Submitted bookings appear here for
            document review.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-semibold text-primary">
                    {order.trackingNumber}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {order.shipFromPort || order.shipFromCompany || "Origin"} →{" "}
                    {order.deliverToPort || order.deliverToCompany || "Destination"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold capitalize">
                    {order.mode}
                  </span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                    Docs review
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </div>
  );
}
