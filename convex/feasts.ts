import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { requireAdmin, requireUser } from "./model/auth";
import { todayStr } from "./model/time";
import type { Id } from "./_generated/dataModel";

async function resolveSignupName(
  ctx: { db: any },
  signup: { userId?: Id<"users">; inviteId?: Id<"invites"> },
): Promise<string> {
  if (signup.userId) {
    const user = await ctx.db.get(signup.userId);
    return user?.name ?? "Unknown";
  }
  if (signup.inviteId) {
    const invite = await ctx.db.get(signup.inviteId);
    return invite ? (invite.displayName ?? invite.email) : "Unknown";
  }
  return "Unknown";
}

async function assertSlotCapacity(
  slot: { name: string; numberRequested?: number; allowExtraSignups: boolean },
  existing: { quantity: number }[],
) {
  if (slot.numberRequested === undefined) return;
  const total = existing.reduce((sum, s) => sum + s.quantity, 0);
  if (total >= slot.numberRequested && !slot.allowExtraSignups) {
    throw new ConvexError(`${slot.name} doesn't need any more signups`);
  }
}

// ---------- Events ----------

export const listUpcomingEvents = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const today = todayStr();
    const events = await ctx.db
      .query("feastEvents")
      .withIndex("by_date", (q) => q.gte("date", today))
      .collect();
    events.sort((a, b) => a.date.localeCompare(b.date));

    const mySignups = await ctx.db
      .query("feastSignups")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const eventIdsWithSignup = new Set<string>();
    if (mySignups.length > 0) {
      const slots = await Promise.all(
        mySignups.map((s: any) => ctx.db.get(s.slotId as Id<"feastSlots">)),
      );
      for (const slot of slots) if (slot) eventIdsWithSignup.add(slot.eventId);
    }

    return events.map((e) => ({
      _id: e._id,
      title: e.title,
      date: e.date,
      time: e.time,
      hasSignup: eventIdsWithSignup.has(e._id),
    }));
  },
});

export const listMyUpcomingSignups = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const today = todayStr();
    const signups = await ctx.db
      .query("feastSignups")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const rows = await Promise.all(
      signups.map(async (s) => {
        const slot = await ctx.db.get(s.slotId);
        if (!slot) return null;
        const event = await ctx.db.get(slot.eventId);
        if (!event || event.date < today) return null;
        return {
          _id: s._id,
          eventId: event._id,
          eventTitle: event.title,
          date: event.date,
          time: event.time,
          slotName: slot.name,
          quantity: s.quantity,
        };
      }),
    );
    return rows
      .filter((r) => r !== null)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  },
});

export const listPastEvents = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireUser(ctx);
    const today = todayStr();
    return await ctx.db
      .query("feastEvents")
      .withIndex("by_date", (q) => q.lt("date", today))
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const getEvent = query({
  args: { eventId: v.id("feastEvents") },
  handler: async (ctx, { eventId }) => {
    await requireUser(ctx);
    const event = await ctx.db.get(eventId);
    if (!event) return null;

    const categories = await ctx.db
      .query("feastCategories")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();
    categories.sort((a, b) => a.sortOrder - b.sortOrder);

    const slots = await ctx.db
      .query("feastSlots")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();
    slots.sort((a, b) => a.sortOrder - b.sortOrder);

    const slotsWithSignups = await Promise.all(
      slots.map(async (slot: any) => {
        const signups = await ctx.db
          .query("feastSignups")
          .withIndex("by_slot", (q: any) => q.eq("slotId", slot._id))
          .collect();
        const resolved = await Promise.all(
          signups.map(async (s: any) => ({
            _id: s._id,
            userId: s.userId,
            inviteId: s.inviteId,
            quantity: s.quantity,
            note: s.note,
            name: await resolveSignupName(ctx, s),
            isPendingInvite: !!s.inviteId,
          })),
        );
        return { ...slot, signups: resolved };
      }),
    );

    return { event, categories, slots: slotsWithSignups };
  },
});

export const createEvent = mutation({
  args: {
    title: v.string(),
    date: v.string(),
    time: v.string(),
    description: v.string(),
    reminderEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const title = args.title.trim();
    if (!title) throw new ConvexError("Title is required");
    if (!args.date) throw new ConvexError("Date is required");
    return await ctx.db.insert("feastEvents", {
      title,
      date: args.date,
      time: args.time.trim(),
      description: args.description.trim(),
      reminderEnabled: args.reminderEnabled,
      createdBy: admin._id,
      createdAt: Date.now(),
    });
  },
});

export const updateEvent = mutation({
  args: {
    eventId: v.id("feastEvents"),
    title: v.string(),
    date: v.string(),
    time: v.string(),
    description: v.string(),
    reminderEnabled: v.boolean(),
  },
  handler: async (ctx, { eventId, title, date, time, description, reminderEnabled }) => {
    await requireAdmin(ctx);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) throw new ConvexError("Title is required");
    if (!date) throw new ConvexError("Date is required");
    await ctx.db.patch(eventId, {
      title: trimmedTitle,
      date,
      time: time.trim(),
      description: description.trim(),
      reminderEnabled,
    });
  },
});

export const eventDeletionImpact = query({
  args: { eventId: v.id("feastEvents") },
  handler: async (ctx, { eventId }) => {
    await requireAdmin(ctx);
    const slots = await ctx.db
      .query("feastSlots")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();
    let signupCount = 0;
    for (const slot of slots) {
      const signups = await ctx.db
        .query("feastSignups")
        .withIndex("by_slot", (q: any) => q.eq("slotId", slot._id))
        .collect();
      signupCount += signups.length;
    }
    return { signupCount };
  },
});

export const deleteEvent = mutation({
  args: { eventId: v.id("feastEvents") },
  handler: async (ctx, { eventId }) => {
    await requireAdmin(ctx);
    const slots = await ctx.db
      .query("feastSlots")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();
    for (const slot of slots) {
      const signups = await ctx.db
        .query("feastSignups")
        .withIndex("by_slot", (q: any) => q.eq("slotId", slot._id))
        .collect();
      for (const s of signups) await ctx.db.delete(s._id);
      await ctx.db.delete(slot._id);
    }
    const categories = await ctx.db
      .query("feastCategories")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();
    for (const c of categories) await ctx.db.delete(c._id);
    await ctx.db.delete(eventId);
  },
});

// ---------- Categories ----------

export const createCategory = mutation({
  args: { eventId: v.id("feastEvents"), name: v.string() },
  handler: async (ctx, { eventId, name }) => {
    await requireAdmin(ctx);
    const trimmed = name.trim();
    if (!trimmed) throw new ConvexError("Name is required");
    const categories = await ctx.db
      .query("feastCategories")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.sortOrder), -1);
    await ctx.db.insert("feastCategories", {
      eventId,
      name: trimmed,
      sortOrder: maxOrder + 1,
    });
  },
});

export const renameCategory = mutation({
  args: { categoryId: v.id("feastCategories"), name: v.string() },
  handler: async (ctx, { categoryId, name }) => {
    await requireAdmin(ctx);
    const trimmed = name.trim();
    if (!trimmed) throw new ConvexError("Name is required");
    await ctx.db.patch(categoryId, { name: trimmed });
  },
});

export const deleteCategory = mutation({
  args: { categoryId: v.id("feastCategories") },
  handler: async (ctx, { categoryId }) => {
    await requireAdmin(ctx);
    const slots = await ctx.db
      .query("feastSlots")
      .withIndex("by_category", (q) => q.eq("categoryId", categoryId))
      .collect();
    for (const slot of slots) {
      await ctx.db.patch(slot._id, { categoryId: undefined });
    }
    await ctx.db.delete(categoryId);
  },
});

// ---------- Slots ----------

export const createSlot = mutation({
  args: {
    eventId: v.id("feastEvents"),
    categoryId: v.optional(v.id("feastCategories")),
    name: v.string(),
    numberRequested: v.optional(v.number()),
    allowExtraSignups: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const name = args.name.trim();
    if (!name) throw new ConvexError("Name is required");
    if (args.numberRequested !== undefined && args.numberRequested < 1) {
      throw new ConvexError("Number requested must be at least 1");
    }
    const slots = await ctx.db
      .query("feastSlots")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    const maxOrder = slots.reduce((m, s) => Math.max(m, s.sortOrder), -1);
    await ctx.db.insert("feastSlots", {
      eventId: args.eventId,
      categoryId: args.categoryId,
      name,
      numberRequested: args.numberRequested,
      allowExtraSignups: args.allowExtraSignups,
      sortOrder: maxOrder + 1,
    });
  },
});

export const updateSlot = mutation({
  args: {
    slotId: v.id("feastSlots"),
    name: v.string(),
    numberRequested: v.optional(v.number()),
    allowExtraSignups: v.boolean(),
  },
  handler: async (ctx, { slotId, name, numberRequested, allowExtraSignups }) => {
    await requireAdmin(ctx);
    const trimmed = name.trim();
    if (!trimmed) throw new ConvexError("Name is required");
    if (numberRequested !== undefined && numberRequested < 1) {
      throw new ConvexError("Number requested must be at least 1");
    }
    await ctx.db.patch(slotId, { name: trimmed, numberRequested, allowExtraSignups });
  },
});

export const slotDeletionImpact = query({
  args: { slotId: v.id("feastSlots") },
  handler: async (ctx, { slotId }) => {
    await requireAdmin(ctx);
    const signups = await ctx.db
      .query("feastSignups")
      .withIndex("by_slot", (q) => q.eq("slotId", slotId))
      .collect();
    return await Promise.all(
      signups.map(async (s: any) => ({
        name: await resolveSignupName(ctx, s),
        quantity: s.quantity,
      })),
    );
  },
});

export const deleteSlot = mutation({
  args: { slotId: v.id("feastSlots") },
  handler: async (ctx, { slotId }) => {
    await requireAdmin(ctx);
    const signups = await ctx.db
      .query("feastSignups")
      .withIndex("by_slot", (q) => q.eq("slotId", slotId))
      .collect();
    for (const s of signups) await ctx.db.delete(s._id);
    await ctx.db.delete(slotId);
  },
});

export const reorderSlots = mutation({
  args: {
    order: v.array(
      v.object({
        slotId: v.id("feastSlots"),
        categoryId: v.optional(v.id("feastCategories")),
        sortOrder: v.number(),
      }),
    ),
  },
  handler: async (ctx, { order }) => {
    await requireAdmin(ctx);
    for (const item of order) {
      await ctx.db.patch(item.slotId, {
        categoryId: item.categoryId,
        sortOrder: item.sortOrder,
      });
    }
  },
});

// ---------- Signups ----------

export const signUpForSlot = mutation({
  args: { slotId: v.id("feastSlots"), quantity: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, { slotId, quantity, note }) => {
    const user = await requireUser(ctx);
    if (quantity < 1) throw new ConvexError("Quantity must be at least 1");
    const slot = await ctx.db.get(slotId);
    if (!slot) throw new ConvexError("Slot not found");
    const event = await ctx.db.get(slot.eventId);
    if (event && event.date < todayStr()) {
      throw new ConvexError("That event has already passed");
    }

    const existing = await ctx.db
      .query("feastSignups")
      .withIndex("by_slot", (q) => q.eq("slotId", slotId))
      .collect();
    if (existing.some((s: any) => s.userId === user._id)) {
      throw new ConvexError("You already signed up for this slot");
    }
    await assertSlotCapacity(slot, existing);

    await ctx.db.insert("feastSignups", {
      slotId,
      userId: user._id,
      quantity,
      note: note?.trim() || undefined,
      createdAt: Date.now(),
    });
  },
});

export const adminAssignUser = mutation({
  args: {
    slotId: v.id("feastSlots"),
    userId: v.id("users"),
    quantity: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { slotId, userId, quantity, note }) => {
    await requireAdmin(ctx);
    if (quantity < 1) throw new ConvexError("Quantity must be at least 1");
    const slot = await ctx.db.get(slotId);
    if (!slot) throw new ConvexError("Slot not found");
    const existing = await ctx.db
      .query("feastSignups")
      .withIndex("by_slot", (q) => q.eq("slotId", slotId))
      .collect();
    if (existing.some((s: any) => s.userId === userId)) {
      throw new ConvexError("That person is already signed up for this slot");
    }
    await assertSlotCapacity(slot, existing);

    await ctx.db.insert("feastSignups", {
      slotId,
      userId,
      quantity,
      note: note?.trim() || undefined,
      createdAt: Date.now(),
    });
  },
});

export const adminAssignInvite = mutation({
  args: {
    slotId: v.id("feastSlots"),
    inviteId: v.id("invites"),
    quantity: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { slotId, inviteId, quantity, note }) => {
    await requireAdmin(ctx);
    if (quantity < 1) throw new ConvexError("Quantity must be at least 1");
    const slot = await ctx.db.get(slotId);
    if (!slot) throw new ConvexError("Slot not found");
    const existing = await ctx.db
      .query("feastSignups")
      .withIndex("by_slot", (q) => q.eq("slotId", slotId))
      .collect();
    if (existing.some((s: any) => s.inviteId === inviteId)) {
      throw new ConvexError("That person is already signed up for this slot");
    }
    await assertSlotCapacity(slot, existing);

    await ctx.db.insert("feastSignups", {
      slotId,
      inviteId,
      quantity,
      note: note?.trim() || undefined,
      createdAt: Date.now(),
    });
  },
});

export const updateSignup = mutation({
  args: { signupId: v.id("feastSignups"), quantity: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, { signupId, quantity, note }) => {
    const user = await requireUser(ctx);
    if (quantity < 1) throw new ConvexError("Quantity must be at least 1");
    const signup = await ctx.db.get(signupId);
    if (!signup) return;
    const isOwner = signup.userId !== undefined && signup.userId === user._id;
    if (!isOwner && user.role !== "admin") {
      throw new ConvexError("You can only edit your own signups");
    }
    await ctx.db.patch(signupId, { quantity, note: note?.trim() || undefined });
  },
});

export const cancelFeastSignup = mutation({
  args: { signupId: v.id("feastSignups") },
  handler: async (ctx, { signupId }) => {
    const user = await requireUser(ctx);
    const signup = await ctx.db.get(signupId);
    if (!signup) return;
    const isOwner = signup.userId !== undefined && signup.userId === user._id;
    if (!isOwner && user.role !== "admin") {
      throw new ConvexError("You can only cancel your own signups");
    }
    await ctx.db.delete(signupId);
  },
});
