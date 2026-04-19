import { pgTable, integer, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const notificationPrefsTable = pgTable("notification_prefs", {
  userId: integer("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  pushOrders: boolean("push_orders").notNull().default(true),
  pushPromos: boolean("push_promos").notNull().default(true),
  emailReceipts: boolean("email_receipts").notNull().default(true),
  emailNewsletter: boolean("email_newsletter").notNull().default(false),
  smsAlerts: boolean("sms_alerts").notNull().default(false),
  language: text("language").notNull().default("fr"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type NotificationPrefs = typeof notificationPrefsTable.$inferSelect;
