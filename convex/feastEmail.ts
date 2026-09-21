import {
  internalAction,
  internalMutation,
  internalQuery,
  action,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { sendEmail } from "./model/resend";
import { addDaysToDateStr, getLocalDateStr, getLocalHourAndWeekday } from "./model/time";
import { requireAdmin } from "./model/auth";

export const getReminderRecipientsForDate = internalQuery({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const events = await ctx.db
      .query("feastEvents")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();
    const reminderEvents = events.filter((e) => e.reminderEnabled);

    const results: { email: string; name: string; eventTitle: string }[] = [];
    for (const event of reminderEvents) {
      const slots = await ctx.db
        .query("feastSlots")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();
      for (const slot of slots) {
        const signups = await ctx.db
          .query("feastSignups")
          .withIndex("by_slot", (q: any) => q.eq("slotId", slot._id))
          .collect();
        for (const s of signups) {
          if (s.userId) {
            const user = await ctx.db.get(s.userId);
            if (user) {
              results.push({ email: user.email, name: user.name, eventTitle: event.title });
            }
          } else if (s.inviteId) {
            const invite = await ctx.db.get(s.inviteId);
            if (invite) {
              results.push({
                email: invite.email,
                name: invite.displayName ?? invite.email,
                eventTitle: event.title,
              });
            }
          }
        }
      }
    }
    return results;
  },
});

// Runs hourly; only actually sends once it's 8am local time, so the
// reminder lands at 8am the day before the event regardless of DST.
export const sendFeastReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const { hour } = getLocalHourAndWeekday(now);
    if (hour !== 8) return;

    const date = addDaysToDateStr(getLocalDateStr(now), 1);
    const recipients = await ctx.runQuery(
      internal.feastEmail.getReminderRecipientsForDate,
      { date },
    );

    for (const recipient of recipients) {
      await sendEmail({
        to: recipient.email,
        subject: `Reminder: ${recipient.eventTitle} tomorrow`,
        text: `Hi ${recipient.name},\n\nThis is a reminder that you signed up to help with ${recipient.eventTitle} tomorrow at Emmanuel Church.`,
        html: `<p>Hi ${recipient.name},</p><p>This is a reminder that you signed up to help with <strong>${recipient.eventTitle}</strong> tomorrow at Emmanuel Church.</p>`,
        idempotencyKey: `feast-reminder/${recipient.eventTitle}/${date}/${recipient.email}`,
      });
    }
  },
});

export const listAllActiveEmails = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({ email: u.email, name: u.name }));
  },
});

export const assertCallerIsAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return null;
  },
});

export const markNotified = internalMutation({
  args: { eventId: v.id("feastEvents") },
  handler: async (ctx, { eventId }) => {
    await ctx.db.patch(eventId, { lastNotifiedAt: Date.now() });
  },
});

export const notifyMembersOfEvent = action({
  args: { eventId: v.id("feastEvents") },
  handler: async (ctx, { eventId }) => {
    await ctx.runQuery(internal.feastEmail.assertCallerIsAdmin, {});
    const event = await ctx.runQuery(internal.feastEmail.getEventForNotify, { eventId });
    if (!event) throw new Error("Event not found");

    const recipients = await ctx.runQuery(internal.feastEmail.listAllActiveEmails, {});
    const appUrl = process.env.APP_URL ?? "";
    const eventUrl = `${appUrl}/feasts/${eventId}`;

    for (const recipient of recipients) {
      await sendEmail({
        to: recipient.email,
        subject: event.title,
        text: `${event.title} is happening ${event.date} at ${event.time}. Sign up at ${eventUrl}.`,
        html: `<p><strong>${event.title}</strong> is happening ${event.date} at ${event.time}.</p><p><a href="${eventUrl}">Sign up</a></p>`,
        idempotencyKey: `feast-notify/${eventId}/${Date.now()}/${recipient.email}`,
      });
    }

    await ctx.runMutation(internal.feastEmail.markNotified, { eventId });
  },
});

export const getEventForNotify = internalQuery({
  args: { eventId: v.id("feastEvents") },
  handler: async (ctx, { eventId }) => {
    return await ctx.db.get(eventId);
  },
});
