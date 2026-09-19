import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin, requireUser } from "./model/auth";
import type { Id } from "./_generated/dataModel";

export const listJobTypes = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const jobTypes = await ctx.db.query("jobTypes").collect();
    return jobTypes.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const createJobType = mutation({
  args: { name: v.string(), capacity: v.number() },
  handler: async (ctx, { name, capacity }) => {
    await requireAdmin(ctx);
    const trimmed = name.trim();
    if (!trimmed) throw new ConvexError("Name is required");
    if (capacity < 1) throw new ConvexError("Capacity must be at least 1");
    const jobTypes = await ctx.db.query("jobTypes").collect();
    const maxOrder = jobTypes.reduce((max, j) => Math.max(max, j.sortOrder), -1);
    await ctx.db.insert("jobTypes", {
      name: trimmed,
      capacity,
      sortOrder: maxOrder + 1,
    });
  },
});

export const updateJobType = mutation({
  args: { jobTypeId: v.id("jobTypes"), name: v.string(), capacity: v.number() },
  handler: async (ctx, { jobTypeId, name, capacity }) => {
    await requireAdmin(ctx);
    const trimmed = name.trim();
    if (!trimmed) throw new ConvexError("Name is required");
    if (capacity < 1) throw new ConvexError("Capacity must be at least 1");
    await ctx.db.patch(jobTypeId, { name: trimmed, capacity });
  },
});

export const jobTypeDeletionImpact = query({
  args: { jobTypeId: v.id("jobTypes") },
  handler: async (ctx, { jobTypeId }) => {
    await requireAdmin(ctx);
    const signups = await ctx.db
      .query("volunteerSignups")
      .filter((q) => q.eq(q.field("jobTypeId"), jobTypeId))
      .collect();
    const upcoming = signups.filter((s) => s.date >= todayStr());
    const withNames = await Promise.all(
      upcoming.map(async (s) => ({
        date: s.date,
        userName: await resolveSignupName(ctx, s),
      })),
    );
    withNames.sort((a, b) => a.date.localeCompare(b.date));
    return withNames;
  },
});

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

export const deleteJobType = mutation({
  args: { jobTypeId: v.id("jobTypes") },
  handler: async (ctx, { jobTypeId }) => {
    await requireAdmin(ctx);
    const signups = await ctx.db
      .query("volunteerSignups")
      .filter((q) => q.eq(q.field("jobTypeId"), jobTypeId))
      .collect();
    for (const signup of signups) {
      await ctx.db.delete(signup._id);
    }
    await ctx.db.delete(jobTypeId);
  },
});

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const listSignupsForMonth = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { startDate, endDate }) => {
    await requireUser(ctx);
    const signups = await ctx.db
      .query("volunteerSignups")
      .filter((q) =>
        q.and(q.gte(q.field("date"), startDate), q.lte(q.field("date"), endDate)),
      )
      .collect();
    const userIds = [...new Set(signups.map((s) => s.userId).filter(Boolean))];
    const inviteIds = [
      ...new Set(signups.map((s) => s.inviteId).filter(Boolean)),
    ];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id!)));
    const invites = await Promise.all(inviteIds.map((id) => ctx.db.get(id!)));
    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));
    const inviteMap = new Map(invites.filter(Boolean).map((i) => [i!._id, i!]));
    return signups.map((s) => {
      const invite = s.inviteId ? inviteMap.get(s.inviteId) : undefined;
      return {
        _id: s._id,
        date: s.date,
        jobTypeId: s.jobTypeId,
        userId: s.userId,
        inviteId: s.inviteId,
        userName: s.userId
          ? (userMap.get(s.userId)?.name ?? "Unknown")
          : (invite?.displayName ?? invite?.email ?? "Unknown"),
        isPendingInvite: !!s.inviteId,
      };
    });
  },
});

export const listMyUpcomingSignups = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const today = todayStr();
    const signups = await ctx.db
      .query("volunteerSignups")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id).gte("date", today))
      .collect();
    const jobTypes = await ctx.db.query("jobTypes").collect();
    const jobTypeMap = new Map(jobTypes.map((j) => [j._id, j]));
    return signups
      .map((s) => ({
        _id: s._id,
        date: s.date,
        jobTypeName: jobTypeMap.get(s.jobTypeId)?.name ?? "Unknown",
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

async function assertCapacityAvailable(
  ctx: { db: any },
  date: string,
  jobTypeId: Id<"jobTypes">,
) {
  const jobType = await ctx.db.get(jobTypeId);
  if (!jobType) throw new ConvexError("Job type not found");
  const existing = await ctx.db
    .query("volunteerSignups")
    .withIndex("by_date_jobType", (q: any) =>
      q.eq("date", date).eq("jobTypeId", jobTypeId),
    )
    .collect();
  if (existing.length >= jobType.capacity) {
    throw new ConvexError(`${jobType.name} is full for ${date}`);
  }
  return existing;
}

export const signUp = mutation({
  args: { date: v.string(), jobTypeId: v.id("jobTypes") },
  handler: async (ctx, { date, jobTypeId }) => {
    const user = await requireUser(ctx);
    if (date < todayStr()) throw new ConvexError("That date has already passed");
    const existing = await assertCapacityAvailable(ctx, date, jobTypeId);
    if (existing.some((s: any) => s.userId === user._id)) {
      throw new ConvexError("You are already signed up for this slot");
    }
    await ctx.db.insert("volunteerSignups", {
      date,
      jobTypeId,
      userId: user._id,
      createdAt: Date.now(),
    });
  },
});

export const adminSignUp = mutation({
  args: { date: v.string(), jobTypeId: v.id("jobTypes"), userId: v.id("users") },
  handler: async (ctx, { date, jobTypeId, userId }) => {
    await requireAdmin(ctx);
    const existing = await assertCapacityAvailable(ctx, date, jobTypeId);
    if (existing.some((s: any) => s.userId === userId)) {
      throw new ConvexError("That person is already signed up for this slot");
    }
    await ctx.db.insert("volunteerSignups", {
      date,
      jobTypeId,
      userId,
      createdAt: Date.now(),
    });
  },
});

export const adminAssignInvite = mutation({
  args: { date: v.string(), jobTypeId: v.id("jobTypes"), inviteId: v.id("invites") },
  handler: async (ctx, { date, jobTypeId, inviteId }) => {
    await requireAdmin(ctx);
    const existing = await assertCapacityAvailable(ctx, date, jobTypeId);
    if (existing.some((s: any) => s.inviteId === inviteId)) {
      throw new ConvexError("That person is already signed up for this slot");
    }
    await ctx.db.insert("volunteerSignups", {
      date,
      jobTypeId,
      inviteId,
      createdAt: Date.now(),
    });
  },
});

export const cancelSignup = mutation({
  args: { signupId: v.id("volunteerSignups") },
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
