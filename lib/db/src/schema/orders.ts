import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  reference: text("reference").unique(),
  userId: integer("user_id").notNull(),
  restaurantId: integer("restaurant_id").notNull(),
  driverId: integer("driver_id"),
  restaurantName: text("restaurant_name").notNull(),
  userName: text("user_name").notNull(),
  status: text("status").notNull().default("pending"),
  subtotal: real("subtotal").notNull(),
  deliveryFee: real("delivery_fee").notNull().default(0),
  total: real("total").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  notes: text("notes"),
  estimatedDeliveryTime: integer("estimated_delivery_time"),
  /** 3-digit numeric code printed on the kitchen ticket for in-store pickup. */
  kitchenCode: text("kitchen_code"),
  /** 4-digit numeric code shown to the customer at order acceptance; the driver
   *  must enter or scan it to confirm hand-off (a la Uber Eats / Glovo). */
  pickupCode: text("pickup_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  menuItemId: integer("menu_item_id").notNull(),
  menuItemName: text("menu_item_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
