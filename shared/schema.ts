import { pgTable, text, serial, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const entryTags = pgTable("entry_tags", {
  entryId: integer("entry_id").notNull().references(() => entries.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.entryId, table.tagId] }),
}));

export const entriesRelations = relations(entries, ({ many }) => ({
  entryTags: many(entryTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  entryTags: many(entryTags),
}));

export const entryTagsRelations = relations(entryTags, ({ one }) => ({
  entry: one(entries, {
    fields: [entryTags.entryId],
    references: [entries.id],
  }),
  tag: one(tags, {
    fields: [entryTags.tagId],
    references: [tags.id],
  }),
}));

export const insertEntrySchema = createInsertSchema(entries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
});

export const insertEntryTagSchema = createInsertSchema(entryTags);

export type Entry = typeof entries.$inferSelect;
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type EntryTag = typeof entryTags.$inferSelect;
export type InsertEntryTag = z.infer<typeof insertEntryTagSchema>;

// Extended types for API responses
export type EntryWithTags = Entry & {
  tags: Tag[];
};
