import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  trackingNumber: text("tracking_number").notNull().unique(),
  pickupConfirmationNumber: text("pickup_confirmation_number").notNull(),
  waybillNumber: text("waybill_number").notNull(),
  mode: text("mode").notNull(), // air | ocean
  status: text("status").notNull().default("booked"),
  shipFromCompany: text("ship_from_company"),
  shipFromPort: text("ship_from_port"),
  deliverToCompany: text("deliver_to_company"),
  deliverToPort: text("deliver_to_port"),
  cargoReadyDate: text("cargo_ready_date"),
  expectedDelivery: timestamp("expected_delivery", { withTimezone: true }),
  totalPriceUsd: integer("total_price_usd"),
  payload: jsonb("payload").notNull(),
  confirmation: jsonb("confirmation").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type OrderRow = typeof orders.$inferSelect;
export type NewOrderRow = typeof orders.$inferInsert;
