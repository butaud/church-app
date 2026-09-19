import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const getSignupsForDate = internalQuery({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const signups = await ctx.db
      .query("volunteerSignups")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();
    const jobTypes = await ctx.db.query("jobTypes").collect();
    const jobTypeMap = new Map(jobTypes.map((j) => [j._id, j.name]));
    const users = await Promise.all(
      [...new Set(signups.map((s) => s.userId))].map((id) => ctx.db.get(id)),
    );
    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));

    const byUser = new Map<
      string,
      { email: string; name: string; jobs: string[] }
    >();
    for (const s of signups) {
      const user = userMap.get(s.userId);
      if (!user) continue;
      const entry = byUser.get(user._id) ?? {
        email: user.email,
        name: user.name,
        jobs: [] as string[],
      };
      entry.jobs.push(jobTypeMap.get(s.jobTypeId) ?? "a volunteer slot");
      byUser.set(user._id, entry);
    }
    return [...byUser.values()];
  },
});

export const sendSaturdayReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const date = tomorrow.toISOString().slice(0, 10);

    const recipients = await ctx.runQuery(internal.email.getSignupsForDate, {
      date,
    });

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_ADDRESS;
    if (!apiKey || !from) {
      console.error("Resend not configured; skipping reminder emails");
      return;
    }

    for (const recipient of recipients) {
      const jobList = recipient.jobs.join(", ");
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `volunteer-reminder/${date}/${recipient.email}`,
        },
        body: JSON.stringify({
          from,
          to: recipient.email,
          subject: "Volunteering reminder for tomorrow",
          text: `Hi ${recipient.name},\n\nYou're signed up for ${jobList} tomorrow at Emmanuel Church.`,
          html: `<p>Hi ${recipient.name},</p><p>You're signed up for <strong>${jobList}</strong> tomorrow at Emmanuel Church.</p>`,
        }),
      });
      if (!res.ok) {
        console.error(
          "Failed to send reminder to",
          recipient.email,
          await res.text(),
        );
      }
    }
  },
});
