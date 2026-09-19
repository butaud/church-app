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
    const userIds = [...new Set(signups.map((s) => s.userId).filter(Boolean))];
    const inviteIds = [
      ...new Set(signups.map((s) => s.inviteId).filter(Boolean)),
    ];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id!)));
    const invites = await Promise.all(inviteIds.map((id) => ctx.db.get(id!)));
    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));
    const inviteMap = new Map(invites.filter(Boolean).map((i) => [i!._id, i!]));

    const byRecipient = new Map<
      string,
      { email: string; name: string; jobs: string[] }
    >();
    for (const s of signups) {
      const user = s.userId ? userMap.get(s.userId) : undefined;
      const invite = s.inviteId ? inviteMap.get(s.inviteId) : undefined;
      if (!user && !invite) continue;
      const key = user ? `user:${user._id}` : `invite:${invite!._id}`;
      const entry = byRecipient.get(key) ?? {
        email: user ? user.email : invite!.email,
        name: user ? user.name : (invite!.displayName ?? invite!.email),
        jobs: [] as string[],
      };
      entry.jobs.push(jobTypeMap.get(s.jobTypeId) ?? "a volunteer slot");
      byRecipient.set(key, entry);
    }
    return [...byRecipient.values()];
  },
});

async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_ADDRESS;
  if (!apiKey || !from) {
    console.error("Resend not configured; skipping email to", args.to);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": args.idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html,
    }),
  });
  if (!res.ok) {
    console.error("Failed to send email to", args.to, await res.text());
  }
}

export const listAdminEmails = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.role === "admin")
      .map((u) => ({ email: u.email, name: u.name }));
  },
});

export const notifyAdminsOfNewRequest = internalAction({
  args: { name: v.string(), email: v.string() },
  handler: async (ctx, { name, email }) => {
    const admins = await ctx.runQuery(internal.email.listAdminEmails, {});
    const appUrl = process.env.APP_URL ?? "";
    const manageUrl = `${appUrl}/manage`;

    for (const admin of admins) {
      await sendEmail({
        to: admin.email,
        subject: "New account request",
        text: `${name} (${email}) has requested access to the church app. Review it at ${manageUrl}.`,
        html: `<p>${name} (${email}) has requested access to the church app.</p><p><a href="${manageUrl}">Review the request</a></p>`,
        idempotencyKey: `new-request/${email}/${admin.email}`,
      });
    }
  },
});

const CHURCH_TIME_ZONE = "America/Los_Angeles";

function getLocalHourAndWeekday(date: Date): {
  hour: number;
  weekday: string;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHURCH_TIME_ZONE,
    weekday: "long",
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")!.value) % 24;
  const weekday = parts.find((p) => p.type === "weekday")!.value;
  return { hour, weekday };
}

function getLocalDateStr(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHURCH_TIME_ZONE,
  }).format(date);
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Runs hourly; Convex cron times are fixed UTC, so this checks the church's
// local time on each run and only sends once it's actually 8am Saturday
// there, which keeps the reminder at 8am local across DST changes.
export const sendSaturdayReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const { hour, weekday } = getLocalHourAndWeekday(now);
    if (weekday !== "Saturday" || hour !== 8) return;

    const date = addDaysToDateStr(getLocalDateStr(now), 1);

    const recipients = await ctx.runQuery(internal.email.getSignupsForDate, {
      date,
    });

    for (const recipient of recipients) {
      const jobList = recipient.jobs.join(", ");
      await sendEmail({
        to: recipient.email,
        subject: "Volunteering reminder for tomorrow",
        text: `Hi ${recipient.name},\n\nYou're signed up for ${jobList} tomorrow at Emmanuel Church.`,
        html: `<p>Hi ${recipient.name},</p><p>You're signed up for <strong>${jobList}</strong> tomorrow at Emmanuel Church.</p>`,
        idempotencyKey: `volunteer-reminder/${date}/${recipient.email}`,
      });
    }
  },
});
