import { sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { Listing } from "../lib/rentals";

export const rentalLeads = sqliteTable(
  "rental_leads",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    fingerprint: text("fingerprint").notNull(),
    listing: text("listing", { mode: "json" }).$type<Listing>().notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("rental_leads_owner_idx").on(table.ownerId),
    uniqueIndex("rental_leads_owner_fingerprint_idx").on(
      table.ownerId,
      table.fingerprint,
    ),
  ],
);

export const savedRentals = sqliteTable("saved_rentals", {
  ownerId: text("owner_id").primaryKey(),
  ids: text("ids", { mode: "json" }).$type<string[]>().notNull(),
  updatedAt: text("updated_at").notNull(),
});
