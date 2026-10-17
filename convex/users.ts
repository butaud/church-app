import { internalMutation, mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./model/auth";
import { emailsMatch } from "./model/email";
import { internal } from "./_generated/api";

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { status: "signed-out" as const };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (user) {
      return { status: "active" as const, user };
    }

    const request = await ctx.db
      .query("accountRequests")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (request?.status === "pending") {
      return { status: "pending" as const, request };
    }
    if (request?.status === "denied") {
      return { status: "denied" as const, request };
    }

    return { status: "unregistered" as const };
  },
});

export const syncClerkProfile = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { clerkId, email, name }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (user) {
      const patch: Record<string, string> = {};
      if (email) patch.email = email;
      if (name) patch.name = name;
      if (Object.keys(patch).length > 0) await ctx.db.patch(user._id, patch);
    }

    const request = await ctx.db
      .query("accountRequests")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (request) {
      const patch: Record<string, string> = {};
      if (email) patch.email = email;
      if (name) patch.name = name;
      if (Object.keys(patch).length > 0) await ctx.db.patch(request._id, patch);
    }
  },
});

export const ensureAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in");
    const email = identity.email;
    if (!email) throw new Error("Signed-in account has no verified email");
    const name = identity.name ?? email;

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (existingUser) return;

    const existingRequest = await ctx.db
      .query("accountRequests")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (existingRequest) return;

    const invite = (await ctx.db.query("invites").collect()).find((i) =>
      emailsMatch(i.email, email),
    );

    if (invite) {
      const newUserId = await ctx.db.insert("users", {
        clerkId: identity.subject,
        email,
        name,
        role: "member",
      });

      const inviteSignups = await ctx.db
        .query("volunteerSignups")
        .withIndex("by_invite", (q) => q.eq("inviteId", invite._id))
        .collect();
      for (const signup of inviteSignups) {
        await ctx.db.patch(signup._id, {
          userId: newUserId,
          inviteId: undefined,
        });
      }

      const inviteFeastSignups = await ctx.db
        .query("feastSignups")
        .withIndex("by_invite", (q) => q.eq("inviteId", invite._id))
        .collect();
      for (const signup of inviteFeastSignups) {
        await ctx.db.patch(signup._id, {
          userId: newUserId,
          inviteId: undefined,
        });
      }

      await ctx.db.delete(invite._id);
      return;
    }

    await ctx.db.insert("accountRequests", {
      clerkId: identity.subject,
      email,
      name,
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.email.notifyAdminsOfNewRequest,
      { name, email },
    );
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    return users.sort((a, b) => a.name.localeCompare(b.name));
  },
});

async function countAdmins(ctx: { db: any }): Promise<number> {
  const users = await ctx.db.query("users").collect();
  return users.filter((u: any) => u.role === "admin").length;
}

export const setUserRole = mutation({
  args: { userId: v.id("users"), role: v.union(v.literal("admin"), v.literal("member")) },
  handler: async (ctx, { userId, role }) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(userId);
    if (!target) throw new ConvexError("User not found");
    if (target.role === "admin" && role === "member" && (await countAdmins(ctx)) <= 1) {
      throw new ConvexError("There must be at least one admin");
    }
    await ctx.db.patch(userId, { role });
  },
});

export const removeUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(userId);
    if (target?.role === "admin" && (await countAdmins(ctx)) <= 1) {
      throw new ConvexError("There must be at least one admin");
    }
    const signups = await ctx.db
      .query("volunteerSignups")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const signup of signups) {
      await ctx.db.delete(signup._id);
    }
    const feastSignups = await ctx.db
      .query("feastSignups")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const signup of feastSignups) {
      await ctx.db.delete(signup._id);
    }
    await ctx.db.delete(userId);
  },
});

export const listPendingRequests = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const requests = await ctx.db
      .query("accountRequests")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
    return requests.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const approveRequest = mutation({
  args: { requestId: v.id("accountRequests") },
  handler: async (ctx, { requestId }) => {
    await requireAdmin(ctx);
    const request = await ctx.db.get(requestId);
    if (!request) throw new ConvexError("Request not found");
    await ctx.db.insert("users", {
      clerkId: request.clerkId,
      email: request.email,
      name: request.name,
      role: "member",
    });
    await ctx.db.delete(request._id);

    await ctx.scheduler.runAfter(0, internal.email.notifyUserOfApproval, {
      name: request.name,
      email: request.email,
    });
  },
});

export const denyRequest = mutation({
  args: { requestId: v.id("accountRequests") },
  handler: async (ctx, { requestId }) => {
    await requireAdmin(ctx);
    const request = await ctx.db.get(requestId);
    if (!request) throw new ConvexError("Request not found");
    await ctx.db.patch(requestId, { status: "denied" });
  },
});

export const listInvites = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const invites = await ctx.db.query("invites").collect();
    return invites.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const createInvite = mutation({
  args: { email: v.string(), displayName: v.optional(v.string()) },
  handler: async (ctx, { email, displayName }) => {
    const admin = await requireAdmin(ctx);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) throw new ConvexError("Email is required");

    // These tables are small, so scan them rather than index on a normalized
    // form; see normalizeEmail for which variants count as the same address.
    const existingUser = (await ctx.db.query("users").collect()).find((u) =>
      emailsMatch(u.email, trimmed),
    );
    if (existingUser) throw new ConvexError("That email already has an account");

    const existingInvite = (await ctx.db.query("invites").collect()).find((i) =>
      emailsMatch(i.email, trimmed),
    );
    if (existingInvite) throw new ConvexError("That email is already invited");

    await ctx.db.insert("invites", {
      email: trimmed,
      displayName: displayName?.trim() || undefined,
      invitedBy: admin._id,
      createdAt: Date.now(),
    });
  },
});

export const updateInviteDisplayName = mutation({
  args: { inviteId: v.id("invites"), displayName: v.string() },
  handler: async (ctx, { inviteId, displayName }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(inviteId, { displayName: displayName.trim() || undefined });
  },
});

export const revokeInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }) => {
    await requireAdmin(ctx);
    const signups = await ctx.db
      .query("volunteerSignups")
      .withIndex("by_invite", (q) => q.eq("inviteId", inviteId))
      .collect();
    for (const signup of signups) {
      await ctx.db.delete(signup._id);
    }
    const feastSignups = await ctx.db
      .query("feastSignups")
      .withIndex("by_invite", (q) => q.eq("inviteId", inviteId))
      .collect();
    for (const signup of feastSignups) {
      await ctx.db.delete(signup._id);
    }
    await ctx.db.delete(inviteId);
  },
});
