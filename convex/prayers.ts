import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireUser } from "./model/auth";

export const getPrayerList = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const doc = await ctx.db.query("prayerList").first();
    return doc?.items ?? [];
  },
});

export const updatePrayerList = mutation({
  args: { items: v.array(v.string()) },
  handler: async (ctx, { items }) => {
    const admin = await requireAdmin(ctx);
    const existing = await ctx.db.query("prayerList").first();
    const cleaned = items.map((item) => item.trim()).filter(Boolean);
    if (existing) {
      await ctx.db.patch(existing._id, {
        items: cleaned,
        updatedBy: admin._id,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("prayerList", {
        items: cleaned,
        updatedBy: admin._id,
        updatedAt: Date.now(),
      });
    }
  },
});
