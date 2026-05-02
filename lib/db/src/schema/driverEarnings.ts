import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Per-delivery earnings ledger for drivers.
 * One row inserted each time a delivery is confirmed via OTP.
 */
export const driverEarningsTable = pgTable("driver_earnings", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull(),
  orderId: integer("order_id").notNull(),
  /** Amount credited to the driver for this delivery (MAD). */
  amount: real("amount").notNull(),
  /** "delivery" | "bonus" | "adjustment" */
  type: text("type").notNull().default("delivery"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDriverEarningSchema = createInsertSchema(driverEarningsTable).omit({ id: true, createdAt: true });
export type InsertDriverEarning = z.infer<typeof insertDriverEarningSchema>;
export type DriverEarning = typeof driverEarningsTable.$inferSelect;
