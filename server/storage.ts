import { entries, tags, entryTags, type Entry, type InsertEntry, type Tag, type InsertTag, type EntryWithTags } from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, ilike, inArray } from "drizzle-orm";

export interface IStorage {
  // Entry operations
  getEntries(): Promise<EntryWithTags[]>;
  getEntry(id: number): Promise<EntryWithTags | undefined>;
  createEntry(entry: InsertEntry, tagNames: string[]): Promise<EntryWithTags>;
  updateEntry(id: number, entry: Partial<InsertEntry>, tagNames: string[]): Promise<EntryWithTags>;
  deleteEntry(id: number): Promise<void>;
  searchEntries(query: string): Promise<EntryWithTags[]>;
  
  // Tag operations
  getTags(): Promise<Tag[]>;
  getOrCreateTags(tagNames: string[]): Promise<Tag[]>;
}

export class DatabaseStorage implements IStorage {
  async getEntries(): Promise<EntryWithTags[]> {
    const result = await db.query.entries.findMany({
      orderBy: [desc(entries.createdAt)],
      with: {
        entryTags: {
          with: {
            tag: true,
          },
        },
      },
    });

    return result.map(entry => ({
      ...entry,
      tags: entry.entryTags.map(et => et.tag),
    }));
  }

  async getEntry(id: number): Promise<EntryWithTags | undefined> {
    const result = await db.query.entries.findFirst({
      where: eq(entries.id, id),
      with: {
        entryTags: {
          with: {
            tag: true,
          },
        },
      },
    });

    if (!result) return undefined;

    return {
      ...result,
      tags: result.entryTags.map(et => et.tag),
    };
  }

  async createEntry(entry: InsertEntry, tagNames: string[]): Promise<EntryWithTags> {
    return await db.transaction(async (tx) => {
      // Create the entry
      const [newEntry] = await tx
        .insert(entries)
        .values({
          ...entry,
          updatedAt: new Date(),
        })
        .returning();

      // Get or create tags (need to call this outside transaction)
      const tagList: Tag[] = [];
      if (tagNames.length > 0) {
        const normalizedNames = tagNames.map(name => name.toLowerCase().trim()).filter(name => name);
        if (normalizedNames.length > 0) {
          // Find existing tags
          const existingTags = await tx.select().from(tags).where(
            inArray(tags.name, normalizedNames)
          );

          // Find which tags need to be created
          const existingTagNames = existingTags.map(tag => tag.name.toLowerCase());
          const newTagNames = normalizedNames.filter(name => !existingTagNames.includes(name));

          // Create new tags
          const newTags = [];
          if (newTagNames.length > 0) {
            const insertedTags = await tx.insert(tags).values(
              newTagNames.map(name => ({ name }))
            ).returning();
            newTags.push(...insertedTags);
          }

          tagList.push(...existingTags, ...newTags);
        }
      }

      // Create entry-tag relationships
      if (tagList.length > 0) {
        await tx.insert(entryTags).values(
          tagList.map(tag => ({
            entryId: newEntry.id,
            tagId: tag.id,
          }))
        );
      }

      return {
        ...newEntry,
        tags: tagList,
      };
    });
  }

  async updateEntry(id: number, entry: Partial<InsertEntry>, tagNames: string[]): Promise<EntryWithTags> {
    return await db.transaction(async (tx) => {
      // Update the entry
      const [updatedEntry] = await tx
        .update(entries)
        .set({
          ...entry,
          updatedAt: new Date(),
        })
        .where(eq(entries.id, id))
        .returning();

      // Delete existing entry-tag relationships
      await tx.delete(entryTags).where(eq(entryTags.entryId, id));

      // Get or create tags within transaction
      const tagList: Tag[] = [];
      if (tagNames.length > 0) {
        const normalizedNames = tagNames.map(name => name.toLowerCase().trim()).filter(name => name);
        if (normalizedNames.length > 0) {
          // Find existing tags
          const existingTags = await tx.select().from(tags).where(
            inArray(tags.name, normalizedNames)
          );

          // Find which tags need to be created
          const existingTagNames = existingTags.map(tag => tag.name.toLowerCase());
          const newTagNames = normalizedNames.filter(name => !existingTagNames.includes(name));

          // Create new tags
          const newTags = [];
          if (newTagNames.length > 0) {
            const insertedTags = await tx.insert(tags).values(
              newTagNames.map(name => ({ name }))
            ).returning();
            newTags.push(...insertedTags);
          }

          tagList.push(...existingTags, ...newTags);
        }
      }

      // Create new entry-tag relationships
      if (tagList.length > 0) {
        await tx.insert(entryTags).values(
          tagList.map(tag => ({
            entryId: id,
            tagId: tag.id,
          }))
        );
      }

      return {
        ...updatedEntry,
        tags: tagList,
      };
    });
  }

  async deleteEntry(id: number): Promise<void> {
    await db.delete(entries).where(eq(entries.id, id));
  }

  async searchEntries(query: string): Promise<EntryWithTags[]> {
    const searchPattern = `%${query}%`;
    
    // First, find entries that match title or content
    const matchingEntries = await db.query.entries.findMany({
      where: or(
        ilike(entries.title, searchPattern),
        ilike(entries.content, searchPattern)
      ),
      with: {
        entryTags: {
          with: {
            tag: true,
          },
        },
      },
    });

    // Then find entries that have matching tags
    const matchingTags = await db.query.tags.findMany({
      where: ilike(tags.name, searchPattern),
    });

    if (matchingTags.length > 0) {
      const tagIds = matchingTags.map(tag => tag.id);
      const entriesWithMatchingTags = await db.query.entryTags.findMany({
        where: inArray(entryTags.tagId, tagIds),
        with: {
          entry: {
            with: {
              entryTags: {
                with: {
                  tag: true,
                },
              },
            },
          },
        },
      });

      // Add entries with matching tags
      for (const et of entriesWithMatchingTags) {
        if (!matchingEntries.find(e => e.id === et.entry.id)) {
          matchingEntries.push(et.entry);
        }
      }
    }

    // Sort by created date and format
    return matchingEntries
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(entry => ({
        ...entry,
        tags: entry.entryTags.map(et => et.tag),
      }));
  }

  async getTags(): Promise<Tag[]> {
    return await db.select().from(tags).orderBy(tags.name);
  }

  async getOrCreateTags(tagNames: string[]): Promise<Tag[]> {
    if (tagNames.length === 0) return [];

    const normalizedNames = tagNames.map(name => name.toLowerCase().trim()).filter(name => name);
    if (normalizedNames.length === 0) return [];

    // Find existing tags
    const existingTags = await db.select().from(tags).where(
      inArray(tags.name, normalizedNames)
    );

    // Find which tags need to be created
    const existingTagNames = existingTags.map(tag => tag.name.toLowerCase());
    const newTagNames = normalizedNames.filter(name => !existingTagNames.includes(name));

    // Create new tags
    const newTags = [];
    if (newTagNames.length > 0) {
      const insertedTags = await db.insert(tags).values(
        newTagNames.map(name => ({ name }))
      ).returning();
      newTags.push(...insertedTags);
    }

    return [...existingTags, ...newTags];
  }
}

export const storage = new DatabaseStorage();
