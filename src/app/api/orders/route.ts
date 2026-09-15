import { desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { generateConfirmation } from "@/lib/confirmation";

const partySchema = z.object({
  companyName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.record(z.string(), z.unknown()).optional(),
});

const bookingSchema = z.object({
  mode: z.enum(["air", "ocean"]),
  exporter: partySchema.optional(),
  importer: partySchema.optional(),
  // Legacy-compatible fields for DB columns
  shipFrom: z
    .object({
      companyName: z.string().optional(),
      portName: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  deliverTo: z
    .object({
      companyName: z.string().optional(),
      portName: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  items: z.array(z.record(z.string(), z.unknown())).optional(),
  originCode: z.string().optional(),
  destinationCode: z.string().optional(),
  ocean: z.record(z.string(), z.unknown()).optional(),
  airPackages: z.array(z.record(z.string(), z.unknown())).optional(),
  cargoReadyDate: z.string().optional(),
  totalPriceUsd: z.number().optional().nullable(),
});

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(100);

    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        air: sql<number>`count(*) filter (where ${orders.mode} = 'air')::int`,
        ocean: sql<number>`count(*) filter (where ${orders.mode} = 'ocean')::int`,
        booked: sql<number>`count(*) filter (where ${orders.status} = 'booked')::int`,
      })
      .from(orders);

    return NextResponse.json({
      orders: rows.map((row) => ({
        id: row.id,
        trackingNumber: row.trackingNumber,
        mode: row.mode,
        status: row.status,
        shipFromCompany: row.shipFromCompany,
        shipFromPort: row.shipFromPort,
        deliverToCompany: row.deliverToCompany,
        deliverToPort: row.deliverToPort,
        cargoReadyDate: row.cargoReadyDate,
        expectedDelivery: row.expectedDelivery?.toISOString() ?? null,
        totalPriceUsd: row.totalPriceUsd,
        createdAt: row.createdAt.toISOString(),
      })),
      summary: stats ?? { total: 0, air: 0, ocean: 0, booked: 0 },
    });
  } catch (error) {
    console.error("GET /api/orders", error);
    return NextResponse.json(
      { error: "Failed to load orders" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid booking payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const confirmation = generateConfirmation(payload.mode);

    const shipFromCompany =
      payload.shipFrom?.companyName ?? payload.exporter?.companyName ?? null;
    const shipFromPort =
      payload.shipFrom?.portName ?? payload.originCode ?? null;
    const deliverToCompany =
      payload.deliverTo?.companyName ?? payload.importer?.companyName ?? null;
    const deliverToPort =
      payload.deliverTo?.portName ?? payload.destinationCode ?? null;

    const [row] = await db
      .insert(orders)
      .values({
        trackingNumber: confirmation.trackingNumber,
        pickupConfirmationNumber: confirmation.pickupConfirmationNumber,
        waybillNumber: confirmation.waybillNumber,
        mode: payload.mode,
        status: "booked",
        shipFromCompany,
        shipFromPort,
        deliverToCompany,
        deliverToPort,
        cargoReadyDate: payload.cargoReadyDate ?? null,
        expectedDelivery: new Date(confirmation.expectedDelivery),
        totalPriceUsd: payload.totalPriceUsd ?? null,
        payload,
        confirmation,
      })
      .returning();

    return NextResponse.json({ order: row, confirmation }, { status: 201 });
  } catch (error) {
    console.error("POST /api/orders", error);
    return NextResponse.json(
      { error: "Failed to save order" },
      { status: 500 },
    );
  }
}
