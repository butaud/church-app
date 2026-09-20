"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Webhook } from "svix";

export const verifyAndSync = internalAction({
  args: {
    payload: v.string(),
    svixId: v.string(),
    svixTimestamp: v.string(),
    svixSignature: v.string(),
  },
  handler: async (ctx, { payload, svixId, svixTimestamp, svixSignature }) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      console.error("CLERK_WEBHOOK_SECRET is not configured");
      return { ok: false, status: 500 };
    }

    let event: any;
    try {
      const wh = new Webhook(secret);
      // svix's verify() only validates the signature and returns undefined;
      // it doesn't hand back the parsed payload, so parse it ourselves.
      wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
      event = JSON.parse(payload);
    } catch (err) {
      console.error("Invalid Clerk webhook signature", err);
      return { ok: false, status: 400 };
    }

    if (event.type === "user.updated" || event.type === "user.created") {
      const data = event.data;
      const clerkId: string = data.id;
      const email: string | undefined = data.email_addresses?.find(
        (e: any) => e.id === data.primary_email_address_id,
      )?.email_address;
      const name = [data.first_name, data.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

      await ctx.runMutation(internal.users.syncClerkProfile, {
        clerkId,
        email: email || undefined,
        name: name || undefined,
      });
    }

    return { ok: true, status: 200 };
  },
});
