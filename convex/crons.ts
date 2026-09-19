import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron(
  "saturday volunteer reminders",
  "0 16 * * 6",
  internal.email.sendSaturdayReminders,
);

export default crons;
