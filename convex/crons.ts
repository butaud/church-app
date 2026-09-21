import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.hourly(
  "saturday volunteer reminders",
  { minuteUTC: 0 },
  internal.email.sendSaturdayReminders,
);

crons.hourly(
  "feast event reminders",
  { minuteUTC: 0 },
  internal.feastEmail.sendFeastReminders,
);

export default crons;
