var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  entries: () => entries,
  entriesRelations: () => entriesRelations,
  entryTags: () => entryTags,
  entryTagsRelations: () => entryTagsRelations,
  insertEntrySchema: () => insertEntrySchema,
  insertEntryTagSchema: () => insertEntryTagSchema,
  insertTagSchema: () => insertTagSchema,
  tags: () => tags,
  tagsRelations: () => tagsRelations
});
import { pgTable, text, serial, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
var entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique()
});
var entryTags = pgTable("entry_tags", {
  entryId: integer("entry_id").notNull().references(() => entries.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" })
}, (table) => ({
  pk: primaryKey({ columns: [table.entryId, table.tagId] })
}));
var entriesRelations = relations(entries, ({ many }) => ({
  entryTags: many(entryTags)
}));
var tagsRelations = relations(tags, ({ many }) => ({
  entryTags: many(entryTags)
}));
var entryTagsRelations = relations(entryTags, ({ one }) => ({
  entry: one(entries, {
    fields: [entryTags.entryId],
    references: [entries.id]
  }),
  tag: one(tags, {
    fields: [entryTags.tagId],
    references: [tags.id]
  })
}));
var insertEntrySchema = createInsertSchema(entries).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertTagSchema = createInsertSchema(tags).omit({
  id: true
});
var insertEntryTagSchema = createInsertSchema(entryTags);

// server/db.ts
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc, or, ilike, inArray } from "drizzle-orm";
var DatabaseStorage = class {
  async getEntries() {
    const result = await db.query.entries.findMany({
      orderBy: [desc(entries.createdAt)],
      with: {
        entryTags: {
          with: {
            tag: true
          }
        }
      }
    });
    return result.map((entry) => ({
      ...entry,
      tags: entry.entryTags.map((et) => et.tag)
    }));
  }
  async getEntry(id) {
    const result = await db.query.entries.findFirst({
      where: eq(entries.id, id),
      with: {
        entryTags: {
          with: {
            tag: true
          }
        }
      }
    });
    if (!result) return void 0;
    return {
      ...result,
      tags: result.entryTags.map((et) => et.tag)
    };
  }
  async createEntry(entry, tagNames) {
    return await db.transaction(async (tx) => {
      const [newEntry] = await tx.insert(entries).values({
        ...entry,
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      const tagList = [];
      if (tagNames.length > 0) {
        const normalizedNames = tagNames.map((name) => name.toLowerCase().trim()).filter((name) => name);
        if (normalizedNames.length > 0) {
          const existingTags = await tx.select().from(tags).where(
            inArray(tags.name, normalizedNames)
          );
          const existingTagNames = existingTags.map((tag) => tag.name.toLowerCase());
          const newTagNames = normalizedNames.filter((name) => !existingTagNames.includes(name));
          const newTags = [];
          if (newTagNames.length > 0) {
            const insertedTags = await tx.insert(tags).values(
              newTagNames.map((name) => ({ name }))
            ).returning();
            newTags.push(...insertedTags);
          }
          tagList.push(...existingTags, ...newTags);
        }
      }
      if (tagList.length > 0) {
        await tx.insert(entryTags).values(
          tagList.map((tag) => ({
            entryId: newEntry.id,
            tagId: tag.id
          }))
        );
      }
      return {
        ...newEntry,
        tags: tagList
      };
    });
  }
  async updateEntry(id, entry, tagNames) {
    return await db.transaction(async (tx) => {
      const [updatedEntry] = await tx.update(entries).set({
        ...entry,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(entries.id, id)).returning();
      await tx.delete(entryTags).where(eq(entryTags.entryId, id));
      const tagList = [];
      if (tagNames.length > 0) {
        const normalizedNames = tagNames.map((name) => name.toLowerCase().trim()).filter((name) => name);
        if (normalizedNames.length > 0) {
          const existingTags = await tx.select().from(tags).where(
            inArray(tags.name, normalizedNames)
          );
          const existingTagNames = existingTags.map((tag) => tag.name.toLowerCase());
          const newTagNames = normalizedNames.filter((name) => !existingTagNames.includes(name));
          const newTags = [];
          if (newTagNames.length > 0) {
            const insertedTags = await tx.insert(tags).values(
              newTagNames.map((name) => ({ name }))
            ).returning();
            newTags.push(...insertedTags);
          }
          tagList.push(...existingTags, ...newTags);
        }
      }
      if (tagList.length > 0) {
        await tx.insert(entryTags).values(
          tagList.map((tag) => ({
            entryId: id,
            tagId: tag.id
          }))
        );
      }
      return {
        ...updatedEntry,
        tags: tagList
      };
    });
  }
  async deleteEntry(id) {
    await db.delete(entries).where(eq(entries.id, id));
  }
  async searchEntries(query) {
    const searchPattern = `%${query}%`;
    const matchingEntries = await db.query.entries.findMany({
      where: or(
        ilike(entries.title, searchPattern),
        ilike(entries.content, searchPattern)
      ),
      with: {
        entryTags: {
          with: {
            tag: true
          }
        }
      }
    });
    const matchingTags = await db.query.tags.findMany({
      where: ilike(tags.name, searchPattern)
    });
    if (matchingTags.length > 0) {
      const tagIds = matchingTags.map((tag) => tag.id);
      const entriesWithMatchingTags = await db.query.entryTags.findMany({
        where: inArray(entryTags.tagId, tagIds),
        with: {
          entry: {
            with: {
              entryTags: {
                with: {
                  tag: true
                }
              }
            }
          }
        }
      });
      for (const et of entriesWithMatchingTags) {
        if (!matchingEntries.find((e) => e.id === et.entry.id)) {
          matchingEntries.push(et.entry);
        }
      }
    }
    return matchingEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((entry) => ({
      ...entry,
      tags: entry.entryTags.map((et) => et.tag)
    }));
  }
  async getTags() {
    return await db.select().from(tags).orderBy(tags.name);
  }
  async getOrCreateTags(tagNames) {
    if (tagNames.length === 0) return [];
    const normalizedNames = tagNames.map((name) => name.toLowerCase().trim()).filter((name) => name);
    if (normalizedNames.length === 0) return [];
    const existingTags = await db.select().from(tags).where(
      inArray(tags.name, normalizedNames)
    );
    const existingTagNames = existingTags.map((tag) => tag.name.toLowerCase());
    const newTagNames = normalizedNames.filter((name) => !existingTagNames.includes(name));
    const newTags = [];
    if (newTagNames.length > 0) {
      const insertedTags = await db.insert(tags).values(
        newTagNames.map((name) => ({ name }))
      ).returning();
      newTags.push(...insertedTags);
    }
    return [...existingTags, ...newTags];
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import { z } from "zod";
var createEntrySchema = insertEntrySchema.extend({
  tags: z.array(z.string()).default([])
});
var updateEntrySchema = insertEntrySchema.partial().extend({
  tags: z.array(z.string()).optional()
});
async function registerRoutes(app2) {
  app2.get("/api/entries", async (req, res) => {
    try {
      const entries2 = await storage.getEntries();
      res.json(entries2);
    } catch (error) {
      console.error("Error fetching entries:", error);
      res.status(500).json({ message: "Failed to fetch entries" });
    }
  });
  app2.get("/api/entries/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }
      const entries2 = await storage.searchEntries(q);
      res.json(entries2);
    } catch (error) {
      console.error("Error searching entries:", error);
      res.status(500).json({ message: "Failed to search entries" });
    }
  });
  app2.get("/api/entries/:id", async (req, res) => {
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
  app2.post("/api/entries", async (req, res) => {
    try {
      const result = createEntrySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid entry data",
          errors: result.error.issues
        });
      }
      const { tags: tags2, ...entryData } = result.data;
      const entry = await storage.createEntry(entryData, tags2);
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating entry:", error);
      res.status(500).json({ message: "Failed to create entry" });
    }
  });
  app2.put("/api/entries/:id", async (req, res) => {
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
      const { tags: tags2 = [], ...entryData } = result.data;
      const entry = await storage.updateEntry(id, entryData, tags2);
      res.json(entry);
    } catch (error) {
      console.error("Error updating entry:", error);
      res.status(500).json({ message: "Failed to update entry" });
    }
  });
  app2.delete("/api/entries/:id", async (req, res) => {
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
  app2.get("/api/tags", async (req, res) => {
    try {
      const tags2 = await storage.getTags();
      res.json(tags2);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  // 🟨 CHANGE: Output directly to dist/ for GitHub Pages
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  },
  // 🟨 ADD base if deploying to a repo (important)
  base: "/LearningJournal/"
  // Replace with your GitHub repo name
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
