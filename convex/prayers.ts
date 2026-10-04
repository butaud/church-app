import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin, requireUser } from "./model/auth";

export const listPrayerItems = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const items = await ctx.db.query("prayerItems").collect();
    return items.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const createPrayerItem = mutation({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    const admin = await requireAdmin(ctx);
    const trimmed = text.trim();
    if (!trimmed) throw new ConvexError("Text is required");
    const items = await ctx.db.query("prayerItems").collect();
    const maxOrder = items.reduce((max, i) => Math.max(max, i.sortOrder), -1);
    await ctx.db.insert("prayerItems", {
      text: trimmed,
      sortOrder: maxOrder + 1,
      updatedBy: admin._id,
      updatedAt: Date.now(),
    });
  },
});

export const updatePrayerItem = mutation({
  args: { itemId: v.id("prayerItems"), text: v.string() },
  handler: async (ctx, { itemId, text }) => {
    const admin = await requireAdmin(ctx);
    const trimmed = text.trim();
    if (!trimmed) throw new ConvexError("Text is required");
    await ctx.db.patch(itemId, {
      text: trimmed,
      updatedBy: admin._id,
      updatedAt: Date.now(),
    });
  },
});

export const deletePrayerItem = mutation({
  args: { itemId: v.id("prayerItems") },
  handler: async (ctx, { itemId }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(itemId);
  },
});

export const reorderPrayerItems = mutation({
  args: { itemIds: v.array(v.id("prayerItems")) },
  handler: async (ctx, { itemIds }) => {
    await requireAdmin(ctx);
    for (const [index, itemId] of itemIds.entries()) {
      await ctx.db.patch(itemId, { sortOrder: index });
    }
  },
});
