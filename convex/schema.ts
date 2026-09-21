import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  accountRequests: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    status: v.union(v.literal("pending"), v.literal("denied")),
    createdAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  invites: defineTable({
    email: v.string(),
    displayName: v.optional(v.string()),
    invitedBy: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  prayerItems: defineTable({
    text: v.string(),
    sortOrder: v.number(),
    updatedBy: v.string(),
    updatedAt: v.number(),
  }),

  jobTypes: defineTable({
    name: v.string(),
    capacity: v.number(),
    sortOrder: v.number(),
  }),

  volunteerSignups: defineTable({
    date: v.string(),
    jobTypeId: v.id("jobTypes"),
    userId: v.optional(v.id("users")),
    inviteId: v.optional(v.id("invites")),
    createdAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_date_jobType", ["date", "jobTypeId"])
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"])
    .index("by_invite", ["inviteId"]),

  feastEvents: defineTable({
    title: v.string(),
    date: v.string(),
    time: v.string(),
    description: v.string(),
    reminderEnabled: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    lastNotifiedAt: v.optional(v.number()),
  }).index("by_date", ["date"]),

  feastCategories: defineTable({
    eventId: v.id("feastEvents"),
    name: v.string(),
    sortOrder: v.number(),
  }).index("by_event", ["eventId"]),

  feastSlots: defineTable({
    eventId: v.id("feastEvents"),
    categoryId: v.optional(v.id("feastCategories")),
    name: v.string(),
    numberRequested: v.optional(v.number()),
    allowExtraSignups: v.boolean(),
    sortOrder: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_category", ["categoryId"]),

  feastSignups: defineTable({
    slotId: v.id("feastSlots"),
    userId: v.optional(v.id("users")),
    inviteId: v.optional(v.id("invites")),
    quantity: v.number(),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_slot", ["slotId"])
    .index("by_user", ["userId"])
    .index("by_invite", ["inviteId"]),
});
