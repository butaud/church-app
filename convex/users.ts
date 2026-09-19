import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./model/auth";

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

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
      .unique();

    if (invite) {
      await ctx.db.insert("users", {
        clerkId: identity.subject,
        email,
        name,
        role: "member",
      });
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

export const removeUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);
    const signups = await ctx.db
      .query("volunteerSignups")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const signup of signups) {
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
    if (!request) throw new Error("Request not found");
    await ctx.db.insert("users", {
      clerkId: request.clerkId,
      email: request.email,
      name: request.name,
      role: "member",
    });
    await ctx.db.delete(request._id);
  },
});

export const denyRequest = mutation({
  args: { requestId: v.id("accountRequests") },
  handler: async (ctx, { requestId }) => {
    await requireAdmin(ctx);
    const request = await ctx.db.get(requestId);
    if (!request) throw new Error("Request not found");
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
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const admin = await requireAdmin(ctx);
    const normalized = email.trim().toLowerCase();
    if (!normalized) throw new Error("Email is required");

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (existingUser) throw new Error("That email already has an account");

    const existingInvite = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (existingInvite) throw new Error("That email is already invited");

    await ctx.db.insert("invites", {
      email: normalized,
      invitedBy: admin._id,
      createdAt: Date.now(),
    });
  },
});

export const revokeInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(inviteId);
  },
});
