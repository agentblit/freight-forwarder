"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plane,
  Ship,
  Package,
  Plus,
  Loader2,
} from "lucide-react";
import type { OrderSummary } from "@/lib/types";

type Summary = {
  total: number;
  air: number;
  ocean: number;
  booked: number;
};

export function DashboardView() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    air: 0,
    ocean: 0,
    booked: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load");
        if (!cancelled) {
          setOrders(data.orders);
          setSummary(data.summary);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    {
      label: "Total orders",
      value: summary.total,
      icon: Package,
      tone: "bg-[#d7eef6] text-[#0b4f6c]",
    },
    {
      label: "Ocean",
      value: summary.ocean,
      icon: Ship,
      tone: "bg-[#e8f0f6] text-[#0b1f33]",
    },
    {
      label: "Air",
      value: summary.air,
      icon: Plane,
      tone: "bg-[#f8e9df] text-[#c45c26]",
    },
    {
      label: "Booked",
      value: summary.booked,
      icon: Package,
      tone: "bg-[#e4f5ec] text-[#0f7a4f]",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2a9dba]">
            Overview
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Orders summary across ocean and air bookings.
          </p>
        </div>
        <Link href="/book-order" className="ff-btn ff-btn-primary">
          <Plus className="h-4 w-4" />
          Book order
        </Link>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {label}
              </p>
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}
              >
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold tracking-tight">Recent orders</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading orders…
          </div>
        ) : error ? (
          <div className="px-5 py-10 text-sm text-destructive">{error}</div>
        ) : orders.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No bookings yet. Create your first order to see it here.
            </p>
            <Link
              href="/book-order"
              className="ff-btn ff-btn-primary mt-4 inline-flex"
            >
              Book order
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Tracking</th>
                  <th className="px-5 py-3 font-semibold">Mode</th>
                  <th className="px-5 py-3 font-semibold">From</th>
                  <th className="px-5 py-3 font-semibold">To</th>
                  <th className="px-5 py-3 font-semibold">Ready</th>
                  <th className="px-5 py-3 font-semibold">ETA</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-border/80 hover:bg-muted/30"
                  >
                    <td className="px-5 py-3 font-semibold text-primary">
                      {order.trackingNumber}
                    </td>
                    <td className="px-5 py-3 capitalize">{order.mode}</td>
                    <td className="px-5 py-3">
                      {order.shipFromCompany || order.shipFromPort || "—"}
                    </td>
                    <td className="px-5 py-3">
                      {order.deliverToCompany || order.deliverToPort || "—"}
                    </td>
                    <td className="px-5 py-3">{order.cargoReadyDate || "—"}</td>
                    <td className="px-5 py-3">
                      {order.expectedDelivery
                        ? new Date(order.expectedDelivery).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-800">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
