import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEntrySchema } from "@shared/schema";
import { z } from "zod";

const createEntrySchema = insertEntrySchema.extend({
  tags: z.array(z.string()).default([]),
});

const updateEntrySchema = insertEntrySchema.partial().extend({
  tags: z.array(z.string()).optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all entries
  app.get("/api/entries", async (req, res) => {
    try {
      const entries = await storage.getEntries();
      res.json(entries);
    } catch (error) {
      console.error("Error fetching entries:", error);
      res.status(500).json({ message: "Failed to fetch entries" });
    }
  });

  // Search entries
  app.get("/api/entries/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const entries = await storage.searchEntries(q);
      res.json(entries);
    } catch (error) {
      console.error("Error searching entries:", error);
      res.status(500).json({ message: "Failed to search entries" });
    }
  });

  // Get single entry
  app.get("/api/entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }

      const entry = await storage.getEntry(id);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }

      res.json(entry);
    } catch (error) {
      console.error("Error fetching entry:", error);
      res.status(500).json({ message: "Failed to fetch entry" });
    }
  });

  // Create new entry
  app.post("/api/entries", async (req, res) => {
    try {
      const result = createEntrySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid entry data", 
          errors: result.error.issues 
        });
      }

      const { tags, ...entryData } = result.data;
      const entry = await storage.createEntry(entryData, tags);
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating entry:", error);
      res.status(500).json({ message: "Failed to create entry" });
    }
  });

  // Update entry
  app.put("/api/entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }

      const result = updateEntrySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid entry data", 
          errors: result.error.issues 
        });
      }

      const { tags = [], ...entryData } = result.data;
      const entry = await storage.updateEntry(id, entryData, tags);
      res.json(entry);
    } catch (error) {
      console.error("Error updating entry:", error);
      res.status(500).json({ message: "Failed to update entry" });
    }
  });

  // Delete entry
  app.delete("/api/entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid entry ID" });
      }

      await storage.deleteEntry(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting entry:", error);
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  // Get all tags
  app.get("/api/tags", async (req, res) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
