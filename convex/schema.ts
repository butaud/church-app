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
    invitedBy: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  prayerList: defineTable({
    items: v.array(v.string()),
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
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_date_jobType", ["date", "jobTypeId"])
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),
});
